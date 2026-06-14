// Comanda eletrônica da mesa: agrega todos os pedidos do dia para uma mesa
// e oferece dividir a conta entre N pessoas (com gorjeta opcional).
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { useOrders, type Order } from "@/lib/orders-store";
import { useBranding } from "@/lib/branding";

const search = z.object({
  n: z.coerce.number().int().positive().max(999).optional().catch(undefined),
});

export const Route = createFileRoute("/mesa")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Comanda da mesa — Top Burguer" },
      { name: "description", content: "Acompanhe a comanda da sua mesa e divida a conta." },
    ],
  }),
  component: MesaPage,
});

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function MesaPage() {
  const { n } = useSearch({ from: "/mesa" });
  const navigate = useNavigate({ from: "/mesa" });
  const { orders } = useOrders();
  const { branding } = useBranding();
  const [input, setInput] = useState(n ? String(n) : "");
  const [people, setPeople] = useState(2);
  const [tipPct, setTipPct] = useState(10);
  const [splitOpen, setSplitOpen] = useState(false);

  const tabOrders = useMemo<Order[]>(() => {
    if (!n) return [];
    const since = startOfToday();
    return orders
      .filter((o) => o.tableNumber === n && o.createdAt >= since)
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [orders, n]);

  const subtotal = tabOrders.reduce((s, o) => s + o.total, 0);
  const totalItems = tabOrders.reduce(
    (s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0),
    0
  );
  const tipAmount = Math.round(((subtotal * tipPct) / 100) * 100) / 100;
  const grandTotal = subtotal + tipAmount;
  const perPerson = people > 0 ? grandTotal / people : grandTotal;

  const statusCounts = useMemo(() => {
    const c = { pending: 0, preparing: 0, done: 0 };
    for (const o of tabOrders) c[o.status]++;
    return c;
  }, [tabOrders]);

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-gradient-night text-white shadow-lg">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-ember grid place-items-center font-black shadow-ember">
              {branding.emoji}
            </div>
            <div>
              <div className="font-black leading-none">{branding.name}</div>
              <div className="text-[10px] text-amber-warm uppercase tracking-widest">
                Comanda da mesa
              </div>
            </div>
          </Link>
          {n && (
            <Link
              to="/order"
              search={{ mesa: n }}
              className="px-3 py-1.5 rounded-xl bg-amber-warm text-charcoal text-xs font-black"
            >
              + Pedir mais
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Seletor de mesa */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const num = parseInt(input, 10);
            if (Number.isFinite(num) && num > 0) navigate({ search: { n: num } });
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/\D/g, "").slice(0, 3))}
            inputMode="numeric"
            placeholder="Nº da mesa"
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-card focus:border-ember focus:outline-none font-semibold text-lg"
          />
          <button className="px-5 py-3 rounded-xl bg-gradient-ember text-ember-foreground font-bold shadow-ember">
            Abrir
          </button>
        </form>

        {!n && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-6xl mb-3">🪑</div>
            <p>Informe o número da mesa para abrir a comanda.</p>
          </div>
        )}

        {n && tabOrders.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-3">📭</div>
            <p className="text-muted-foreground mb-4">
              Nenhum pedido hoje para a <strong>Mesa {n}</strong>.
            </p>
            <Link
              to="/order"
              search={{ mesa: n }}
              className="inline-block px-5 py-3 rounded-xl bg-gradient-ember text-ember-foreground font-bold shadow-ember"
            >
              Fazer 1º pedido
            </Link>
          </div>
        )}

        {n && tabOrders.length > 0 && (
          <>
            {/* Header da comanda */}
            <div className="rounded-3xl bg-gradient-night text-white p-6 shadow-card-soft relative overflow-hidden">
              <div className="absolute inset-0 bg-grain" />
              <div className="relative">
                <div className="text-xs uppercase tracking-widest text-amber-warm font-bold">
                  Comanda aberta
                </div>
                <div className="text-5xl font-black mt-1">Mesa {n}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Chip label={`${tabOrders.length} pedido${tabOrders.length === 1 ? "" : "s"}`} />
                  <Chip label={`${totalItems} ${totalItems === 1 ? "item" : "itens"}`} />
                  {statusCounts.pending > 0 && (
                    <Chip label={`⏳ ${statusCounts.pending} na fila`} tone="warn" />
                  )}
                  {statusCounts.preparing > 0 && (
                    <Chip label={`🔥 ${statusCounts.preparing} preparando`} tone="warn" />
                  )}
                  {statusCounts.done > 0 && (
                    <Chip label={`✅ ${statusCounts.done} pronto${statusCounts.done === 1 ? "" : "s"}`} tone="ok" />
                  )}
                </div>
                <div className="mt-5 flex items-end justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-[10px] uppercase text-white/60 tracking-widest">
                      Total da comanda
                    </div>
                    <div className="text-4xl font-black text-amber-warm tabular-nums">
                      R$ {subtotal.toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => setSplitOpen(true)}
                    className="px-5 py-3 rounded-2xl bg-amber-warm text-charcoal font-black shadow-tv-glow hover:scale-[1.02] transition"
                  >
                    💸 Dividir a conta
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de pedidos */}
            <div className="space-y-3">
              {tabOrders.map((o, idx) => (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="rounded-2xl bg-card border border-border p-4 shadow-card-soft"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded-md bg-ember/10 text-ember text-xs font-black">
                        #{o.number}
                      </span>
                      <span className="text-sm truncate">{o.customer}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <span className="font-black text-ember tabular-nums">
                      R$ {o.total.toFixed(2)}
                    </span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5 pl-1">
                    {o.items.map((i) => (
                      <li key={i.menuId} className="truncate">
                        <span className="font-bold text-foreground">{i.quantity}×</span> {i.emoji}{" "}
                        {i.name}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/status"
                    search={{ n: o.number }}
                    className="mt-2 inline-block text-[11px] text-ember hover:underline font-bold"
                  >
                    Acompanhar →
                  </Link>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {splitOpen && n && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 grid place-items-end sm:place-items-center p-0 sm:p-4"
            onClick={() => setSplitOpen(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", damping: 22, stiffness: 240 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl border border-border p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black flex items-center gap-2">
                  💸 Dividir a conta
                </h2>
                <button
                  onClick={() => setSplitOpen(false)}
                  className="w-9 h-9 rounded-full bg-muted hover:bg-secondary text-lg font-bold"
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Quantas pessoas?
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      onClick={() => setPeople((p) => Math.max(1, p - 1))}
                      className="w-12 h-12 rounded-2xl bg-muted hover:bg-secondary font-black text-xl"
                    >
                      −
                    </button>
                    <div className="flex-1 text-center text-4xl font-black text-ember tabular-nums">
                      {people}
                    </div>
                    <button
                      onClick={() => setPeople((p) => Math.min(50, p + 1))}
                      className="w-12 h-12 rounded-2xl bg-gradient-ember text-ember-foreground font-black text-xl shadow-ember"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Gorjeta (opcional)
                  </label>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {[0, 5, 10, 15].map((p) => (
                      <button
                        key={p}
                        onClick={() => setTipPct(p)}
                        className={`py-2 rounded-xl font-bold text-sm transition ${
                          tipPct === p
                            ? "bg-amber-warm text-charcoal shadow-tv-glow"
                            : "bg-muted hover:bg-secondary"
                        }`}
                      >
                        {p === 0 ? "Sem" : `${p}%`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-night text-white p-4 space-y-1">
                  <Row label="Subtotal" value={`R$ ${subtotal.toFixed(2)}`} />
                  {tipAmount > 0 && (
                    <Row
                      label={`Gorjeta (${tipPct}%)`}
                      value={`R$ ${tipAmount.toFixed(2)}`}
                      tone="amber"
                    />
                  )}
                  <div className="border-t border-white/15 my-2" />
                  <Row label="Total" value={`R$ ${grandTotal.toFixed(2)}`} big />
                  <div className="pt-3 mt-2 border-t border-white/15 text-center">
                    <div className="text-[10px] uppercase tracking-widest text-amber-warm">
                      Cada pessoa paga
                    </div>
                    <div className="text-4xl font-black text-amber-warm tabular-nums">
                      R$ {perPerson.toFixed(2)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const text = encodeURIComponent(
                      `Comanda Mesa ${n} · ${branding.name}\n` +
                        `Subtotal: R$ ${subtotal.toFixed(2)}\n` +
                        (tipAmount > 0 ? `Gorjeta (${tipPct}%): R$ ${tipAmount.toFixed(2)}\n` : "") +
                        `Total: R$ ${grandTotal.toFixed(2)}\n` +
                        `Dividido por ${people}: R$ ${perPerson.toFixed(2)} cada`
                    );
                    window.open(`https://wa.me/?text=${text}`, "_blank");
                  }}
                  className="w-full py-3 rounded-2xl bg-emerald-500 text-white font-black hover:brightness-110 transition flex items-center justify-center gap-2"
                >
                  📲 Compartilhar no WhatsApp
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Chip({ label, tone }: { label: string; tone?: "ok" | "warn" }) {
  const cls =
    tone === "ok"
      ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-100"
      : tone === "warn"
      ? "bg-amber-warm/20 border-amber-warm/40 text-amber-warm"
      : "bg-white/10 border-white/20 text-white/80";
  return (
    <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${cls}`}>{label}</span>
  );
}

function StatusBadge({ status }: { status: Order["status"] }) {
  const map = {
    pending: { label: "Recebido", cls: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
    preparing: { label: "Preparando", cls: "bg-amber-warm/15 text-amber-warm border-amber-warm/40" },
    done: { label: "Pronto", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  } as const;
  const s = map[status];
  return (
    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-black uppercase ${s.cls}`}>
      {s.label}
    </span>
  );
}

function Row({
  label,
  value,
  big,
  tone,
}: {
  label: string;
  value: string;
  big?: boolean;
  tone?: "amber";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`${big ? "font-bold" : "text-white/70 text-sm"}`}>{label}</span>
      <span
        className={`tabular-nums font-black ${big ? "text-xl" : "text-sm"} ${
          tone === "amber" ? "text-amber-warm" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
