// Estado compartilhado de pedidos em tempo real entre abas (cliente <-> cozinha)
// Usa localStorage para persistência + BroadcastChannel para sincronização instantânea.
import { useEffect, useState, useCallback } from "react";

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
  items: OrderItem[];
  notes?: string;
  total: number;
  status: OrderStatus;
  createdAt: number;
  doneAt?: number;
  notifiedAt?: number;
};

const STORAGE_KEY = "fast-order:orders";
const COUNTER_KEY = "fast-order:counter";
const CHANNEL = "fast-order:channel";

function read(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function write(orders: Order[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(CHANNEL);
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setOrders(read());
    const ch = getChannel();
    const onMsg = () => setOrders(read());
    ch?.addEventListener("message", onMsg);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setOrders(read());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      ch?.removeEventListener("message", onMsg);
      ch?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const broadcast = useCallback(() => {
    const ch = getChannel();
    ch?.postMessage({ t: Date.now() });
    ch?.close();
  }, []);

  const addOrder = useCallback(
    (data: Omit<Order, "id" | "number" | "status" | "createdAt">) => {
      const current = read();
      const counter = Number(localStorage.getItem(COUNTER_KEY) || "0") + 1;
      localStorage.setItem(COUNTER_KEY, String(counter));
      const order: Order = {
        ...data,
        id: crypto.randomUUID(),
        number: counter,
        status: "pending",
        createdAt: Date.now(),
      };
      const next = [order, ...current];
      write(next);
      setOrders(next);
      broadcast();
      return order;
    },
    [broadcast]
  );

  const updateStatus = useCallback(
    (id: string, status: OrderStatus) => {
      const next = read().map((o) =>
        o.id === id
          ? { ...o, status, doneAt: status === "done" ? Date.now() : o.doneAt }
          : o
      );
      write(next);
      setOrders(next);
      broadcast();
    },
    [broadcast]
  );

  const markNotified = useCallback(
    (id: string) => {
      const next = read().map((o) => (o.id === id ? { ...o, notifiedAt: Date.now() } : o));
      write(next);
      setOrders(next);
      broadcast();
    },
    [broadcast]
  );

  const clearDone = useCallback(() => {
    const next = read().filter((o) => o.status !== "done");
    write(next);
    setOrders(next);
    broadcast();
  }, [broadcast]);

  return { orders, addOrder, updateStatus, markNotified, clearDone };
}
