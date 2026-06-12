// Programa de fidelidade simples: contagem de pedidos concluídos por telefone.
// A cada N pedidos, libera um item grátis (cupom virtual).
import { useMemo } from "react";
import { useOrders } from "@/lib/orders-store";
import { normalizePhoneBR } from "@/lib/whatsapp";

export const REWARD_EVERY = 10;
export const REWARD_PERCENT = 100; // 100% off em 1 item (item grátis)

export function useLoyaltyStatus(rawPhone: string) {
  const { orders } = useOrders();
  return useMemo(() => {
    const e164 = normalizePhoneBR(rawPhone);
    if (!e164) return { count: 0, toNext: REWARD_EVERY, eligible: false, e164: null };
    const count = orders.filter(
      (o) => o.phone && normalizePhoneBR(o.phone) === e164 && o.status === "done"
    ).length;
    const remainder = count % REWARD_EVERY;
    const toNext = REWARD_EVERY - remainder;
    const eligible = count > 0 && remainder === 0;
    return { count, toNext, eligible, e164 };
  }, [orders, rawPhone]);
}
