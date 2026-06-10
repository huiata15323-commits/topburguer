// Painel público de senha — exibe em letras gigantes os pedidos prontos
// para retirada. Ideal para uma TV no balcão. Atualiza em tempo real.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrders, type Order } from "@/lib/orders-store";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel — Top Burguer" },
      { name: "description", content: "Painel de senha pública: pedidos prontos para retirada." },
    ],
  }),
  component: PainelPage,
});

function PainelPage() {
  const { orders } = useOrders();
  const lastReadyIds = useRef<Set<string>>(new Set());
  const [, force] = useState(0);

  // tick para timer
  useEffect(() => {
    const i = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, []);

  // Som ao ficar pronto um novo pedido
  useEffect(() => {
    const readyIds = new Set(orders.filter((o) => o.status === "done").map((o) => o.id));
    const newOnes = [...readyIds].filter((id) => !lastReadyIds.current.has(id));
    if (lastReadyIds.current.size > 0 && newOnes.length > 0) {
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        [880, 1100, 1320].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = freq;
          g.gain.value = 0.12;
          o.connect(g);
          g.connect(ctx.destination);
          o.start(ctx.currentTime + i * 0.16);
          o.stop(ctx.currentTime + i * 0.16 + 0.18);
        });
      } catch {}
    }
    lastReadyIds.current = readyIds;
  }, [orders]);

  const ready = useMemo(
    () =>
      orders
        .filter((o) => o.status === "done")
        .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
        .slice(0, 8),
    [orders]
  );
  const preparing = useMemo(
    () => orders.filter((o) => o.status === "preparing").slice(0, 6),
    [orders]
  );

  const featured = ready[0];

  return (
    <main className="min-h-screen bg-neutral-950 text-white overflow-hidden relative">
      {/* Top bar */}
      <header className="border-b border-white/10 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-ember grid place-items-center font-black text-xl shadow-ember">T</div>
          <div>
            <div className="font-black text-2xl tracking-tight">Top Burguer</div>
            <div className="text-[11px] uppercase tracking-widest text-amber-warm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live" /> Painel de retirada
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black tabular-nums">{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
          <div className="text-[10px] uppercase tracking-widest text-white/40">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</div>
        </div>
      </header>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 p-6 h-[calc(100vh-90px)]">
        {/* Featured: senha gigante */}
        <section className="rounded-3xl bg-gradient-to-br from-emerald-600/20 via-emerald-500/10 to-transparent border border-emerald-500/30 grid place-items-center p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-grain opacity-50" />
          <AnimatePresence mode="wait">
            {featured ? (
              <motion.div
                key={featured.id}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", damping: 16, stiffness: 200 }}
                className="text-center relative z-10"
              >
                <div className="text-xl uppercase tracking-[0.4em] text-emerald-300 font-bold animate-live">Pronto para retirar</div>
                <motion.div
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="font-black tabular-nums leading-none mt-4 text-[clamp(12rem,28vw,28rem)] bg-gradient-to-br from-white via-amber-warm to-ember bg-clip-text text-transparent drop-shadow-2xl"
                >
                  #{featured.number}
                </motion.div>
                <div className="mt-4 text-3xl font-bold text-white/90">{featured.customer}</div>
                <div className="mt-2 text-lg text-white/60">{featured.items.reduce((s, i) => s + i.quantity, 0)} itens</div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center relative z-10"
              >
                <motion.div
                  animate={{ scale: [1, 1.08, 1], rotate: [0, -3, 3, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="text-[12rem] mb-4"
                >
                  🍔
                </motion.div>
                <div className="text-2xl text-white/40 font-bold">Nenhum pedido pronto no momento</div>
                <div className="mt-2 text-sm text-white/30 uppercase tracking-widest">Aguarde — estamos preparando 🔥</div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Filas laterais */}
        <aside className="grid grid-rows-2 gap-6 min-h-0">
          <Column title="Também prontos" tone="emerald" orders={ready.slice(1, 7)} emptyMsg="—" />
          <Column title="Em preparo" tone="amber" orders={preparing} emptyMsg="Sem pedidos em preparo" showTimer />
        </aside>
      </div>

      <div className="absolute bottom-3 left-0 right-0 text-center text-[10px] uppercase tracking-widest text-white/30">
        Top Burguer · Painel de retirada em tempo real
      </div>
    </main>
  );
}

function Column({
  title, tone, orders, emptyMsg, showTimer,
}: {
  title: string;
  tone: "emerald" | "amber";
  orders: Order[];
  emptyMsg: string;
  showTimer?: boolean;
}) {
  const accent = tone === "emerald" ? "text-emerald-400 border-emerald-500/30" : "text-amber-warm border-amber-warm/30";
  return (
    <section className={`rounded-3xl bg-white/[0.03] border ${accent} p-5 flex flex-col min-h-0`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-xs uppercase tracking-[0.3em] font-black ${accent.split(" ")[0]}`}>{title}</h3>
        <span className="text-xs text-white/40">{orders.length}</span>
      </div>
      <div className="flex-1 overflow-hidden">
        {orders.length === 0 ? (
          <div className="h-full grid place-items-center text-white/30 text-sm">{emptyMsg}</div>
        ) : (
          <ul className="grid grid-cols-2 gap-2 content-start">
            <AnimatePresence>
              {orders.map((o) => (
                <motion.li
                  key={o.id}
                  layout
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  className="rounded-2xl bg-black/40 border border-white/10 p-3 text-center"
                >
                  <div className="text-4xl font-black tabular-nums">#{o.number}</div>
                  <div className="text-xs text-white/60 truncate">{o.customer}</div>
                  {showTimer && (
                    <div className="text-[10px] mt-1 text-amber-warm font-mono">
                      {Math.floor((Date.now() - o.createdAt) / 60000)}m
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
}
