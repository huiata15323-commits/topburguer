// Estado compartilhado de pedidos via Lovable Cloud.
// Realtime foi removido (broadcast vazava PII); usamos polling leve (4s).
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStaffPin } from "@/components/StaffGate";
import { staffUpdateStatus, staffClearOrders } from "@/lib/staff.functions";

export type OrderStatus = "pending" | "preparing" | "done";


export type OrderItem = {
  menuId: string;
  name: string;
  emoji: string;
  image: string;
  price: number;
  quantity: number;
  notes?: string;
};

export type Order = {
  id: string;
  number: number;
  customer: string;
  phone?: string;
  tableNumber?: number;
  items: OrderItem[];
  notes?: string;
  total: number;
  status: OrderStatus;
  createdAt: number;
  doneAt?: number;
  notifiedAt?: number;
  rating?: number;
  review?: string;
  ratedAt?: number;
  waiterCalledAt?: number;
};

// ===== Mapeamento entre o registro do DB e o tipo Order =====
type DbRow = {
  id: string;
  number: number;
  customer: string;
  phone: string | null;
  table_number: number | null;
  items: unknown;
  notes: string | null;
  total: number | string;
  status: OrderStatus;
  created_at: string;
  done_at: string | null;
  notified_at: string | null;
  rating: number | null;
  review: string | null;
  rated_at: string | null;
  waiter_called_at: string | null;
};

function rowToOrder(r: DbRow): Order {
  return {
    id: r.id,
    number: r.number,
    customer: r.customer,
    phone: r.phone ?? undefined,
    tableNumber: r.table_number ?? undefined,
    items: Array.isArray(r.items) ? (r.items as OrderItem[]) : [],
    notes: r.notes ?? undefined,
    total: typeof r.total === "string" ? parseFloat(r.total) : r.total,
    status: r.status,
    createdAt: new Date(r.created_at).getTime(),
    doneAt: r.done_at ? new Date(r.done_at).getTime() : undefined,
    notifiedAt: r.notified_at ? new Date(r.notified_at).getTime() : undefined,
    rating: r.rating ?? undefined,
    review: r.review ?? undefined,
    ratedAt: r.rated_at ? new Date(r.rated_at).getTime() : undefined,
    waiterCalledAt: r.waiter_called_at ? new Date(r.waiter_called_at).getTime() : undefined,
  };
}

// ===== Cache em memória compartilhado entre hooks na mesma aba =====
let cache: Order[] = [];
const listeners = new Set<(o: Order[]) => void>();
let initialized = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;

function notify() {
  for (const fn of listeners) fn(cache);
}

async function fetchAll() {
  const { data, error } = await supabase
    .from("orders")
    .select("id, number, customer, table_number, items, notes, total, status, created_at, done_at, notified_at, rating, review, rated_at, waiter_called_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[orders] fetch failed", error);
    return;
  }
  cache = (data as unknown as DbRow[]).map(rowToOrder);
  notify();
}

function ensurePolling() {
  if (initialized) return;
  initialized = true;
  void fetchAll();
  // Polling leve substitui o realtime (que vazava PII para todos os assinantes anon)
  pollTimer = setInterval(() => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    void fetchAll();
  }, 4000);
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>(cache);


  useEffect(() => {
    ensurePolling();

    const fn = (o: Order[]) => setOrders(o);
    listeners.add(fn);
    setOrders(cache);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const addOrder = useCallback(
    async (
      data: Omit<Order, "id" | "number" | "status" | "createdAt">
    ): Promise<Order> => {
      const { data: inserted, error } = await supabase
        .from("orders")
        .insert({
          customer: data.customer,
          phone: data.phone ?? null,
          table_number: data.tableNumber ?? null,
          items: data.items,
          notes: data.notes ?? null,
          total: data.total,
          status: "pending",
        })
        .select("*")
        .single();
      if (error || !inserted) {
        console.error("[orders] insert failed", error);
        throw error ?? new Error("insert failed");
      }
      const order = rowToOrder(inserted as unknown as DbRow);
      // Otimista: já injeta no cache (o Realtime depois confirma)
      if (!cache.some((o) => o.id === order.id)) {
        cache = [order, ...cache];
        notify();
      }
      return order;
    },
    []
  );

  const updateStatus = useCallback(async (id: string, status: OrderStatus) => {
    const patch: { status: OrderStatus; done_at?: string } = { status };
    if (status === "done") patch.done_at = new Date().toISOString();
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) console.error("[orders] updateStatus failed", error);
  }, []);

  const markNotified = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", id);
    if (error) console.error("[orders] markNotified failed", error);
  }, []);

  const rateOrder = useCallback(
    async (id: string, rating: number, review?: string) => {
      const safe = Math.max(1, Math.min(5, Math.round(rating)));
      const { error } = await supabase
        .from("orders")
        .update({
          rating: safe,
          review: review?.slice(0, 300) ?? null,
          rated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) console.error("[orders] rateOrder failed", error);
    },
    []
  );

  const callWaiter = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ waiter_called_at: new Date().toISOString() })
      .eq("id", id);
    if (error) console.error("[orders] callWaiter failed", error);
  }, []);

  const clearWaiterCall = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ waiter_called_at: null })
      .eq("id", id);
    if (error) console.error("[orders] clearWaiterCall failed", error);
  }, []);

  const clearDone = useCallback(async () => {
    const { error } = await supabase.from("orders").delete().eq("status", "done");
    if (error) console.error("[orders] clearDone failed", error);
  }, []);

  const clearAll = useCallback(async () => {
    const { error } = await supabase.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) console.error("[orders] clearAll failed", error);
  }, []);

  return { orders, addOrder, updateStatus, markNotified, rateOrder, callWaiter, clearWaiterCall, clearDone, clearAll };
}

// Estima o tempo de espera (em minutos) baseado na fila atual e no histórico
// dos últimos pedidos concluídos. Cai em 8min como fallback.
export function estimateWaitMinutes(orders: Order[]): number {
  const completed = orders
    .filter((o) => o.status === "done" && o.doneAt)
    .slice(0, 10);
  let avgPerOrder = 8;
  if (completed.length >= 2) {
    const totalMs = completed.reduce(
      (s, o) => s + Math.max(0, (o.doneAt ?? 0) - o.createdAt),
      0
    );
    avgPerOrder = Math.max(4, Math.round(totalMs / completed.length / 60000));
  }
  const queue =
    orders.filter((o) => o.status === "pending" || o.status === "preparing").length;
  // Assume duas estações em paralelo na simulação
  const parallel = 2;
  const positions = Math.ceil((queue + 1) / parallel);
  return Math.max(3, positions * avgPerOrder);
}

// Cleanup do canal global (opcional, mas evita leaks em HMR)
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (realtimeChannel) {
      void supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
      initialized = false;
    }
  });
}
