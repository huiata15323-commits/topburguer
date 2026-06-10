// Modo apresentador: gera pedidos sintéticos e progride status automaticamente.
// Ideal para o painel da TV "ganhar vida" mesmo sem clientes reais (banca vazia,
// demonstrações para professores, vídeos institucionais).
import type { EditableMenuItem } from "./menu-store";
import type { OrderItem } from "./orders-store";
import { supabase } from "@/integrations/supabase/client";

const FAKE_NAMES = [
  "Mariana", "Lucas", "Ana", "Pedro", "Carla", "Rafael", "Júlia", "Bruno",
  "Camila", "Diego", "Fernanda", "Gustavo", "Helena", "Igor", "Larissa", "Mateus",
];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function buildFakeItems(menu: EditableMenuItem[]): OrderItem[] {
  const usable = menu.filter((m) => !m.soldOut);
  if (usable.length === 0) return [];
  const n = 1 + Math.floor(Math.random() * 3);
  const picked = new Set<string>();
  const items: OrderItem[] = [];
  while (items.length < n && picked.size < usable.length) {
    const m = rand(usable);
    if (picked.has(m.id)) continue;
    picked.add(m.id);
    items.push({
      menuId: m.id,
      name: m.name,
      emoji: m.emoji,
      image: m.image,
      price: m.price,
      quantity: 1 + Math.floor(Math.random() * 2),
    });
  }
  return items;
}

export async function spawnFakeOrder(menu: EditableMenuItem[]): Promise<string | null> {
  const items = buildFakeItems(menu);
  if (items.length === 0) return null;
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer: `[demo] ${rand(FAKE_NAMES)}`,
      table_number: 1 + Math.floor(Math.random() * 12),
      items,
      total,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) {
    console.error("[demo] insert failed", error);
    return null;
  }
  const id = (data as { id: string }).id;
  // Progride o status automaticamente
  setTimeout(() => {
    void supabase.from("orders").update({ status: "preparing" }).eq("id", id);
  }, 4000 + Math.random() * 4000);
  setTimeout(() => {
    void supabase
      .from("orders")
      .update({ status: "done", done_at: new Date().toISOString() })
      .eq("id", id);
  }, 14000 + Math.random() * 8000);
  // Limpa o pedido fake após 60s pra não poluir o relatório
  setTimeout(() => {
    void supabase.from("orders").delete().eq("id", id);
  }, 60000);
  return id;
}
