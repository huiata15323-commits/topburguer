// Cardápio na nuvem (Lovable Cloud) com Realtime + estoque atômico.
// Importante: nunca renderiza o SEED como estado inicial do cliente.
// O SEED existe apenas para imagem fallback e restauração admin; assim o cliente
// não vê o cardápio antigo por alguns segundos antes do cardápio real carregar.
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
  image?: string | null;
  description: string | null;
  sold_out: boolean;
  stock: number | null;
  sort_order: number;
  badges: string[] | null;
  prep_minutes: number | null;
};

type MenuStatus = "loading" | "ready" | "error";
type MenuSnapshot = { items: EditableMenuItem[]; status: MenuStatus; error: string | null };

const MENU_SELECT = "id,name,price,category,emoji,description,sold_out,stock,sort_order,badges,prep_minutes,image";
const MENU_FRESH_MS = 3_000;
const SEED_IMAGE_BY_ID = new Map(SEED.map((m) => [m.id, m.image]));

function rowToItem(r: DbRow): EditableMenuItem {
  const hasImageField = Object.prototype.hasOwnProperty.call(r, "image");
  const cachedImage = cache.find((m) => m.id === r.id)?.image;
  const fallbackImage = SEED_IMAGE_BY_ID.get(r.id) ?? "";
  const image = r.image && r.image.length > 0
    ? r.image
    : hasImageField
      ? fallbackImage
      : cachedImage || fallbackImage;
  return {
    id: r.id,
    name: r.name,
    price: typeof r.price === "string" ? parseFloat(r.price) : r.price,
    category: r.category,
    emoji: r.emoji,
    image,
    description: r.description ?? undefined,
    soldOut: r.sold_out,
    stock: r.stock ?? undefined,
    badges: r.badges ?? [],
    prepMinutes: r.prep_minutes ?? undefined,
  };
}

function sortItems(items: EditableMenuItem[]) {
  return [...items].sort((a, b) => {
    const ai = cacheOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bi = cacheOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return ai - bi || a.name.localeCompare(b.name, "pt-BR");
  });
}

// ===== Cache compartilhado entre hooks/abas =====
let cache: EditableMenuItem[] = [];
let status: MenuStatus = "loading";
let errorMessage: string | null = null;
let initialized = false;
let fetchPromise: Promise<void> | null = null;
let channel: ReturnType<typeof supabase.channel> | null = null;
let cacheOrder = new Map<string, number>();
let lastFetchedAt = 0;
const listeners = new Set<(snapshot: MenuSnapshot) => void>();

function getSnapshot(): MenuSnapshot {
  return { items: cache, status, error: errorMessage };
}

function notify() {
  const snapshot = getSnapshot();
  for (const fn of listeners) fn(snapshot);
}

function applyRows(rows: DbRow[]) {
  cacheOrder = new Map(rows.map((r) => [r.id, r.sort_order]));
  cache = rows.map(rowToItem);
  status = "ready";
  errorMessage = null;
  lastFetchedAt = Date.now();
  notify();
}

async function fetchAll({ hideDuringFetch = false }: { hideDuringFetch?: boolean } = {}) {
  if (hideDuringFetch && status !== "loading") {
    status = "loading";
    errorMessage = null;
    notify();
  }
  if (fetchPromise) return fetchPromise;
  fetchPromise = (async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select(MENU_BASE_SELECT)
      .order("sort_order", { ascending: true });
    if (error) {
      console.error("[menu] fetch failed", error);
      status = cache.length > 0 ? "ready" : "error";
      errorMessage = "Não foi possível carregar o cardápio atualizado.";
      notify();
      return;
    }
    applyRows(data as unknown as DbRow[]);
    void fetchImages();
  })().finally(() => {
    fetchPromise = null;
  });
  return fetchPromise;
}

async function fetchImages() {
  const { data, error } = await supabase
    .from("menu_items")
    .select(MENU_IMAGE_SELECT)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[menu] image fetch failed", error);
    return;
  }
  const imageById = new Map((data as unknown as Pick<DbRow, "id" | "image">[]).map((r) => [r.id, r.image ?? ""]));
  cache = cache.map((item) => {
    const image = imageById.get(item.id);
    return image && image.length > 0 ? { ...item, image } : item;
  });
  notify();
}

function applyRealtimePayload(payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) {
  if (payload.eventType === "DELETE") {
    const id = typeof payload.old?.id === "string" ? payload.old.id : undefined;
    if (!id) return void fetchAll();
    cacheOrder.delete(id);
    cache = cache.filter((m) => m.id !== id);
    status = "ready";
    errorMessage = null;
    lastFetchedAt = Date.now();
    notify();
    return;
  }
  if (!payload.new) return void fetchAll();
  upsertCached(payload.new as unknown as DbRow);
  lastFetchedAt = Date.now();
}

function ensureStreaming() {
  if (!initialized) {
    initialized = true;
    channel = supabase
      .channel("menu-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, (payload) => {
        applyRealtimePayload(payload as { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> });
      })
      .subscribe();
  }
  const stale = Date.now() - lastFetchedAt > MENU_FRESH_MS;
  if (stale) void fetchAll({ hideDuringFetch: true });
}

function uid() {
  return "m_" + Math.random().toString(36).slice(2, 9);
}

function itemToInsert(data: Omit<EditableMenuItem, "id">, id?: string) {
  const nextOrder = cache.length > 0 ? Math.max(...[...cacheOrder.values(), cache.length]) + 1 : 1;
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
    sort_order: nextOrder,
    badges: data.badges ?? [],
    prep_minutes: data.prepMinutes ?? null,
  };
}

function upsertCached(row: DbRow) {
  cacheOrder.set(row.id, row.sort_order);
  const item = rowToItem(row);
  cache = sortItems([item, ...cache.filter((m) => m.id !== item.id)]);
  status = "ready";
  errorMessage = null;
  notify();
}

export function useMenu() {
  const [snapshot, setSnapshot] = useState<MenuSnapshot>(getSnapshot);

  useEffect(() => {
    ensureStreaming();
    listeners.add(setSnapshot);
    setSnapshot(getSnapshot());
    return () => {
      listeners.delete(setSnapshot);
    };
  }, []);

  const addItem = useCallback(async (data: Omit<EditableMenuItem, "id">) => {
    const row = itemToInsert(data);
    const { data: inserted, error } = await supabase.from("menu_items").insert(row).select(MENU_SELECT).single();
    if (error) {
      console.error("[menu] addItem failed", error);
      throw error;
    }
    upsertCached(inserted as unknown as DbRow);
    return rowToItem(inserted as unknown as DbRow);
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
    if ("stock" in patch) dbPatch.stock = patch.stock ?? null;
    if (patch.badges !== undefined) dbPatch.badges = patch.badges ?? [];
    if (patch.prepMinutes !== undefined) dbPatch.prep_minutes = patch.prepMinutes ?? null;
    const { data, error } = await supabase.from("menu_items").update(dbPatch).eq("id", id).select(MENU_SELECT).single();
    if (error) {
      console.error("[menu] updateItem failed", error);
      throw error;
    }
    upsertCached(data as unknown as DbRow);
  }, []);

  const removeItem = useCallback(async (id: string) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) {
      console.error("[menu] removeItem failed", error);
      throw error;
    }
    cacheOrder.delete(id);
    cache = cache.filter((m) => m.id !== id);
    notify();
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
      throw delErr;
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
    const { data, error } = await supabase.from("menu_items").insert(rows).select(MENU_SELECT);
    if (error) {
      console.error("[menu] reset insert failed", error);
      throw error;
    }
    applyRows(data as unknown as DbRow[]);
  }, []);

  return {
    items: snapshot.items,
    isLoading: snapshot.status === "loading",
    isReady: snapshot.status === "ready",
    error: snapshot.error,
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
