// i18n minimalista: PT/EN/ES com persistência em localStorage.
import { useCallback, useEffect, useState } from "react";

export type Lang = "pt" | "en" | "es";
const KEY = "fast-order:lang";
const CH = "fast-order:lang-channel";

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "pt", label: "PT", flag: "🇧🇷" },
  { code: "en", label: "EN", flag: "🇺🇸" },
  { code: "es", label: "ES", flag: "🇪🇸" },
];

type Dict = Record<string, { pt: string; en: string; es: string }>;

const DICT: Dict = {
  "menu.burger": { pt: "Hambúrgueres", en: "Burgers", es: "Hamburguesas" },
  "menu.side":   { pt: "Acompanhamentos", en: "Sides", es: "Acompañamientos" },
  "menu.drink":  { pt: "Bebidas", en: "Drinks", es: "Bebidas" },
  "menu.soldout": { pt: "Esgotado hoje", en: "Sold out today", es: "Agotado hoy" },
  "order.title": { pt: "Faça seu pedido", en: "Place your order", es: "Haz tu pedido" },
  "order.table": { pt: "MESA", en: "TABLE", es: "MESA" },
  "order.wait":  { pt: "Tempo estimado de preparo", en: "Estimated prep time", es: "Tiempo estimado" },
  "order.your":  { pt: "Seu pedido", en: "Your order", es: "Tu pedido" },
  "order.name":  { pt: "Nome", en: "Name", es: "Nombre" },
  "order.namePh": { pt: "Como te chamamos?", en: "What's your name?", es: "¿Cómo te llamamos?" },
  "order.phone": { pt: "WhatsApp", en: "WhatsApp", es: "WhatsApp" },
  "order.phoneHelp": {
    pt: "(opcional — avisamos quando ficar pronto)",
    en: "(optional — we'll notify you when ready)",
    es: "(opcional — te avisamos cuando esté listo)",
  },
  "order.notes": { pt: "Observações gerais", en: "General notes", es: "Notas" },
  "order.empty": { pt: "Carrinho vazio", en: "Empty cart", es: "Carrito vacío" },
  "order.total": { pt: "Total", en: "Total", es: "Total" },
  "order.send":  { pt: "⚡ Pagar com PIX e enviar", en: "⚡ Pay with PIX & send", es: "⚡ Pagar y enviar" },
  "order.sending": { pt: "Enviando…", en: "Sending…", es: "Enviando…" },
  "order.coupon": { pt: "Cupom de desconto", en: "Discount coupon", es: "Cupón" },
  "order.couponPh": { pt: "Ex: BURGUER10", en: "e.g. BURGUER10", es: "Ej: BURGUER10" },
  "order.couponApply": { pt: "Aplicar", en: "Apply", es: "Aplicar" },
  "order.couponInvalid": { pt: "Cupom inválido", en: "Invalid coupon", es: "Cupón inválido" },
  "order.couponOk": { pt: "Cupom aplicado", en: "Coupon applied", es: "Cupón aplicado" },
  "order.discount": { pt: "Desconto", en: "Discount", es: "Descuento" },
  "order.subtotal": { pt: "Subtotal", en: "Subtotal", es: "Subtotal" },
  "order.happyHour": { pt: "🎉 Happy Hour ativo!", en: "🎉 Happy Hour live!", es: "🎉 ¡Happy Hour activo!" },
  "order.loyalty": { pt: "Cliente fiel", en: "Loyal customer", es: "Cliente fiel" },
  "order.loyaltyReward": {
    pt: "Você ganhou um item grátis! Cupom aplicado automaticamente.",
    en: "You earned a free item! Coupon auto-applied.",
    es: "¡Ganaste un ítem gratis! Cupón aplicado.",
  },
  "order.loyaltyProgress": {
    pt: "pedidos para um item grátis",
    en: "orders until a free item",
    es: "pedidos para un ítem gratis",
  },
};

export function t(key: string, lang: Lang): string {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[lang] ?? entry.pt;
}

function read(): Lang {
  if (typeof window === "undefined") return "pt";
  const v = localStorage.getItem(KEY) as Lang | null;
  return v && ["pt", "en", "es"].includes(v) ? v : "pt";
}

export function useLang() {
  const [lang, setLang] = useState<Lang>("pt");

  useEffect(() => {
    setLang(read());
    const ch = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CH) : null;
    const onMsg = () => setLang(read());
    ch?.addEventListener("message", onMsg);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setLang(read());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      ch?.removeEventListener("message", onMsg);
      ch?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const change = useCallback((l: Lang) => {
    localStorage.setItem(KEY, l);
    setLang(l);
    const ch = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CH) : null;
    ch?.postMessage({ t: Date.now() });
    ch?.close();
  }, []);

  const tr = useCallback((key: string) => t(key, lang), [lang]);

  return { lang, setLang: change, t: tr };
}
