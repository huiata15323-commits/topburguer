// Resumo executivo do dia gerado por IA (Lovable AI Gateway).
// Recebe agregados já calculados no client para evitar passar dados sensíveis
// e devolve um texto curto em português, pronto para exibir no admin.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SummaryInput = z.object({
  doneCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  revenue: z.number().nonnegative(),
  avgTicket: z.number().nonnegative(),
  avgPrepMin: z.number().nonnegative(),
  avgRating: z.number().nonnegative(),
  ratingsCount: z.number().int().nonnegative(),
  peakHour: z.number().int().min(0).max(23).nullable(),
  peakHourCount: z.number().int().nonnegative(),
  topItems: z
    .array(z.object({ name: z.string().max(80), qty: z.number().int(), revenue: z.number() }))
    .max(5),
  hourlyCounts: z.array(z.number().int().nonnegative()).max(24),
});

// Rate limit simples em memória (best-effort no worker): 6 chamadas/minuto/IP.
const rl = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string) {
  const now = Date.now();
  const cur = rl.get(ip);
  if (!cur || cur.resetAt < now) {
    rl.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  cur.count++;
  return cur.count <= 6;
}

export const generateDaySummary = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SummaryInput.parse(input))
  .handler(async ({ data }) => {
    // Bloqueia abuso de chamadas vazias contra crédito de IA
    if (data.totalCount === 0 && data.doneCount === 0 && data.revenue === 0) {
      return { summary: "Sem pedidos hoje ainda — gere o resumo depois do primeiro pedido." };
    }
    try {
      const { getRequestIP } = await import("@tanstack/react-start/server");
      const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
      if (!rateLimit(ip)) {
        return { summary: "⏳ Muitos resumos solicitados. Aguarde 1 minuto." };
      }
    } catch {
      /* getRequestIP fora de contexto — ignora */
    }
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        summary:
          "⚠️ Chave da IA não configurada (LOVABLE_API_KEY). Ative o Lovable Cloud para gerar o resumo.",
      };
    }


    const prompt = `Você é o gerente experiente de uma hamburgueria chamada Top Burguer. Resuma o desempenho do dia em **português brasileiro** de forma direta e útil, em no máximo 6 linhas, usando markdown leve (negrito e bullets). Inclua:
- 1 frase de cabeçalho com o "humor" do dia (foi forte, fraco, regular?)
- O número que mais chama atenção (faturamento, ticket médio, pico)
- 1 destaque positivo
- 1 ponto de atenção (algo a melhorar amanhã)
- 1 sugestão operacional concreta (ex: produzir X antes das Y horas)

Dados de hoje:
- Pedidos: ${data.doneCount} concluídos de ${data.totalCount}
- Faturamento: R$ ${data.revenue.toFixed(2)}
- Ticket médio: R$ ${data.avgTicket.toFixed(2)}
- Tempo médio de preparo: ${data.avgPrepMin.toFixed(1)} min
- Avaliações: ${data.ratingsCount > 0 ? `${data.avgRating.toFixed(1)}★ (${data.ratingsCount} avaliações)` : "sem avaliações"}
- Horário de pico: ${data.peakHour !== null ? `${data.peakHour}h com ${data.peakHourCount} pedidos` : "sem pico claro"}
- Distribuição por hora (0h-23h): ${data.hourlyCounts.join(", ")}
- Top itens: ${data.topItems.map((i) => `${i.name} (${i.qty}x, R$ ${i.revenue.toFixed(2)})`).join("; ") || "nenhum"}

Não invente dados. Seja específico citando números reais. Não use jargão técnico.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("[ai-summary] gateway error", res.status, txt);
        if (res.status === 429) return { summary: "⏳ Limite de uso da IA atingido. Tente novamente em alguns instantes." };
        if (res.status === 402) return { summary: "💳 Créditos da IA esgotados. Adicione créditos no Lovable Cloud." };
        return { summary: `Erro ao gerar resumo (HTTP ${res.status}).` };
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const summary = json.choices?.[0]?.message?.content?.trim();
      return { summary: summary || "A IA não retornou resumo." };
    } catch (e) {
      console.error("[ai-summary] failed", e);
      return { summary: "Falha de rede ao gerar resumo. Tente novamente." };
    }
  });
