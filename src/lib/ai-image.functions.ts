// Gera imagens via IA (pratos, logos, banners promocionais).
// Retorna data URL (base64 PNG) que o admin salva onde quiser.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  dishName: z.string().min(1).max(80),
  description: z.string().max(600).optional(),
  kind: z.enum(["dish", "logo", "promo"]).default("dish"),
  style: z
    .enum([
      "premium",
      "rustic",
      "minimal",
      "neon",
      "american",
      "cartoon",
      "gourmet",
      "dark",
      "topview",
      "closeup",
      "streetfood",
      "watercolor",
      "vintage",
      "japanese",
      "bbq",
      "fresh",
    ])
    .default("premium"),
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
  return cur.count <= 6;
}

const STYLE_HINTS: Record<string, string> = {
  premium:    "fundo escuro de madeira queimada, iluminação cinematográfica quente, ângulo 45°, estilo menu premium",
  rustic:     "tábua de madeira rústica, luz natural suave, vapor leve, vibe artesanal de boteco",
  minimal:    "fundo branco limpo, sombra suave, composição minimalista estilo Apple, vista superior",
  neon:       "ambiente noturno urbano, luzes neon rosa e ciano, reflexos vibrantes, estilo cyberpunk",
  american:   "estilo diner americano anos 50, fundo vermelho com xadrez, cores saturadas, vibe vintage",
  cartoon:    "ilustração cartoon vibrante, traços fortes, cores planas saturadas, estilo mascote de fast-food",
  gourmet:    "apresentação de restaurante michelin, prato de porcelana branca, molhos pintados, microervas, iluminação dramática lateral",
  dark:       "estilo dark & moody food photography, fundo preto, luz de janela lateral, contraste alto, sombras profundas, vapor visível",
  topview:    "vista superior flat lay 90°, ingredientes espalhados ao redor, tábua de madeira clara, luz natural difusa, estilo editorial gastronômico",
  closeup:    "macro extremo close-up, foco super raso, textura visível (queijo derretido, gotas, brilho), gotas de óleo, ultra apetitoso",
  streetfood: "vibe food truck de rua, papel kraft, luzes amarelas de festival, fundo desfocado com pessoas, autêntico e descontraído",
  watercolor: "ilustração aquarela artística, traços de pincel suaves, cores aguadas, fundo papel texturizado, estilo livro de receitas",
  vintage:    "fotografia analógica anos 70, filme granulado, cores quentes desbotadas, tons sépia, vibe retrô nostálgica",
  japanese:   "estilo washoku japonês minimalista, louça de cerâmica artesanal, fundo de bambu/madeira clara, composição zen equilibrada",
  bbq:        "churrasco americano texano, brasas acesas ao fundo, fumaça densa, grelha de ferro, luz dourada do pôr do sol, vibe smokehouse",
  fresh:      "estilo fresh & natural, luz natural brilhante, fundo de mármore branco, ingredientes frescos visíveis, vibe saudável e clean",
};

function buildPrompt(kind: string, style: string, name: string, desc?: string) {
  const styleHint = STYLE_HINTS[style] ?? STYLE_HINTS.premium;
  if (kind === "logo") {
    return `Logo profissional de marca de restaurante chamada "${name}", design icônico, vetorial limpo, alta legibilidade, ${styleHint}. Apenas o símbolo/ícone centralizado em fundo neutro, sem texto adicional, sem marca d'água.`;
  }
  if (kind === "promo") {
    return `Banner promocional vertical de restaurante para "${name}"${desc ? ` — ${desc}` : ""}. ${styleHint}. Composição chamativa, espaço para texto no topo, super apetitoso, alta resolução. Sem texto, sem marca d'água.`;
  }
  return `Fotografia profissional de comida, prato: ${name}${desc ? `. Detalhes: ${desc}` : ""}. ${styleHint}. Super apetitoso, alta resolução. Sem texto, sem marca d'água.`;
}

export const generateDishImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data, context }) => {
    // Admin-only: verifica role no servidor para impedir abuso de créditos de IA.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin")) {
      return { dataUrl: null, error: "forbidden" as const };
    }
    try {
      const { getRequestIP } = await import("@tanstack/react-start/server");
      const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
      if (!rateLimit(ip)) return { dataUrl: null, error: "rate_limit" as const };
    } catch { /* ignore */ }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { dataUrl: null, error: "no_key" as const };

    const prompt = buildPrompt(data.kind, data.style, data.dishName, data.description);

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("[ai-image]", res.status, txt);
        if (res.status === 429) return { dataUrl: null, error: "rate_limit" as const };
        if (res.status === 402) return { dataUrl: null, error: "no_credits" as const };
        return { dataUrl: null, error: "gateway" as const };
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
      };
      const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!url) return { dataUrl: null, error: "no_image" as const };
      return { dataUrl: url, error: null };
    } catch (e) {
      console.error("[ai-image] failed", e);
      return { dataUrl: null, error: "network" as const };
    }
  });
