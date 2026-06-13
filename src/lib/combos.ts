// Sugestão de combos: olha pedidos passados e calcula coocorrência de itens.
// "Quem pediu X também levou Y" — leve, sem ML, só estatística simples.
import { useMemo } from "react";
import { useOrders } from "@/lib/orders-store";

export type ComboSuggestion = {
  menuId: string;
  name: string;
  emoji: string;
  score: number; // 0..1, fração das vezes que apareceu com os itens do carrinho
};

export function useComboSuggestions(
  cartMenuIds: string[],
  menu: { id: string; name: string; emoji: string; category: string }[],
  max = 3
): ComboSuggestion[] {
  const { orders } = useOrders();
  return useMemo(() => {
    if (cartMenuIds.length === 0) return [];
    // Conta quantos pedidos com algum item do carrinho também tinham cada outro item
    const totalMatch = orders.filter((o) =>
      o.items.some((i) => cartMenuIds.includes(i.menuId))
    ).length;
    if (totalMatch < 2) {
      // Fallback: sugere mais vendidos de categorias complementares (side/drink)
      const counts = new Map<string, number>();
      for (const o of orders) {
        for (const i of o.items) {
          if (cartMenuIds.includes(i.menuId)) continue;
          counts.set(i.menuId, (counts.get(i.menuId) ?? 0) + i.quantity);
        }
      }
      return [...counts.entries()]
        .map(([id, c]) => {
          const m = menu.find((x) => x.id === id);
          if (!m) return null;
          return { menuId: id, name: m.name, emoji: m.emoji, score: Math.min(1, c / 5) };
        })
        .filter((x): x is ComboSuggestion => !!x)
        .sort((a, b) => b.score - a.score)
        .slice(0, max);
    }
    const counts = new Map<string, number>();
    for (const o of orders) {
      if (!o.items.some((i) => cartMenuIds.includes(i.menuId))) continue;
      const seen = new Set<string>();
      for (const i of o.items) {
        if (cartMenuIds.includes(i.menuId)) continue;
        if (seen.has(i.menuId)) continue;
        seen.add(i.menuId);
        counts.set(i.menuId, (counts.get(i.menuId) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([id, c]) => {
        const m = menu.find((x) => x.id === id);
        if (!m) return null;
        return { menuId: id, name: m.name, emoji: m.emoji, score: c / totalMatch };
      })
      .filter((x): x is ComboSuggestion => !!x && x.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, max);
  }, [orders, cartMenuIds, menu, max]);
}
