import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { MENU, type MenuItem } from "@/lib/menu";
import { useOrders, type OrderItem } from "@/lib/orders-store";
import { formatPhoneBR, normalizePhoneBR } from "@/lib/whatsapp";

export const Route = createFileRoute("/order")({
  head: () => ({
    meta: [
      { title: "Pedido — Fast Order" },
      { name: "description", content: "Monte seu pedido na Top Burguer." },
    ],
  }),
  component: OrderPage,
});

const CATEGORIES: { key: MenuItem["category"]; label: string; emoji: string }[] = [
  { key: "burger", label: "Hambúrgueres", emoji: "🍔" },
  { key: "side", label: "Acompanhamentos", emoji: "🍟" },
  { key: "drink", label: "Bebidas", emoji: "🥤" },
];

type CartEntry = { qty: number; notes?: string };

function OrderPage() {
  const { addOrder } = useOrders();
  const navigate = useNavigate();
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeCat, setActiveCat] = useState<MenuItem["category"]>("burger");

  const items: OrderItem[] = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, e]) => e.qty > 0)
        .map(([id, e]) => {
          const m = MENU.find((x) => x.id === id)!;
          return { menuId: m.id, name: m.name, emoji: m.emoji, image: m.image, price: m.price, quantity: e.qty, notes: e.notes };
        }),
    [cart]
  );

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  const inc = (id: string) => setCart((c) => ({ ...c, [id]: { ...c[id], qty: (c[id]?.qty || 0) + 1 } }));
  const dec = (id: string) =>
    setCart((c) => ({ ...c, [id]: { ...c[id], qty: Math.max(0, (c[id]?.qty || 0) - 1) } }));
  const setItemNotes = (id: string, v: string) =>
    setCart((c) => ({ ...c, [id]: { ...c[id], qty: c[id]?.qty || 0, notes: v.slice(0, 80) } }));

  const submit = () => {
    if (!customer.trim()) return toast.error("Informe seu nome");
    if (customer.length > 50) return toast.error("Nome muito longo");
    if (items.length === 0) return toast.error("Adicione ao menos um item");
    if (notes.length > 300) return toast.error("Observações muito longas");

    setSubmitting(true);
    const order = addOrder({
      customer: customer.trim().slice(0, 50),
      items,
      notes: notes.trim().slice(0, 300) || undefined,
      total,
    });
    toast.success(`Pedido #${order.number} enviado! 🔥`);
    setCart({});
    setCustomer("");
    setNotes("");
    setTimeout(() => {
      setSubmitting(false);
      navigate({ to: "/status", search: { n: order.number } });
    }, 500);
  };

  return (
    <main className="min-h-screen bg-background pb-32 lg:pb-0">
      <header className="sticky top-0 z-20 bg-gradient-night text-white shadow-lg">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-ember grid place-items-center font-black shadow-ember">T</div>
            <div>
              <div className="font-black leading-none">Top Burguer</div>
              <div className="text-[10px] text-amber-warm uppercase tracking-widest">Faça seu pedido</div>
            </div>
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <Link to="/status" className="text-white/70 hover:text-amber-warm">Status</Link>
            <Link to="/kitchen" className="text-white/70 hover:text-amber-warm">Cozinha</Link>
          </div>
        </div>
        {/* Category tabs */}
        <div className="mx-auto max-w-6xl px-4 pb-3 flex gap-2 overflow-x-auto">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => {
                setActiveCat(c.key);
                document.getElementById(`cat-${c.key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeCat === c.key
                  ? "bg-amber-warm text-charcoal shadow-tv-glow"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-10">
          {CATEGORIES.map((cat) => (
            <div key={cat.key} id={`cat-${cat.key}`} className="scroll-mt-32">
              <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                <span className="text-2xl">{cat.emoji}</span> {cat.label}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {MENU.filter((m) => m.category === cat.key).map((m, i) => {
                  const entry = cart[m.id];
                  const q = entry?.qty || 0;
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      className={`group rounded-3xl bg-card border transition-all overflow-hidden flex flex-col ${
                        q > 0
                          ? "border-ember shadow-ember"
                          : "border-border hover:border-ember/40 hover:shadow-card-soft"
                      }`}
                    >
                      <div className="aspect-[4/3] bg-muted overflow-hidden relative">
                        <img
                          src={m.image}
                          alt={m.name}
                          loading="lazy"
                          width={512}
                          height={384}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {q > 0 && (
                          <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-ember text-ember-foreground grid place-items-center font-black shadow-ember"
                          >
                            {q}
                          </motion.div>
                        )}
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-bold text-card-foreground">{m.name}</h3>
                        {m.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.description}</p>
                        )}
                        <div className="mt-3 flex items-end justify-between gap-2">
                          <p className="text-ember font-black text-lg">R$ {m.price.toFixed(2)}</p>
                          <div className="flex items-center gap-1.5">
                            <AnimatePresence>
                              {q > 0 && (
                                <motion.button
                                  key="dec"
                                  initial={{ opacity: 0, scale: 0.5 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.5 }}
                                  onClick={() => dec(m.id)}
                                  className="w-9 h-9 rounded-full bg-muted hover:bg-secondary font-bold text-lg"
                                  aria-label="Remover"
                                >
                                  −
                                </motion.button>
                              )}
                            </AnimatePresence>
                            {q > 0 && <span className="w-6 text-center font-bold">{q}</span>}
                            <button
                              onClick={() => inc(m.id)}
                              className="w-9 h-9 rounded-full bg-gradient-ember text-ember-foreground hover:scale-110 font-bold transition-transform active:scale-90 shadow-ember"
                              aria-label="Adicionar"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        {q > 0 && (
                          <motion.input
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            value={entry?.notes || ""}
                            onChange={(e) => setItemNotes(m.id, e.target.value)}
                            maxLength={80}
                            placeholder="Obs: sem cebola, ponto…"
                            className="mt-3 w-full px-3 py-1.5 text-xs rounded-lg border border-border focus:border-ember focus:outline-none bg-background"
                          />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* Sidebar cart (desktop) */}
        <aside className="hidden lg:block lg:sticky lg:top-32 lg:self-start">
          <CartCard
            customer={customer} setCustomer={setCustomer}
            notes={notes} setNotes={setNotes}
            items={items} total={total} submitting={submitting} onSubmit={submit}
          />
        </aside>
      </div>

      {/* Floating cart bar (mobile) */}
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.div
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            className="lg:hidden fixed bottom-4 left-4 right-4 z-30"
          >
            <details className="rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
              <summary className="list-none cursor-pointer p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl bg-gradient-ember grid place-items-center text-ember-foreground font-black shadow-ember">
                    🛒
                    <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-warm text-charcoal text-xs grid place-items-center font-black">
                      {itemCount}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="font-black text-ember text-lg">R$ {total.toFixed(2)}</div>
                  </div>
                </div>
                <span className="px-4 py-2 rounded-xl bg-gradient-ember text-ember-foreground font-bold text-sm">Ver pedido</span>
              </summary>
              <div className="p-4 pt-0 max-h-[60vh] overflow-y-auto">
                <CartCard
                  customer={customer} setCustomer={setCustomer}
                  notes={notes} setNotes={setNotes}
                  items={items} total={total} submitting={submitting} onSubmit={submit}
                  embedded
                />
              </div>
            </details>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function CartCard({
  customer, setCustomer, notes, setNotes, items, total, submitting, onSubmit, embedded,
}: {
  customer: string; setCustomer: (s: string) => void;
  notes: string; setNotes: (s: string) => void;
  items: OrderItem[]; total: number; submitting: boolean; onSubmit: () => void;
  embedded?: boolean;
}) {
  return (
    <div className={embedded ? "" : "rounded-3xl bg-card border border-border p-5 shadow-card-soft"}>
      {!embedded && <h3 className="font-black text-lg mb-4">Seu pedido</h3>}

      <label className="block text-xs font-medium text-muted-foreground mb-1">Nome</label>
      <input
        value={customer}
        onChange={(e) => setCustomer(e.target.value)}
        maxLength={50}
        placeholder="Como te chamamos?"
        className="w-full px-3 py-2.5 rounded-xl border border-border focus:border-ember focus:outline-none mb-3 bg-background"
      />

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground italic py-4 text-center">Carrinho vazio</p>
        )}
        <AnimatePresence initial={false}>
          {items.map((i) => (
            <motion.div
              key={i.menuId}
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-2 text-sm"
            >
              <img src={i.image} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="truncate"><span className="font-bold text-ember">{i.quantity}×</span> {i.name}</div>
                {i.notes && <div className="text-[10px] text-amber-warm truncate">📝 {i.notes}</div>}
              </div>
              <span className="font-semibold">R$ {(i.price * i.quantity).toFixed(2)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <label className="block text-xs font-medium text-muted-foreground mt-4 mb-1">Observações gerais</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={300}
        rows={2}
        placeholder="Ex: para viagem, mesa 5…"
        className="w-full px-3 py-2 rounded-xl border border-border focus:border-ember focus:outline-none text-sm bg-background"
      />

      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <span className="text-muted-foreground">Total</span>
        <span className="text-2xl font-black text-ember">R$ {total.toFixed(2)}</span>
      </div>

      <button
        onClick={onSubmit}
        disabled={submitting || items.length === 0}
        className="mt-4 w-full py-3.5 rounded-2xl bg-gradient-ember text-ember-foreground font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-ember"
      >
        {submitting ? "Enviando…" : "🔥 Enviar para a cozinha"}
      </button>
    </div>
  );
}
