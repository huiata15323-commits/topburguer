// Estado local de despesas financeiras (insumos, contas, salários, outros)
import { useCallback, useEffect, useState } from "react";

export type ExpenseCategory = "insumos" | "contas" | "salarios" | "outros";

export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  createdAt: number;
};

const KEY = "fast-order:expenses";
const CHANNEL = "fast-order:expenses-channel";

function read(): Expense[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list: Expense[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}
function getCh(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(CHANNEL);
}

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  insumos: "Insumos",
  contas: "Contas",
  salarios: "Salários",
  outros: "Outros",
};

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    setExpenses(read());
    const ch = getCh();
    const onMsg = () => setExpenses(read());
    ch?.addEventListener("message", onMsg);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setExpenses(read()); };
    window.addEventListener("storage", onStorage);
    return () => {
      ch?.removeEventListener("message", onMsg);
      ch?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const broadcast = useCallback(() => {
    const ch = getCh();
    ch?.postMessage({ t: Date.now() });
    ch?.close();
  }, []);

  const addExpense = useCallback((data: Omit<Expense, "id" | "createdAt">) => {
    const e: Expense = { ...data, id: crypto.randomUUID(), createdAt: Date.now() };
    const next = [e, ...read()];
    write(next);
    setExpenses(next);
    broadcast();
    return e;
  }, [broadcast]);

  const removeExpense = useCallback((id: string) => {
    const next = read().filter((e) => e.id !== id);
    write(next);
    setExpenses(next);
    broadcast();
  }, [broadcast]);

  return { expenses, addExpense, removeExpense };
}
