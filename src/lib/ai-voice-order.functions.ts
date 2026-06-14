// Pedido por voz com IA: recebe a fala transcrita do cliente + cardápio
// disponível e devolve os itens a adicionar ao carrinho. Usa Lovable AI Gateway.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  transcript: z.string().min(1).max(500),
  menu: z
    .array(z.object({ id: z.string().max(40), name: z.string().max(80) }))
    .min(1)
    .max(60),
});

const rl = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string) {
  const now = Date.now();
  const cur = rl.get(ip);
  if (!cur || cur.resetAt < now) {
    rl.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  cur.count++;
  return cur.count <= 12;
}

export const parseVoiceOrderAI = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    try {
      const { getRequestIP } = await import("@tanstack/react-start/server");
      const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
      if (!rateLimit(ip)) return { items: [], error: "rate_limit" as const };
    } catch { /* ignore */ }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { items: [], error: "no_key" as const };

    const catalog = data.menu.map((m) => `${m.id} | ${m.name}`).join("\n");
    const prompt = `Você é o atendente IA da Top Burguer. O cliente falou (PT-BR):
"""${data.transcript}"""

Cardápio disponível (id | nome):
${catalog}

Extraia APENAS os itens que aparecem no cardápio acima e devolva no formato JSON:
{"items":[{"id":"<id do cardápio>","quantity":<n>}]}

Regras:
- Se nada do cardápio foi mencionado, retorne {"items":[]}
- Quantidade padrão é 1 quando não dito (ex: "uma coca" = 1)
- Aceite plurais e variações ("dois x-bacon", "duas batatas")
- Ignore pedidos sem correspondência ("sem cebola" não é item)
- NÃO invente IDs. Use exatamente os IDs listados acima.
- Devolva APENAS o JSON, sem markdown nem explicação.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        if (res.status === 429) return { items: [], error: "rate_limit" as const };
        if (res.status === 402) return { items: [], error: "no_credits" as const };
        return { items: [], error: "gateway" as const };
      }
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const raw = json.choices?.[0]?.message?.content?.trim() ?? "{}";
      const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
      const ids = new Set(data.menu.map((m) => m.id));
      const items: { id: string; quantity: number }[] = [];
      if (Array.isArray(parsed?.items)) {
        for (const it of parsed.items) {
          if (typeof it?.id === "string" && ids.has(it.id)) {
            const q = Math.max(1, Math.min(20, parseInt(String(it.quantity ?? 1), 10) || 1));
            items.push({ id: it.id, quantity: q });
          }
        }
      }
      return { items, error: null };
    } catch (e) {
      console.error("[ai-voice-order]", e);
      return { items: [], error: "network" as const };
    }
  });
