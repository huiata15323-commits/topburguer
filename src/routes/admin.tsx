import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useMenu, type EditableMenuItem } from "@/lib/menu-store";
import { MENU as SEED } from "@/lib/menu";
import { TableQRGenerator } from "@/components/TableQRGenerator";
import { EndOfDayCard } from "@/components/EndOfDayCard";
import { StaffGate } from "@/components/StaffGate";
import { RoleGate } from "@/components/RoleGate";
import { PromosAdmin } from "@/components/PromosAdmin";
import { TableHeatmap } from "@/components/TableHeatmap";
import { BrandingAdmin } from "@/components/BrandingAdmin";
import { AdminHeroHeader } from "@/components/AdminHeroHeader";
import { StockInput } from "@/components/StockInput";
import { generateDishImage } from "@/lib/ai-image.functions";
import { supabase } from "@/integrations/supabase/client";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Faz upload de uma data-url (base64) para o bucket `menu-images` e devolve um Signed URL de 1 ano.
 *  Evita salvar base64 gigante no Postgres (que causava timeout no fetch do cardápio). */
async function uploadDataUrlToStorage(dataUrl: string, idHint = "item"): Promise<string> {
  const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error("Imagem inválida");
  const mime = match[1];
  const ext = mime.split("/")[1].replace("+xml", "").replace("jpeg", "jpg");
  const bin = atob(match[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const path = `${idHint}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error: upErr } = await supabase.storage.from("menu-images").upload(path, blob, {
    contentType: mime,
    upsert: true,
  });
  if (upErr) throw upErr;
  const { data, error } = await supabase.storage.from("menu-images").createSignedUrl(path, ONE_YEAR_SECONDS);
  if (error || !data?.signedUrl) throw error ?? new Error("Falha ao assinar URL");
  return data.signedUrl;
}


export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Cardápio" },
      { name: "description", content: "Painel administrativo do cardápio da Top Burguer." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <RoleGate roles={["admin"]}>
      <StaffGate area="admin" allow={["admin"]} title="Administração">
        <AdminPage />
      </StaffGate>
    </RoleGate>
  ),
});

type AiStyle = "premium" | "rustic" | "minimal" | "neon" | "american" | "cartoon" | "gourmet" | "dark" | "topview" | "closeup" | "streetfood" | "watercolor" | "vintage" | "japanese" | "bbq" | "fresh";
type FormState = {
  id?: string;
  name: string;
  price: string;
  category: EditableMenuItem["category"];
  emoji: string;
  description: string;
  image: string;
  aiStyle: AiStyle;
  badges: string[];
  prepMinutes: string;
};

const EMPTY: FormState = { name: "", price: "", category: "burger", emoji: "🍔", description: "", image: "", aiStyle: "premium", badges: [], prepMinutes: "" };

// Quick emoji presets para o form de item
const EMOJI_QUICK = [
  "🍔","🍟","🌭","🥪","🌮","🌯","🥙","🥗",
  "🍕","🥩","🍗","🥓","🧀","🍣","🍱","🍛",
  "🍜","🍝","🍤","🍲","🥘","🍚","🍙","🍢",
  "🥞","🧇","🍳","🥐","🥖","🥯","🍞","🧈",
  "🍰","🧁","🍮","🍩","🍪","🍫","🍬","🍦",
  "🥤","🧋","☕","🍺","🍻","🍷","🥂","🍹",
];

// Extrai o primeiro grafema (emoji completo, incluindo ZWJ e modificadores)
function firstGrapheme(input: string): string {
  if (!input) return "";
  // Usa Intl.Segmenter quando disponível para suportar emojis compostos (👨‍🍳, 🏷️, 🇺🇸…)
  try {
    const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
    if (Seg) {
      const seg = new Seg(undefined, { granularity: "grapheme" });
      const it = seg.segment(input)[Symbol.iterator]().next();
      return it.done ? "" : (it.value as { segment: string }).segment;
    }
  } catch { /* fallback abaixo */ }
  // Fallback: pega um code point (não cobre ZWJ, mas evita cortar surrogate pair)
  const arr = Array.from(input);
  return arr[0] ?? "";
}

const BADGE_OPTIONS = [
  { key: "novo", label: "Novo", emoji: "✨", color: "bg-emerald-500" },
  { key: "promo", label: "Promoção", emoji: "🏷️", color: "bg-red-500" },
  { key: "picante", label: "Picante", emoji: "🌶️", color: "bg-orange-500" },
  { key: "vegano", label: "Vegano", emoji: "🌱", color: "bg-green-600" },
  { key: "vegetariano", label: "Vegetariano", emoji: "🥬", color: "bg-lime-600" },
  { key: "sem-gluten", label: "Sem Glúten", emoji: "🌾", color: "bg-amber-600" },
  { key: "popular", label: "Mais Pedido", emoji: "🔥", color: "bg-rose-500" },
  { key: "chef", label: "Escolha do Chef", emoji: "👨‍🍳", color: "bg-violet-500" },
  { key: "premium", label: "Premium", emoji: "👑", color: "bg-amber-500" },
  { key: "kids", label: "Infantil", emoji: "🧸", color: "bg-pink-500" },
];

const AI_STYLES: { key: AiStyle; label: string; emoji: string }[] = [
  { key: "premium", label: "Premium", emoji: "🔥" },
  { key: "gourmet", label: "Gourmet", emoji: "⭐" },
  { key: "rustic", label: "Rústico", emoji: "🪵" },
  { key: "minimal", label: "Minimal", emoji: "⚪" },
  { key: "dark", label: "Dark & Moody", emoji: "🌑" },
  { key: "topview", label: "Top View", emoji: "🔽" },
  { key: "closeup", label: "Close-up", emoji: "🔍" },
  { key: "bbq", label: "Churrasco", emoji: "🔥" },
  { key: "fresh", label: "Fresh", emoji: "🥗" },
  { key: "streetfood", label: "Street Food", emoji: "🚚" },
  { key: "neon", label: "Neon", emoji: "💜" },
  { key: "american", label: "Diner US", emoji: "🇺🇸" },
  { key: "japanese", label: "Japonês", emoji: "🎌" },
  { key: "vintage", label: "Vintage", emoji: "📷" },
  { key: "watercolor", label: "Aquarela", emoji: "🎨" },
  { key: "cartoon", label: "Cartoon", emoji: "✏️" },
];

const CATS: { key: EditableMenuItem["category"]; label: string; emoji: string }[] = [
  { key: "burger", label: "Hambúrgueres", emoji: "🍔" },
  { key: "side", label: "Acompanhamentos", emoji: "🍟" },
  { key: "drink", label: "Bebidas", emoji: "🥤" },
];

// Fallback de imagem para itens novos (sem upload por enquanto)
const DEFAULT_IMG = SEED[0].image;

function AdminPage() {
  const { items, isLoading: menuLoading, addItem, updateItem, removeItem, toggleSoldOut, setStock, resetToDefaults } = useMenu();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [generatingImg, setGeneratingImg] = useState(false);
  const callGenImage = useServerFn(generateDishImage);

  const handleGenerateImage = async () => {
    if (!form.name.trim()) {
      toast.error("Digite o nome do prato primeiro");
      return;
    }
    setGeneratingImg(true);
    const tid = toast.loading("🎨 IA gerando foto do prato…");
    try {
      const r = await callGenImage({
        data: { dishName: form.name.trim(), description: form.description.trim() || undefined, kind: "dish", style: form.aiStyle },
      });
      if (r.error === "rate_limit") toast.error("⏳ Muitas gerações — aguarde 1min", { id: tid });
      else if (r.error === "no_credits") toast.error("💳 Sem créditos de IA", { id: tid });
      else if (r.error || !r.dataUrl) toast.error("Falhou. Tente novamente.", { id: tid });
      else {
        setForm((f) => ({ ...f, image: r.dataUrl! }));
        toast.success("✨ Foto gerada!", { id: tid });
      }
    } finally {
      setGeneratingImg(false);
    }
  };

  const [regenId, setRegenId] = useState<string | null>(null);
  const regenerateForItem = async (m: EditableMenuItem) => {
    setRegenId(m.id);
    const tid = toast.loading(`🎨 Regerando foto de ${m.name}…`);
    try {
      const r = await callGenImage({
        data: { dishName: m.name, description: m.description || undefined, kind: "dish", style: form.aiStyle },
      });
      if (r.error === "rate_limit") toast.error("⏳ Aguarde 1min", { id: tid });
      else if (r.error === "no_credits") toast.error("💳 Sem créditos de IA", { id: tid });
      else if (r.error || !r.dataUrl) toast.error("Falhou. Tente novamente.", { id: tid });
      else { await updateItem(m.id, { image: r.dataUrl }); toast.success("✨ Nova foto!", { id: tid }); }
    } finally {
      setRegenId(null);
    }
  };

  const startEdit = (m: EditableMenuItem) => {
    setForm({
      id: m.id,
      name: m.name,
      price: String(m.price),
      category: m.category,
      emoji: m.emoji,
      description: m.description ?? "",
      image: m.image,
      aiStyle: form.aiStyle,
      badges: m.badges ?? [],
      prepMinutes: typeof m.prepMinutes === "number" ? String(m.prepMinutes) : "",
    });
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancel = () => { setForm(EMPTY); setEditing(false); };

  const toggleBadge = (key: string) => {
    setForm((f) => ({
      ...f,
      badges: f.badges.includes(key) ? f.badges.filter((b) => b !== key) : [...f.badges, key],
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(form.price.replace(",", "."));
    if (!form.name.trim()) return toast.error("Informe o nome");
    if (!Number.isFinite(price) || price <= 0) return toast.error("Preço inválido");
    const prep = form.prepMinutes.trim() === "" ? undefined : Math.max(1, Math.min(180, parseInt(form.prepMinutes, 10) || 0));
    const payload = {
      name: form.name.trim().slice(0, 60),
      price: Math.round(price * 100) / 100,
      category: form.category,
      emoji: form.emoji || "🍴",
      description: form.description.trim().slice(0, 600) || undefined,
      image: form.image.trim() || DEFAULT_IMG,
      badges: form.badges,
      prepMinutes: prep,
    };
    try {
      if (editing && form.id) {
        await updateItem(form.id, payload);
        toast.success("Item atualizado");
      } else {
        await addItem(payload);
        toast.success("Item adicionado");
      }
      cancel();
    } catch {
      toast.error("Não foi possível salvar o item");
    }
  };

  const reset = async () => {
    if (!confirm("Restaurar o cardápio padrão? Suas alterações serão perdidas.")) return;
    try {
      await resetToDefaults();
      cancel();
      toast.success("Cardápio restaurado");
    } catch {
      toast.error("Não foi possível restaurar o cardápio");
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <AdminHeroHeader title="Painel Administrativo" subtitle="Cardápio, identidade e operações" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        <BrandingAdmin />
        <EndOfDayCard />
        <PromosAdmin />
        <TableHeatmap />
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
                  onChange={(e) => setForm({ ...form, emoji: firstGrapheme(e.target.value) })}
                  onFocus={(e) => e.currentTarget.select()}
                  maxLength={8}
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

            <div className="flex flex-wrap gap-1.5 -mt-1">
              {EMOJI_QUICK.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setForm({ ...form, emoji: e })}
                  className={`text-xl w-9 h-9 grid place-items-center rounded-lg border transition ${
                    form.emoji === e
                      ? "border-ember bg-ember/15 ring-2 ring-ember/40"
                      : "border-border bg-background hover:border-ember/40"
                  }`}
                  aria-label={`Usar emoji ${e}`}
                >
                  {e}
                </button>
              ))}
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
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Descrição (opcional)</label>
                <span className="text-[10px] text-muted-foreground tabular-nums">{form.description.length}/600</span>
              </div>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 600) })}
                rows={5}
                maxLength={600}
                placeholder="Ex: Pão brioche artesanal, blend bovino 160g, queijo cheddar derretido, alface fresca, tomate, cebola caramelizada, molho especial da casa…"
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background resize-y min-h-[120px]"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Selos / etiquetas</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {BADGE_OPTIONS.map((b) => {
                  const on = form.badges.includes(b.key);
                  return (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => toggleBadge(b.key)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition ${
                        on
                          ? `${b.color} text-white border-transparent shadow-sm`
                          : "bg-background border-border text-muted-foreground hover:border-foreground/30"
                      }`}
                    >
                      {b.emoji} {b.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">⏱ Tempo de preparo (min)</label>
              <input
                type="number"
                min={1}
                max={180}
                value={form.prepMinutes}
                onChange={(e) => setForm({ ...form, prepMinutes: e.target.value.replace(/[^\d]/g, "") })}
                placeholder="Ex: 12"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Deixe vazio para usar o tempo médio do restaurante.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">Imagem do prato</label>
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={generatingImg || !form.name.trim()}
                  className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-sm hover:scale-105 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Gerar foto profissional do prato com IA"
                >
                  {generatingImg ? "🧠 Gerando…" : "✨ Gerar com IA"}
                </button>
              </div>
              <div className="mb-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Estilo visual da IA</div>
                <div className="flex flex-wrap gap-1">
                  {AI_STYLES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setForm({ ...form, aiStyle: s.key })}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${
                        form.aiStyle === s.key
                          ? "border-fuchsia-500 bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300"
                          : "border-border bg-background hover:border-fuchsia-400/40"
                      }`}
                    >
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                value={form.image.startsWith("data:") ? "" : form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder={form.image.startsWith("data:") ? "Imagem gerada por IA ✨" : "URL ou cole link da imagem"}
                disabled={form.image.startsWith("data:")}
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background disabled:opacity-60"
              />
              {form.image && (
                <div className="relative mt-2">
                  <img src={form.image} alt="" className="w-full aspect-[4/3] object-cover rounded-xl border border-border" onError={(e) => (e.currentTarget.style.display = "none")} />
                  {form.image.startsWith("data:") && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                      ✨ IA
                    </span>
                  )}
                </div>
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
          {menuLoading && (
            <div className="rounded-3xl border border-border bg-card p-5 shadow-card-soft">
              <div className="font-black">Carregando cardápio atualizado…</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-border overflow-hidden">
                    <div className="aspect-[5/3] bg-muted animate-pulse" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 w-2/3 rounded-full bg-muted animate-pulse" />
                      <div className="h-3 w-full rounded-full bg-muted animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!menuLoading && CATS.map((cat) => {
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
                            <StockInput
                              value={typeof m.stock === "number" ? m.stock : undefined}
                              onCommit={(v) => setStock(m.id, v)}
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
                              onClick={() => regenerateForItem(m)}
                              disabled={regenId === m.id}
                              className="px-2 py-1.5 text-xs rounded-lg bg-gradient-to-r from-violet-500/15 to-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 hover:from-violet-500/25 hover:to-fuchsia-500/25 disabled:opacity-50"
                              title="Regerar foto com IA usando o estilo selecionado no formulário"
                            >
                              {regenId === m.id ? "🧠" : "✨"}
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
