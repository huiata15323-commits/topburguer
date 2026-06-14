// Gera foto de prato via IA. Retorna data URL (base64 PNG) que o admin
// salva no campo image do item do cardápio.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  dishName: z.string().min(2).max(80),
  description: z.string().max(200).optional(),
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
  return cur.count <= 4;
}

export const generateDishImage = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    try {
      const { getRequestIP } = await import("@tanstack/react-start/server");
      const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
      if (!rateLimit(ip)) return { dataUrl: null, error: "rate_limit" as const };
    } catch { /* ignore */ }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { dataUrl: null, error: "no_key" as const };

    const prompt = `Fotografia profissional de comida, estilo menu de hamburgueria premium, fundo escuro de madeira queimada, iluminação cinematográfica quente, ângulo 45°, super apetitoso, alta resolução. Prato: ${data.dishName}${data.description ? `. Detalhes: ${data.description}` : ""}. Sem texto, sem marca d'água.`;

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
