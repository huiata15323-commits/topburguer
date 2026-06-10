import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { useOrders, type Order } from "@/lib/orders-store";
import {
  ensureServiceWorker,
  getPermission,
  notifyOrderReady,
  requestPermission,
  type PermissionState,
} from "@/lib/push-notify";
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
  const { orders, rateOrder, callWaiter, clearWaiterCall } = useOrders();
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

  // ===== Notificações automáticas (Web Push local) =====
  const [perm, setPerm] = useState<PermissionState>("default");
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setPerm(getPermission());
    if (getPermission() === "granted") void ensureServiceWorker();
  }, []);

  // Dispara notificação + confete automaticamente quando o pedido acompanhado vira "done"
  const confettiFiredRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!order) return;
    if (order.status !== "done") return;
    if (notifiedRef.current.has(order.id)) return;
    notifiedRef.current.add(order.id);
    if (perm === "granted") void notifyOrderReady(order.number);
    if (!confettiFiredRef.current.has(order.id)) {
      confettiFiredRef.current.add(order.id);
      const fire = (origin: { x: number; y: number }) => {
        confetti({
          particleCount: 80,
          spread: 75,
          startVelocity: 45,
          origin,
          colors: ["#ff7a1a", "#ffb347", "#ffd54f", "#fff7ed", "#10b981"],
          ticks: 220,
        });
      };
      fire({ x: 0.25, y: 0.4 });
      setTimeout(() => fire({ x: 0.75, y: 0.4 }), 200);
      setTimeout(() => fire({ x: 0.5, y: 0.3 }), 400);
    }
  }, [order?.status, order?.id, order?.number, perm]);

  const handleEnableNotifications = async () => {
    const res = await requestPermission();
    setPerm(res);
  };

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
                  <div className="flex items-baseline gap-3 mt-1 flex-wrap">
                    <div className="text-6xl font-black">#{order.number}</div>
                    <div className="text-white/60">{order.customer}</div>
                    {order.tableNumber && (
                      <span className="px-3 py-1 rounded-full bg-amber-warm text-charcoal text-sm font-black">
                        🪑 MESA {order.tableNumber}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm">
                    <span className="w-2 h-2 rounded-full bg-amber-warm animate-live" />
                    {STEPS[stepIndex]?.label ?? "Atualizando…"}
                  </div>
                </div>
              </div>

              {/* Banner de notificação automática */}
              {order.status !== "done" && perm !== "unsupported" && (
                <div
                  className={`rounded-2xl border p-4 flex items-center gap-3 ${
                    perm === "granted"
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : perm === "denied"
                      ? "border-red-500/30 bg-red-500/10"
                      : "border-amber-warm/40 bg-amber-warm/10"
                  }`}
                >
                  <div className="text-2xl">
                    {perm === "granted" ? "🔔" : perm === "denied" ? "🔕" : "📲"}
                  </div>
                  <div className="flex-1 text-sm">
                    {perm === "granted" ? (
                      <>
                        <div className="font-bold">Notificações ativas</div>
                        <div className="text-muted-foreground">
                          Avisaremos automaticamente quando seu pedido ficar pronto — mesmo com a tela bloqueada.
                        </div>
                      </>
                    ) : perm === "denied" ? (
                      <>
                        <div className="font-bold">Notificações bloqueadas</div>
                        <div className="text-muted-foreground">
                          Libere notificações para este site nas configurações do navegador para receber o aviso automático.
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-bold">Receba aviso automático quando ficar pronto</div>
                        <div className="text-muted-foreground">
                          Sem custo, sem app — direto no seu navegador.
                        </div>
                      </>
                    )}
                  </div>
                  {perm === "default" && (
                    <button
                      onClick={handleEnableNotifications}
                      className="shrink-0 px-4 py-2 rounded-xl bg-gradient-ember text-ember-foreground font-bold shadow-ember text-sm"
                    >
                      Ativar
                    </button>
                  )}
                </div>
              )}

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

              {/* Chamar atendente (apenas pedidos de mesa, ainda não retirados) */}
              {order.status !== "done" && order.tableNumber && (
                <WaiterCallCard
                  order={order}
                  onCall={async () => {
                    await callWaiter(order.id);
                    toast.success("Atendente avisado! 👋");
                  }}
                  onCancel={async () => {
                    await clearWaiterCall(order.id);
                    toast("Chamado cancelado");
                  }}
                />
              )}


              {/* Avaliação pós-retirada (somente quando pronto) */}
              {order.status === "done" && (
                <RatingCard
                  order={order}
                  onRate={(stars, review) => {
                    rateOrder(order.id, stars, review);
                    toast.success("Obrigado pela avaliação! ⭐");
                  }}
                />
              )}

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
                <Link
                  to="/receipt"
                  search={{ n: order.number }}
                  className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-charcoal text-white font-bold hover:brightness-110 transition"
                >
                  🧾 Ver recibo para retirada
                </Link>
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

function WaiterCallCard({
  order, onCall, onCancel,
}: { order: Order; onCall: () => void; onCancel: () => void }) {
  const called = !!order.waiterCalledAt;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border-2 p-5 flex items-center gap-4 ${
        called
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-amber-warm/30 bg-amber-warm/5"
      }`}
    >
      <div className="text-4xl">{called ? "✅" : "🙋"}</div>
      <div className="flex-1">
        <div className="font-black">
          {called ? "Atendente foi avisado" : "Precisa de ajuda na mesa?"}
        </div>
        <div className="text-xs text-muted-foreground">
          {called
            ? "Já está a caminho da sua mesa."
            : "Chame um atendente sem precisar levantar."}
        </div>
      </div>
      <button
        onClick={called ? onCancel : onCall}
        className={`shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
          called
            ? "bg-muted text-foreground hover:bg-secondary"
            : "bg-gradient-ember text-ember-foreground shadow-ember"
        }`}
      >
        {called ? "Cancelar" : "Chamar atendente"}
      </button>
    </motion.div>
  );
}

function RatingCard({ order, onRate }: { order: Order; onRate: (stars: number, review?: string) => void }) {
  const [hover, setHover] = useState(0);
  const [picked, setPicked] = useState(order.rating ?? 0);
  const [review, setReview] = useState(order.review ?? "");
  const submitted = !!order.rating;

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/30 p-6 text-center"
      >
        <div className="text-4xl mb-2">🙏</div>
        <h3 className="font-black text-lg">Avaliação enviada!</h3>
        <div className="mt-2 flex justify-center gap-1 text-3xl">
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className={s <= (order.rating ?? 0) ? "text-amber-warm" : "text-muted/40"}>★</span>
          ))}
        </div>
        {order.review && (
          <p className="mt-3 text-sm text-muted-foreground italic">"{order.review}"</p>
        )}
      </motion.div>
    );
  }

  const labels = ["", "Ruim", "Mais ou menos", "Bom", "Muito bom", "Excelente!"];
  const showing = hover || picked;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-card border-2 border-amber-warm/30 p-6 shadow-card-soft"
    >
      <h3 className="font-black text-lg flex items-center gap-2">
        <span className="text-2xl">⭐</span> Como foi sua experiência?
      </h3>
      <p className="text-sm text-muted-foreground mt-1">Sua opinião nos ajuda a melhorar.</p>

      <div className="flex justify-center gap-1 mt-4">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setPicked(s)}
            className={`text-5xl transition-all hover:scale-125 active:scale-110 ${
              s <= showing ? "text-amber-warm drop-shadow-[0_0_8px_rgba(255,167,38,0.5)]" : "text-muted/40 hover:text-amber-warm/60"
            }`}
            aria-label={`${s} estrelas`}
          >
            ★
          </button>
        ))}
      </div>
      <div className="text-center text-sm font-bold text-amber-warm mt-2 h-5">
        {showing > 0 ? labels[showing] : "Toque nas estrelas"}
      </div>

      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value.slice(0, 300))}
        rows={2}
        placeholder="Conte como foi (opcional)…"
        className="mt-4 w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:border-ember focus:outline-none resize-none"
      />

      <button
        onClick={() => picked > 0 && onRate(picked, review.trim() || undefined)}
        disabled={picked === 0}
        className="mt-3 w-full py-3 rounded-2xl bg-gradient-ember text-ember-foreground font-bold shadow-ember disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Enviar avaliação
      </button>
    </motion.div>
  );
}
