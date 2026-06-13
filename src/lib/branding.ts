// Branding configurável pelo dono: nome da hamburgueria, emoji do logo e tema visual.
// Persistido em localStorage, sincronizado entre abas, aplicado ao <html> via data-theme.
import { useCallback, useEffect, useState } from "react";

export type ThemePreset = "classic" | "diner" | "street" | "gourmet" | "boteco";

export type Branding = {
  name: string;
  emoji: string;
  theme: ThemePreset;
};

export const THEME_PRESETS: { key: ThemePreset; label: string; emoji: string; desc: string }[] = [
  { key: "classic", label: "Clássico (Top Burguer)", emoji: "🔥", desc: "Ember + amber, dark sofisticado" },
  { key: "diner",   label: "Diner Americano",        emoji: "🍔", desc: "Vermelho cereja, amarelo mostarda, vibe anos 50" },
  { key: "street",  label: "Street Food",            emoji: "🛵", desc: "Neon rosa + azul elétrico, urbano noturno" },
  { key: "gourmet", label: "Gourmet",                emoji: "🥂", desc: "Verde esmeralda + dourado, refinado" },
  { key: "boteco",  label: "Boteco Brasileiro",      emoji: "🍺", desc: "Verde-amarelo, madeira, descontraído" },
];

const KEY = "fast-order:branding";
const CH = "fast-order:branding-channel";

const DEFAULT: Branding = { name: "Top Burguer", emoji: "🔥", theme: "classic" };

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
    };
  } catch {
    return DEFAULT;
  }
}

function applyTheme(theme: ThemePreset) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

export function useBranding() {
  const [b, setB] = useState<Branding>(DEFAULT);

  useEffect(() => {
    const cur = read();
    setB(cur);
    applyTheme(cur.theme);
    const ch = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CH) : null;
    const onMsg = () => {
      const next = read();
      setB(next);
      applyTheme(next.theme);
    };
    ch?.addEventListener("message", onMsg);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        const next = read();
        setB(next);
        applyTheme(next.theme);
      }
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
    applyTheme(next.theme);
    const ch = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CH) : null;
    ch?.postMessage({ t: Date.now() });
    ch?.close();
  }, []);

  return { branding: b, save };
}
