import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useMenu, type EditableMenuItem } from "@/lib/menu-store";
import { MENU as SEED } from "@/lib/menu";
import { TableQRGenerator } from "@/components/TableQRGenerator";
import { EndOfDayCard } from "@/components/EndOfDayCard";
import { StaffGate } from "@/components/StaffGate";
import { PromosAdmin } from "@/components/PromosAdmin";
import { TableHeatmap } from "@/components/TableHeatmap";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Cardápio" },
      { name: "description", content: "Painel administrativo do cardápio da Top Burguer." },
    ],
  }),
  component: () => (
    <StaffGate allow={["admin"]} title="Administração">
      <AdminPage />
    </StaffGate>
  ),
});

type FormState = {
  id?: string;
  name: string;
  price: string;
  category: EditableMenuItem["category"];
  emoji: string;
  description: string;
  image: string;
};

const EMPTY: FormState = { name: "", price: "", category: "burger", emoji: "🍔", description: "", image: "" };

const CATS: { key: EditableMenuItem["category"]; label: string; emoji: string }[] = [
  { key: "burger", label: "Hambúrgueres", emoji: "🍔" },
  { key: "side", label: "Acompanhamentos", emoji: "🍟" },
  { key: "drink", label: "Bebidas", emoji: "🥤" },
];

// Fallback de imagem para itens novos (sem upload por enquanto)
const DEFAULT_IMG = SEED[0].image;

function AdminPage() {
  const { items, addItem, updateItem, removeItem, toggleSoldOut, setStock, resetToDefaults } = useMenu();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editing, setEditing] = useState(false);

  const startEdit = (m: EditableMenuItem) => {
    setForm({
      id: m.id,
      name: m.name,
      price: String(m.price),
      category: m.category,
      emoji: m.emoji,
      description: m.description ?? "",
      image: m.image,
    });
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancel = () => { setForm(EMPTY); setEditing(false); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(form.price.replace(",", "."));
    if (!form.name.trim()) return toast.error("Informe o nome");
    if (!Number.isFinite(price) || price <= 0) return toast.error("Preço inválido");
    const payload = {
      name: form.name.trim().slice(0, 60),
      price: Math.round(price * 100) / 100,
      category: form.category,
      emoji: form.emoji || "🍴",
      description: form.description.trim().slice(0, 140) || undefined,
      image: form.image.trim() || DEFAULT_IMG,
    };
    if (editing && form.id) {
      updateItem(form.id, payload);
      toast.success("Item atualizado");
    } else {
      addItem(payload);
      toast.success("Item adicionado");
    }
    cancel();
  };

  const reset = () => {
    if (!confirm("Restaurar o cardápio padrão? Suas alterações serão perdidas.")) return;
    resetToDefaults();
    cancel();
    toast.success("Cardápio restaurado");
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="bg-gradient-night text-white">
        <div className="mx-auto max-w-6xl px-4 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <div className="w-8 h-8 rounded-lg bg-gradient-ember grid place-items-center text-sm">T</div>
            Top Burguer · Admin
          </Link>
          <div className="flex gap-3 text-xs">
            <Link to="/order" className="text-amber-warm hover:underline">Pedido</Link>
            <Link to="/kitchen" className="text-amber-warm hover:underline">Cozinha</Link>
            <Link to="/dashboard" className="text-amber-warm hover:underline">Dashboard</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        <EndOfDayCard />
        <TableQRGenerator />



        <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <form onSubmit={submit} className="rounded-3xl bg-card border border-border p-5 shadow-card-soft space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-lg">{editing ? "✏️ Editar item" : "➕ Novo item"}</h2>
              {editing && (
                <button type="button" onClick={cancel} className="text-xs text-muted-foreground hover:text-foreground">
                  Cancelar
                </button>
              )}
            </div>

            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Emoji</label>
                <input
                  value={form.emoji}
                  onChange={(e) => setForm({ ...form, emoji: e.target.value.slice(0, 2) })}
                  className="w-full text-center text-2xl px-2 py-2.5 rounded-xl border border-border bg-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Nome</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={60}
                  placeholder="Ex: X-Tudo"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Preço (R$)</label>
                <input
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^\d.,]/g, "") })}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Categoria</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as EditableMenuItem["category"] })}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background"
                >
                  {CATS.map((c) => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Descrição (opcional)</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                maxLength={140}
                placeholder="Ex: Pão brioche, blend 160g, queijo…"
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">URL da imagem (opcional)</label>
              <input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder="https://… (deixe em branco para imagem padrão)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background"
              />
              {form.image && (
                <img src={form.image} alt="" className="mt-2 w-full aspect-[4/3] object-cover rounded-xl border border-border" onError={(e) => (e.currentTarget.style.display = "none")} />
              )}
            </div>

            <button className="w-full py-3 rounded-2xl bg-gradient-ember text-ember-foreground font-bold shadow-ember">
              {editing ? "Salvar alterações" : "Adicionar ao cardápio"}
            </button>

            <button
              type="button"
              onClick={reset}
              className="w-full py-2 text-xs rounded-xl text-muted-foreground hover:bg-muted transition"
            >
              ↺ Restaurar cardápio padrão
            </button>
          </form>
        </aside>

        {/* List */}
        <section className="space-y-8">
          {CATS.map((cat) => {
            const list = items.filter((m) => m.category === cat.key);
            return (
              <div key={cat.key}>
                <h2 className="font-black text-lg mb-3 flex items-center gap-2">
                  <span className="text-2xl">{cat.emoji}</span> {cat.label}
                  <span className="text-xs font-normal text-muted-foreground">({list.length})</span>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <AnimatePresence>
                    {list.map((m) => (
                      <motion.div
                        key={m.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`rounded-2xl border bg-card overflow-hidden shadow-card-soft ${
                          m.soldOut ? "border-red-500/40 opacity-60" : "border-border"
                        }`}
                      >
                        <div className="aspect-[5/3] bg-muted relative">
                          <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                          {m.soldOut && (
                            <div className="absolute inset-0 bg-black/60 grid place-items-center">
                              <span className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-black uppercase tracking-widest">Esgotado</span>
                            </div>
                          )}
                          {!m.soldOut && typeof m.stock === "number" && m.stock <= 5 && m.stock > 0 && (
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-warm text-charcoal text-[10px] font-black uppercase tracking-wider shadow-md animate-pulse">
                              ⚠ Restam {m.stock}
                            </div>
                          )}
                          {typeof m.stock === "number" && m.stock > 5 && (
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold uppercase tracking-wider">
                              📦 {m.stock} em estoque
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-bold truncate">{m.emoji} {m.name}</div>
                              {m.description && (
                                <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{m.description}</div>
                              )}
                            </div>
                            <div className="text-ember font-black shrink-0">R$ {m.price.toFixed(2)}</div>
                          </div>
                          {/* Controle de estoque inline */}
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <label className="text-muted-foreground shrink-0">Estoque:</label>
                            <input
                              type="number"
                              min={0}
                              max={999}
                              value={typeof m.stock === "number" ? m.stock : ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                setStock(m.id, v === "" ? undefined : Math.max(0, Math.min(999, parseInt(v, 10) || 0)));
                              }}
                              placeholder="∞"
                              className="w-16 px-2 py-1 rounded-md border border-border bg-background text-center tabular-nums"
                            />
                            {typeof m.stock === "number" && (
                              <button
                                onClick={() => setStock(m.id, undefined)}
                                className="text-[10px] text-muted-foreground hover:text-foreground underline"
                                title="Voltar para ilimitado"
                              >
                                ∞
                              </button>
                            )}
                          </div>
                          <div className="mt-2 flex gap-1.5">
                            <button
                              onClick={() => startEdit(m)}
                              className="flex-1 py-1.5 text-xs rounded-lg bg-muted hover:bg-secondary font-semibold"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => toggleSoldOut(m.id)}
                              className={`flex-1 py-1.5 text-xs rounded-lg font-semibold ${
                                m.soldOut
                                  ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
                                  : "bg-amber-warm/15 text-amber-warm hover:bg-amber-warm/25"
                              }`}
                            >
                              {m.soldOut ? "↻ Repor" : "⊘ Esgotar"}
                            </button>
                            <button
                              onClick={() => {
                                if (!confirm(`Excluir "${m.name}"?`)) return;
                                removeItem(m.id);
                                toast.success("Item removido");
                              }}
                              className="px-2 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                              title="Excluir"
                            >
                              🗑
                            </button>
                          </div>
                        </div>

                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {list.length === 0 && (
                    <div className="sm:col-span-2 text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-2xl">
                      Nenhum item nesta categoria.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
        </div>
      </div>
    </main>
  );
}
