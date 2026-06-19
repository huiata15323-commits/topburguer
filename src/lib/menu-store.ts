// Cardápio na nuvem (Lovable Cloud) com Realtime + estoque atômico.
// Mantém a mesma API consumida pelo app:
//   useMenu() => { items, addItem, updateItem, removeItem, toggleSoldOut, setStock, decrementStock, resetToDefaults }
// Imagens: se a linha do banco não tem image, usamos o asset local do SEED por id.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MENU as SEED, type MenuItem } from "./menu";

export type EditableMenuItem = MenuItem & {
  soldOut?: boolean;
  /** Estoque disponível hoje. `undefined` = sem controle (ilimitado). */
  stock?: number;
};

type DbRow = {
  id: string;
  name: string;
  price: number | string;
  category: "burger" | "side" | "drink";
  emoji: string;
  image: string | null;
  description: string | null;
  sold_out: boolean;
  stock: number | null;
  sort_order: number;
  badges: string[] | null;
  prep_minutes: number | null;
};

const SEED_IMAGE_BY_ID = new Map(SEED.map((m) => [m.id, m.image]));

function rowToItem(r: DbRow): EditableMenuItem {
  return {
    id: r.id,
    name: r.name,
    price: typeof r.price === "string" ? parseFloat(r.price) : r.price,
    category: r.category,
    emoji: r.emoji,
    image: r.image && r.image.length > 0 ? r.image : (SEED_IMAGE_BY_ID.get(r.id) ?? ""),
    description: r.description ?? undefined,
    soldOut: r.sold_out,
    stock: r.stock ?? undefined,
    badges: r.badges ?? [],
    prepMinutes: r.prep_minutes ?? undefined,
  };
}

// ===== Cache compartilhado entre hooks/abas =====
let cache: EditableMenuItem[] = SEED;
const listeners = new Set<(items: EditableMenuItem[]) => void>();
let initialized = false;
let channel: ReturnType<typeof supabase.channel> | null = null;

function notify() {
  for (const fn of listeners) fn(cache);
}

async function fetchAll() {
  const { data, error } = await supabase
    .from("menu_items")
    .select("id,name,price,category,emoji,image,description,sold_out,stock,sort_order,badges,prep_minutes")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[menu] fetch failed", error);
    return;
  }
  cache = (data as unknown as DbRow[]).map(rowToItem);
  notify();
}

function ensureStreaming() {
  if (initialized) return;
  initialized = true;
  void fetchAll();
  channel = supabase
    .channel("menu-stream")
    .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => {
      void fetchAll();
    })
    .subscribe();
}

function uid() {
  return "m_" + Math.random().toString(36).slice(2, 9);
}

function itemToInsert(data: Omit<EditableMenuItem, "id">, id?: string) {
  return {
    id: id ?? uid(),
    name: data.name,
    price: data.price,
    category: data.category,
    emoji: data.emoji,
    image: data.image ?? "",
    description: data.description ?? null,
    sold_out: data.soldOut ?? false,
    stock: data.stock ?? null,
    sort_order: cache.length + 1,
    badges: data.badges ?? [],
    prep_minutes: data.prepMinutes ?? null,
  };
}

export function useMenu() {
  const [items, setItems] = useState<EditableMenuItem[]>(cache);

  useEffect(() => {
    ensureStreaming();
    const fn = (it: EditableMenuItem[]) => setItems(it);
    listeners.add(fn);
    setItems(cache);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const addItem = useCallback(async (data: Omit<EditableMenuItem, "id">) => {
    const row = itemToInsert(data);
    const { error } = await supabase.from("menu_items").insert(row);
    if (error) {
      console.error("[menu] addItem failed", error);
      throw error;
    }
    return { ...data, id: row.id } as EditableMenuItem;
  }, []);

  const updateItem = useCallback(async (id: string, patch: Partial<EditableMenuItem>) => {
    const dbPatch: {
      name?: string;
      price?: number;
      category?: EditableMenuItem["category"];
      emoji?: string;
      image?: string;
      description?: string | null;
      sold_out?: boolean;
      stock?: number | null;
      badges?: string[];
      prep_minutes?: number | null;
    } = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.price !== undefined) dbPatch.price = patch.price;
    if (patch.category !== undefined) dbPatch.category = patch.category;
    if (patch.emoji !== undefined) dbPatch.emoji = patch.emoji;
    if (patch.image !== undefined) dbPatch.image = patch.image;
    if (patch.description !== undefined) dbPatch.description = patch.description ?? null;
    if (patch.soldOut !== undefined) dbPatch.sold_out = patch.soldOut;
    if (patch.stock !== undefined) dbPatch.stock = patch.stock ?? null;
    if (patch.badges !== undefined) dbPatch.badges = patch.badges ?? [];
    if (patch.prepMinutes !== undefined) dbPatch.prep_minutes = patch.prepMinutes ?? null;
    const { error } = await supabase.from("menu_items").update(dbPatch).eq("id", id);
    if (error) console.error("[menu] updateItem failed", error);
  }, []);

  const removeItem = useCallback(async (id: string) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) console.error("[menu] removeItem failed", error);
  }, []);

  const toggleSoldOut = useCallback(
    async (id: string) => {
      const cur = cache.find((m) => m.id === id);
      if (!cur) return;
      await updateItem(id, { soldOut: !cur.soldOut });
    },
    [updateItem],
  );

  const setStock = useCallback(
    async (id: string, stock: number | undefined) => {
      const patch: Partial<EditableMenuItem> = { stock };
      if (stock !== undefined) patch.soldOut = stock <= 0;
      await updateItem(id, patch);
    },
    [updateItem],
  );

  /** Estoque é baixado automaticamente pelo backend quando o pedido é criado. */
  const decrementStock = useCallback(async (sold: { menuId: string; quantity: number }[]) => {
    void sold;
  }, []);

  /** Restaura cardápio padrão: apaga tudo e re-insere o SEED. (admin) */
  const resetToDefaults = useCallback(async () => {
    const { error: delErr } = await supabase.from("menu_items").delete().neq("id", "__never__");
    if (delErr) {
      console.error("[menu] reset delete failed", delErr);
      return;
    }
    const rows = SEED.map((m, i) => ({
      id: m.id,
      name: m.name,
      price: m.price,
      category: m.category,
      emoji: m.emoji,
      image: "",
      description: m.description ?? null,
      sold_out: false,
      stock: null,
      sort_order: i + 1,
      badges: [],
      prep_minutes: null,
    }));
    const { error } = await supabase.from("menu_items").insert(rows);
    if (error) console.error("[menu] reset insert failed", error);
  }, []);

  return {
    items,
    addItem,
    updateItem,
    removeItem,
    toggleSoldOut,
    setStock,
    decrementStock,
    resetToDefaults,
  };
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
    initialized = false;
  });
}
