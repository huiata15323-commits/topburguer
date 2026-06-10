// Cardápio editável: persiste customizações em localStorage e sincroniza
// entre abas (Admin <-> Pedido) via BroadcastChannel. O MENU exportado em
// `menu.ts` é usado apenas como semente inicial — após o primeiro uso, o
// estado vivo é o que está em localStorage.
import { useCallback, useEffect, useState } from "react";
import { MENU as SEED, type MenuItem } from "./menu";

export type EditableMenuItem = MenuItem & { soldOut?: boolean };

const STORAGE_KEY = "fast-order:menu";
const CHANNEL = "fast-order:menu-channel";

function read(): EditableMenuItem[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as EditableMenuItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED;
    return parsed;
  } catch {
    return SEED;
  }
}

function write(items: EditableMenuItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function channel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(CHANNEL);
}

function uid() {
  return "m_" + Math.random().toString(36).slice(2, 9);
}

export function useMenu() {
  const [items, setItems] = useState<EditableMenuItem[]>(SEED);

  useEffect(() => {
    setItems(read());
    const ch = channel();
    const onMsg = () => setItems(read());
    ch?.addEventListener("message", onMsg);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(read());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      ch?.removeEventListener("message", onMsg);
      ch?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const broadcast = useCallback(() => {
    const ch = channel();
    ch?.postMessage({ t: Date.now() });
    ch?.close();
  }, []);

  const persist = useCallback(
    (next: EditableMenuItem[]) => {
      write(next);
      setItems(next);
      broadcast();
    },
    [broadcast]
  );

  const addItem = useCallback(
    (data: Omit<EditableMenuItem, "id">) => {
      const item: EditableMenuItem = { ...data, id: uid() };
      persist([...read(), item]);
      return item;
    },
    [persist]
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<EditableMenuItem>) => {
      persist(read().map((m) => (m.id === id ? { ...m, ...patch } : m)));
    },
    [persist]
  );

  const removeItem = useCallback(
    (id: string) => {
      persist(read().filter((m) => m.id !== id));
    },
    [persist]
  );

  const toggleSoldOut = useCallback(
    (id: string) => {
      persist(read().map((m) => (m.id === id ? { ...m, soldOut: !m.soldOut } : m)));
    },
    [persist]
  );

  const resetToDefaults = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setItems(SEED);
    broadcast();
  }, [broadcast]);

  return { items, addItem, updateItem, removeItem, toggleSoldOut, resetToDefaults };
}
