import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrders, type Order } from "@/lib/orders-store";
import { z } from "zod";

const search = z.object({ n: z.coerce.number().int().positive().optional() });

export const Route = createFileRoute("/status")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Status do pedido — Top Burguer" },
      { name: "description", content: "Acompanhe seu pedido em tempo real." },
    ],
  }),
  component: StatusPage,
});

const STEPS = [
  { key: "pending", label: "Recebido", emoji: "📥", desc: "Seu pedido caiu na cozinha." },
  { key: "preparing", label: "Preparando", emoji: "🔥", desc: "Nossos chefs estão na chapa." },
  { key: "done", label: "Pronto!", emoji: "🎉", desc: "Vai lá retirar — fresquinho!" },
] as const;

function StatusPage() {
  const { n } = useSearch({ from: "/status" });
  const navigate = useNavigate({ from: "/status" });
  const { orders } = useOrders();
  const [input, setInput] = useState(n ? String(n) : "");

  const order: Order | undefined = useMemo(
    () => (n ? orders.find((o) => o.number === n) : undefined),
    [orders, n]
  );

  // Re-render every 5s for timer
  const [, force] = useState(0);
  useEffect(() => {
    const i = setInterval(() => force((x) => x + 1), 5000);
    return () => clearInterval(i);
  }, []);

  const stepIndex = order ? STEPS.findIndex((s) => s.key === order.status) : -1;

  return (
    <main className="min-h-screen bg-background">
      <header className="bg-gradient-night text-white">
        <div className="mx-auto max-w-3xl px-4 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <div className="w-8 h-8 rounded-lg bg-gradient-ember grid place-items-center text-sm">T</div>
            Top Burguer
          </Link>
          <Link to="/order" className="text-xs text-amber-warm hover:underline">Novo pedido</Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Lookup form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const num = parseInt(input, 10);
            if (Number.isFinite(num) && num > 0) navigate({ search: { n: num } });
          }}
          className="flex gap-2 mb-6"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="Nº do pedido"
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-card focus:border-ember focus:outline-none font-semibold text-lg"
          />
          <button className="px-5 py-3 rounded-xl bg-gradient-ember text-ember-foreground font-bold shadow-ember">
            Buscar
          </button>
        </form>

        <AnimatePresence mode="wait">
          {!n ? (
            <EmptyState key="empty" />
          ) : !order ? (
            <NotFound key="nf" n={n} />
          ) : (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Order header card */}
              <div className="rounded-3xl bg-gradient-night text-white p-6 shadow-card-soft overflow-hidden relative">
                <div className="absolute inset-0 bg-grain" />
                <div className="relative">
                  <div className="text-xs uppercase tracking-widest text-amber-warm font-bold">Pedido</div>
                  <div className="flex items-baseline gap-3 mt-1">
                    <div className="text-6xl font-black">#{order.number}</div>
                    <div className="text-white/60">{order.customer}</div>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm">
                    <span className="w-2 h-2 rounded-full bg-amber-warm animate-live" />
                    {STEPS[stepIndex]?.label ?? "Atualizando…"}
                  </div>
                </div>
              </div>

              {/* Progress steps */}
              <div className="rounded-3xl bg-card border border-border p-6 shadow-card-soft">
                <div className="space-y-4">
                  {STEPS.map((s, i) => {
                    const reached = i <= stepIndex;
                    const current = i === stepIndex;
                    return (
                      <motion.div
                        key={s.key}
                        initial={false}
                        animate={{ opacity: reached ? 1 : 0.4 }}
                        className="flex items-start gap-4"
                      >
                        <div className="relative">
                          <div
                            className={`w-12 h-12 rounded-2xl grid place-items-center text-2xl border-2 transition-all ${
                              reached
                                ? "bg-gradient-ember text-ember-foreground border-transparent shadow-ember"
                                : "bg-muted border-border"
                            }`}
                          >
                            {s.emoji}
                          </div>
                          {i < STEPS.length - 1 && (
                            <div
                              className={`absolute left-1/2 top-12 w-0.5 h-8 -translate-x-1/2 ${
                                i < stepIndex ? "bg-ember" : "bg-border"
                              }`}
                            />
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <div className="font-bold flex items-center gap-2">
                            {s.label}
                            {current && (
                              <span className="text-[10px] uppercase tracking-widest text-ember font-bold animate-live">
                                Agora
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{s.desc}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Items */}
              <div className="rounded-3xl bg-card border border-border p-6 shadow-card-soft">
                <h3 className="font-bold mb-4">Seu pedido</h3>
                <ul className="space-y-3">
                  {order.items.map((i) => (
                    <li key={i.menuId} className="flex items-center gap-3">
                      <img src={i.image} alt="" className="w-14 h-14 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">
                          {i.quantity}× {i.name}
                        </div>
                        {i.notes && (
                          <div className="text-xs text-amber-warm">📝 {i.notes}</div>
                        )}
                      </div>
                      <div className="font-bold text-ember">R$ {(i.price * i.quantity).toFixed(2)}</div>
                    </li>
                  ))}
                </ul>
                {order.notes && (
                  <div className="mt-4 text-sm bg-amber-warm/10 border border-amber-warm/30 rounded-xl p-3">
                    📝 {order.notes}
                  </div>
                )}
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-2xl font-black text-ember">R$ {order.total.toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="text-center py-16 text-muted-foreground"
    >
      <div className="text-6xl mb-4">🔍</div>
      <p>Digite o número do seu pedido para acompanhar.</p>
    </motion.div>
  );
}
function NotFound({ n }: { n: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="text-center py-16"
    >
      <div className="text-6xl mb-4">😕</div>
      <p className="text-muted-foreground">Pedido #{n} não encontrado.</p>
    </motion.div>
  );
}
