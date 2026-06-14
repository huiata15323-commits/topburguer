// Branding white-label: nome, emoji, tema visual, cores customizadas, slogan, logo, favicon,
// modo "remover marca Lovable/Top Burguer" e exportar/importar configuração da loja.
import { useCallback, useEffect, useState } from "react";

export type ThemePreset =
  | "classic" | "diner" | "street" | "gourmet" | "boteco"
  | "pizzaria" | "acai" | "cafeteria" | "sushi" | "mexicana";

export type Branding = {
  name: string;
  emoji: string;
  theme: ThemePreset;
  slogan: string;
  logoUrl: string;        // opcional, URL ou data:image
  faviconUrl: string;     // opcional
  brandHue: number | null;// 0-360, sobrescreve hue do tema; null = usa tema
  whiteLabel: boolean;    // se true, esconde menções "Top Burguer" / "Lovable" no app/recibos
};

export const THEME_PRESETS: { key: ThemePreset; label: string; emoji: string; desc: string; segment: string }[] = [
  { key: "classic",   label: "Clássico",          emoji: "🔥", segment: "Hambúrguer",  desc: "Ember + amber, dark sofisticado" },
  { key: "diner",     label: "Diner Americano",   emoji: "🍔", segment: "Hambúrguer",  desc: "Vermelho cereja + amarelo mostarda" },
  { key: "street",    label: "Street Food",       emoji: "🛵", segment: "Hambúrguer",  desc: "Neon rosa + azul elétrico" },
  { key: "gourmet",   label: "Gourmet",           emoji: "🥂", segment: "Premium",     desc: "Esmeralda + dourado refinado" },
  { key: "boteco",    label: "Boteco Brasileiro", emoji: "🍺", segment: "Bar",         desc: "Verde-amarelo + madeira" },
  { key: "pizzaria",  label: "Pizzaria",          emoji: "🍕", segment: "Pizzaria",    desc: "Tomate + manjericão + forno" },
  { key: "acai",      label: "Açaí",              emoji: "🍇", segment: "Açaí",        desc: "Roxo profundo + lima" },
  { key: "cafeteria", label: "Cafeteria",         emoji: "☕", segment: "Café",        desc: "Café + creme + caramelo" },
  { key: "sushi",     label: "Sushi / Japonês",   emoji: "🍣", segment: "Japonês",     desc: "Preto fosco + hinomaru" },
  { key: "mexicana",  label: "Mexicana",          emoji: "🌮", segment: "Mexicana",    desc: "Terracota + cacto + sol" },
];

const KEY = "fast-order:branding";
const CH = "fast-order:branding-channel";

const DEFAULT: Branding = {
  name: "Top Burguer",
  emoji: "🔥",
  theme: "classic",
  slogan: "Do toque à chapa",
  logoUrl: "",
  faviconUrl: "",
  brandHue: null,
  whiteLabel: false,
};

function read(): Branding {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw) as Partial<Branding>;
    return {
      name: (p.name || DEFAULT.name).slice(0, 40),
      emoji: (p.emoji || DEFAULT.emoji).slice(0, 4),
      theme: (p.theme as ThemePreset) || DEFAULT.theme,
      slogan: (p.slogan ?? DEFAULT.slogan).slice(0, 80),
      logoUrl: (p.logoUrl ?? "").slice(0, 2000),
      faviconUrl: (p.faviconUrl ?? "").slice(0, 2000),
      brandHue: typeof p.brandHue === "number" ? Math.max(0, Math.min(360, p.brandHue)) : null,
      whiteLabel: !!p.whiteLabel,
    };
  } catch {
    return DEFAULT;
  }
}

function apply(b: Branding) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.dataset.theme = b.theme;
  if (b.brandHue != null) {
    html.style.setProperty("--brand-hue", String(b.brandHue));
    html.setAttribute("data-brand-hue", "1");
  } else {
    html.style.removeProperty("--brand-hue");
    html.removeAttribute("data-brand-hue");
  }
  // Favicon dinâmico
  if (b.faviconUrl) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = b.faviconUrl;
  }
  // Título da aba
  if (b.name) document.title = b.whiteLabel ? b.name : `${b.name} — Pedidos`;
}

export function getBranding(): Branding {
  return read();
}

export function exportBrandingBundle() {
  if (typeof window === "undefined") return {};
  const keys = [
    "fast-order:branding",
    "fast-order:menu",
    "fast-order:promos",
    "fast-order:expenses",
    "fast-order:lang",
  ];
  const bundle: Record<string, unknown> = { _v: 1, _exportedAt: new Date().toISOString() };
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v != null) {
      try { bundle[k] = JSON.parse(v); } catch { bundle[k] = v; }
    }
  }
  return bundle;
}

export function importBrandingBundle(bundle: Record<string, unknown>): { ok: number; skipped: string[] } {
  const skipped: string[] = [];
  let ok = 0;
  for (const [k, v] of Object.entries(bundle)) {
    if (!k.startsWith("fast-order:")) { skipped.push(k); continue; }
    try {
      localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
      ok++;
    } catch { skipped.push(k); }
  }
  // Notifica abas
  try {
    const ch = new BroadcastChannel(CH);
    ch.postMessage({ t: Date.now() });
    ch.close();
  } catch { /* noop */ }
  return { ok, skipped };
}

export function useBranding() {
  const [b, setB] = useState<Branding>(DEFAULT);

  useEffect(() => {
    const cur = read();
    setB(cur);
    apply(cur);
    const ch = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CH) : null;
    const onMsg = () => { const n = read(); setB(n); apply(n); };
    ch?.addEventListener("message", onMsg);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) { const n = read(); setB(n); apply(n); }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      ch?.removeEventListener("message", onMsg);
      ch?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const save = useCallback((patch: Partial<Branding>) => {
    const next = { ...read(), ...patch };
    localStorage.setItem(KEY, JSON.stringify(next));
    setB(next);
    apply(next);
    const ch = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CH) : null;
    ch?.postMessage({ t: Date.now() });
    ch?.close();
  }, []);

  return { branding: b, save };
}
