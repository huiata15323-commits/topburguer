// Estado compartilhado de pedidos via Lovable Cloud.
// Usa Realtime (postgres_changes) com fallback de polling lento (30s)
// só para garantir reconexão se a subscription cair.
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
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

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

function applyRealtimeChange(
  event: "INSERT" | "UPDATE" | "DELETE",
  newRow: DbRow | null,
  oldRow: DbRow | null,
) {
  if (event === "DELETE" && oldRow) {
    cache = cache.filter((o) => o.id !== oldRow.id);
    notify();
    return;
  }
  if (!newRow) return;
  const order = rowToOrder(newRow);
  const idx = cache.findIndex((o) => o.id === order.id);
  if (idx === -1) {
    cache = [order, ...cache];
  } else {
    const next = cache.slice();
    next[idx] = order;
    cache = next;
  }
  notify();
}

function ensureStreaming() {
  if (initialized) return;
  initialized = true;
  void fetchAll();

  // Realtime: atualizações instantâneas via postgres_changes
  realtimeChannel = supabase
    .channel("orders-stream")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      (payload) => {
        applyRealtimeChange(
          payload.eventType as "INSERT" | "UPDATE" | "DELETE",
          (payload.new as DbRow) ?? null,
          (payload.old as DbRow) ?? null,
        );
      },
    )
    .subscribe();

  // Fallback de reconciliação a cada 30s (caso a subscription caia)
  pollTimer = setInterval(() => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    void fetchAll();
  }, 30000);
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>(cache);


  useEffect(() => {
    ensureStreaming();

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
        })
        .select("id, number, customer, table_number, items, notes, total, status, created_at, done_at, notified_at, rating, review, rated_at, waiter_called_at")
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
    const pin = getStaffPin();
    if (!pin) {
      console.warn("[orders] updateStatus blocked: staff PIN required");
      return;
    }
    try {
      await staffUpdateStatus({ data: { pin, id, status } });
      void fetchAll();
    } catch (e) {
      console.error("[orders] updateStatus failed", e);
    }
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
    const pin = getStaffPin();
    if (!pin) {
      console.warn("[orders] clearDone blocked: staff PIN required");
      return;
    }
    try {
      await staffClearOrders({ data: { pin, scope: "done" } });
      void fetchAll();
    } catch (e) {
      console.error("[orders] clearDone failed", e);
    }
  }, []);

  const clearAll = useCallback(async () => {
    const pin = getStaffPin();
    if (!pin) {
      console.warn("[orders] clearAll blocked: staff PIN required");
      return;
    }
    try {
      await staffClearOrders({ data: { pin, scope: "all" } });
      void fetchAll();
    } catch (e) {
      console.error("[orders] clearAll failed", e);
    }
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
    // Cap por pedido em 30min para que pedidos esquecidos/antigos
    // não distorçam a média (ex.: pedido concluído horas depois).
    const totalMs = completed.reduce(
      (s, o) => s + Math.min(30 * 60_000, Math.max(0, (o.doneAt ?? 0) - o.createdAt)),
      0
    );
    avgPerOrder = Math.max(4, Math.min(20, Math.round(totalMs / completed.length / 60000)));
  }
  const queue =
    orders.filter((o) => o.status === "pending" || o.status === "preparing").length;
  // Assume duas estações em paralelo na simulação
  const parallel = 2;
  const positions = Math.ceil((queue + 1) / parallel);
  return Math.max(3, Math.min(45, positions * avgPerOrder));
}


// Para realtime e polling quando a aba é fechada
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (realtimeChannel) {
      void supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    initialized = false;
  });
}
