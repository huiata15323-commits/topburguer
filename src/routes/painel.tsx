// Painel público de senha — exibe em letras gigantes os pedidos prontos
// para retirada e, em paralelo, a fila de produção. Ideal para uma TV no balcão.
// Filtros (Tudo / Prontos / Em preparo) persistem no URL — basta abrir
// /painel?view=ready numa TV pra dedicar a tela só à retirada.
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { useOrders, type Order } from "@/lib/orders-store";
import { useMenu, type EditableMenuItem } from "@/lib/menu-store";
import { initVoice, announceReady, announceWaiter, speak } from "@/lib/voice";

const search = z.object({
  view: z.enum(["all", "ready", "preparing"]).optional().default("all").catch("all"),
});

export const Route = createFileRoute("/painel")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Painel — Top Burguer" },
      { name: "description", content: "Painel de senha pública: pedidos prontos e em produção." },
    ],
  }),
  component: PainelPage,
});

type View = "all" | "ready" | "preparing";

const CATEGORIES: { key: EditableMenuItem["category"]; label: string; emoji: string; color: string }[] = [
  { key: "burger", label: "Hambúrgueres", emoji: "🍔", color: "amber-warm" },
  { key: "side", label: "Acompanhamentos", emoji: "🍟", color: "ember" },
  { key: "drink", label: "Bebidas", emoji: "🥤", color: "emerald-400" },
];

function elapsedMin(ms: number) {
  return Math.floor((Date.now() - ms) / 60000);
}
function elapsedLabel(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m`;
}

function PainelPage() {
  const { view } = useSearch({ from: "/painel" });
  const navigate = useNavigate({ from: "/painel" });
  const { orders, clearWaiterCall } = useOrders();
  const { items: menu } = useMenu();
  const lastReadyIds = useRef<Set<string>>(new Set());
  const lastWaiterIds = useRef<Set<string>>(new Set());
  const [, force] = useState(0);
  const [voiceOn, setVoiceOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("painel.voice") !== "off";
  });

  useEffect(() => { initVoice(); }, []);
  useEffect(() => {
    if (typeof window !== "undefined")
      localStorage.setItem("painel.voice", voiceOn ? "on" : "off");
  }, [voiceOn]);

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
      // Anúncio por voz logo após o sino
      if (voiceOn) {
        const newOrders = newOnes
          .map((id) => orders.find((o) => o.id === id))
          .filter((o): o is Order => !!o);
        newOrders.forEach((o, i) => {
          setTimeout(() => announceReady(o.number, o.tableNumber, o.customer), 700 + i * 2200);
        });
      }
    }
    lastReadyIds.current = readyIds;
  }, [orders, voiceOn]);

  // Som distinto quando alguém chama o atendente
  const waiterCalls = useMemo(
    () => orders.filter((o) => o.waiterCalledAt && o.status !== "done"),
    [orders]
  );
  useEffect(() => {
    const ids = new Set(waiterCalls.map((o) => o.id));
    const newOnes = [...ids].filter((id) => !lastWaiterIds.current.has(id));
    if (lastWaiterIds.current.size > 0 && newOnes.length > 0) {
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        [660, 660, 880].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = freq;
          g.gain.value = 0.14;
          o.connect(g); g.connect(ctx.destination);
          o.start(ctx.currentTime + i * 0.22);
          o.stop(ctx.currentTime + i * 0.22 + 0.2);
        });
      } catch {}
      if (voiceOn) {
        const news = newOnes
          .map((id) => waiterCalls.find((o) => o.id === id))
          .filter((o): o is Order => !!o);
        news.forEach((o, i) => {
          setTimeout(() => announceWaiter(o.tableNumber), 500 + i * 2000);
        });
      }
    }
    lastWaiterIds.current = ids;
  }, [waiterCalls, voiceOn]);

  const ready = useMemo(
    () => orders.filter((o) => o.status === "done").sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)),
    [orders]
  );
  const preparing = useMemo(
    () => orders.filter((o) => o.status === "preparing").sort((a, b) => a.createdAt - b.createdAt),
    [orders]
  );
  const pending = useMemo(() => orders.filter((o) => o.status === "pending"), [orders]);

  // Quebra por categoria entre pedidos ativos (pending + preparing)
  const byCategory = useMemo(() => {
    const map = new Map(menu.map((m) => [m.id, m.category]));
    const counts: Record<EditableMenuItem["category"], number> = { burger: 0, side: 0, drink: 0 };
    [...preparing, ...pending].forEach((o) => {
      o.items.forEach((i) => {
        const cat = map.get(i.menuId);
        if (cat) counts[cat] += i.quantity;
      });
    });
    return counts;
  }, [menu, preparing, pending]);

  const setView = (v: View) =>
    navigate({ search: { view: v === "all" ? undefined : v } });

  const featured = ready[0];

  return (
    <main className="min-h-screen bg-neutral-950 text-white overflow-hidden relative flex flex-col">
      {/* Top bar */}
      <header className="border-b border-white/10 px-4 sm:px-8 py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <div className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-ember grid place-items-center font-black text-lg shadow-ember">T</div>
          <div className="min-w-0">
            <div className="font-black text-xl sm:text-2xl tracking-tight truncate">Top Burguer</div>
            <div className="text-[10px] uppercase tracking-widest text-amber-warm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live" /> Painel ao vivo
            </div>
          </div>
        </Link>

        {/* Filter chips */}
        <nav className="flex items-center gap-1.5 sm:gap-2 bg-white/5 rounded-xl p-1">
          <FilterChip active={view === "all"} onClick={() => setView("all")} label="Tudo" count={ready.length + preparing.length} />
          <FilterChip active={view === "ready"} onClick={() => setView("ready")} label="Prontos" count={ready.length} tone="emerald" />
          <FilterChip active={view === "preparing"} onClick={() => setView("preparing")} label="Em preparo" count={preparing.length} tone="amber" />
        </nav>

        <div className="text-right shrink-0">
          <div className="text-2xl sm:text-3xl font-black tabular-nums">{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
          <div className="text-[10px] uppercase tracking-widest text-white/40 hidden sm:block">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </div>
        </div>
      </header>

      {/* Faixa de categorias ao vivo */}
      <CategoryStrip counts={byCategory} totalActive={preparing.length + pending.length} />

      {/* Chamados de atendente */}
      <AnimatePresence>
        {waiterCalls.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-red-500/40 bg-gradient-to-r from-red-600/30 via-red-500/15 to-transparent overflow-hidden"
          >
            <div className="px-4 sm:px-8 py-3 flex items-center gap-3 sm:gap-5 overflow-x-auto">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-3xl shrink-0"
              >🙋</motion.div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-red-300 font-black whitespace-nowrap shrink-0">
                Chamando atendente
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {waiterCalls.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => void clearWaiterCall(o.id)}
                    className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-red-400/40 text-sm font-bold transition group"
                    title="Atendido — clique para limpar"
                  >
                    <span className="px-2 py-0.5 rounded-full bg-amber-warm text-charcoal text-xs font-black">
                      🪑 MESA {o.tableNumber ?? "?"}
                    </span>
                    <span className="text-white/90">#{o.number} · {o.customer}</span>
                    <span className="text-[10px] text-white/50 font-mono">
                      há {elapsedLabel(o.waiterCalledAt ?? Date.now())}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 text-emerald-300 text-xs">✓ atendido</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      <div className="flex-1 min-h-0 p-4 sm:p-6">
        <AnimatePresence mode="wait">
          {view === "all" && (
            <motion.div
              key="all"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid lg:grid-cols-[1.5fr_1fr] gap-4 sm:gap-6 h-full"
            >
              <FeaturedReady featured={featured} />
              <aside className="grid grid-rows-2 gap-4 sm:gap-6 min-h-0">
                <Column title="Também prontos" tone="emerald" orders={ready.slice(1, 7)} emptyMsg="—" />
                <Column title="Em preparo" tone="amber" orders={preparing.slice(0, 6)} emptyMsg="Sem pedidos em preparo" showTimer />
              </aside>
            </motion.div>
          )}

          {view === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-rows-[1fr_auto] gap-4 h-full"
            >
              <FeaturedReady featured={featured} big />
              {ready.length > 1 && (
                <div className="rounded-3xl bg-white/[0.03] border border-emerald-500/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.3em] text-emerald-400 font-black mb-3">Também prontos</div>
                  <BigGrid orders={ready.slice(1, 13)} tone="emerald" />
                </div>
              )}
            </motion.div>
          )}

          {view === "preparing" && (
            <motion.div
              key="preparing"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="h-full"
            >
              <PreparingKanban orders={preparing} menu={menu} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-6 py-2 text-center text-[10px] uppercase tracking-widest text-white/30 border-t border-white/5">
        Top Burguer · Atualização em tempo real · /painel?view=ready para modo TV
      </div>
    </main>
  );
}

function FilterChip({
  active, onClick, label, count, tone,
}: { active: boolean; onClick: () => void; label: string; count: number; tone?: "emerald" | "amber" }) {
  const toneCls =
    tone === "emerald" ? "text-emerald-400" :
    tone === "amber" ? "text-amber-warm" : "text-white";
  return (
    <button
      onClick={onClick}
      className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
        active ? "bg-white text-charcoal shadow-md" : "text-white/70 hover:text-white hover:bg-white/10"
      }`}
    >
      {label}
      <span className={`ml-1.5 tabular-nums ${active ? "text-ember" : toneCls}`}>{count}</span>
    </button>
  );
}

function CategoryStrip({
  counts, totalActive,
}: { counts: Record<EditableMenuItem["category"], number>; totalActive: number }) {
  return (
    <div className="px-4 sm:px-8 py-3 border-b border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] sm:flex items-center gap-3 sm:gap-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold whitespace-nowrap">
          Produção agora
          <span className="ml-2 text-amber-warm">{totalActive} pedidos</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
          {CATEGORIES.map((c) => {
            const n = counts[c.key];
            const active = n > 0;
            return (
              <motion.div
                key={c.key}
                layout
                animate={active ? { scale: [1, 1.03, 1] } : {}}
                transition={{ duration: 1.6, repeat: active ? Infinity : 0 }}
                className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold transition-all ${
                  active
                    ? "bg-white/10 border-amber-warm/40 text-white"
                    : "bg-white/[0.02] border-white/5 text-white/30"
                }`}
              >
                <span className="text-base">{c.emoji}</span>
                <span className="hidden sm:inline text-xs uppercase tracking-wider">{c.label}</span>
                <span className={`tabular-nums font-black ${active ? "text-amber-warm" : "text-white/30"}`}>{n}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FeaturedReady({ featured, big }: { featured?: Order; big?: boolean }) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-emerald-600/25 via-emerald-500/10 to-transparent border border-emerald-500/30 grid place-items-center p-6 sm:p-8 relative overflow-hidden min-h-0">
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
            <div className="text-base sm:text-xl uppercase tracking-[0.4em] text-emerald-300 font-bold animate-live">
              Pronto para retirar
            </div>
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`font-black tabular-nums leading-none mt-3 sm:mt-4 bg-gradient-to-br from-white via-amber-warm to-ember bg-clip-text text-transparent drop-shadow-2xl ${
                big ? "text-[clamp(14rem,38vw,40rem)]" : "text-[clamp(10rem,24vw,24rem)]"
              }`}
            >
              #{featured.number}
            </motion.div>
            <div className="mt-3 text-2xl sm:text-3xl font-bold text-white/90 truncate max-w-[80vw] mx-auto">
              {featured.customer}
              {featured.tableNumber && (
                <span className="ml-3 px-3 py-1 rounded-full bg-amber-warm text-charcoal text-base sm:text-lg font-black align-middle">
                  🪑 MESA {featured.tableNumber}
                </span>
              )}
            </div>
            <div className="mt-1 text-base sm:text-lg text-white/60">
              {featured.items.reduce((s, i) => s + i.quantity, 0)} itens · pronto há {elapsedLabel(featured.doneAt ?? featured.createdAt)}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-center relative z-10"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1], rotate: [0, -3, 3, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="text-[8rem] sm:text-[12rem] mb-4"
            >
              🍔
            </motion.div>
            <div className="text-xl sm:text-2xl text-white/40 font-bold">Nenhum pedido pronto no momento</div>
            <div className="mt-2 text-xs sm:text-sm text-white/30 uppercase tracking-widest">Aguarde — estamos preparando 🔥</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Column({
  title, tone, orders, emptyMsg, showTimer,
}: {
  title: string; tone: "emerald" | "amber"; orders: Order[]; emptyMsg: string; showTimer?: boolean;
}) {
  const accent = tone === "emerald" ? "text-emerald-400 border-emerald-500/30" : "text-amber-warm border-amber-warm/30";
  return (
    <section className={`rounded-3xl bg-white/[0.03] border ${accent} p-4 sm:p-5 flex flex-col min-h-0`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-xs uppercase tracking-[0.3em] font-black ${accent.split(" ")[0]}`}>{title}</h3>
        <span className="text-xs text-white/40 tabular-nums">{orders.length}</span>
      </div>
      <div className="flex-1 overflow-hidden">
        {orders.length === 0 ? (
          <div className="h-full grid place-items-center text-white/30 text-sm">{emptyMsg}</div>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 content-start">
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
                  <div className="text-3xl sm:text-4xl font-black tabular-nums">#{o.number}</div>
                  <div className="text-[11px] text-white/60 truncate">{o.customer}</div>
                  {showTimer && (
                    <div className={`text-[10px] mt-1 font-mono ${
                      elapsedMin(o.createdAt) >= 5 ? "text-red-400 font-bold animate-pulse" : "text-amber-warm"
                    }`}>
                      {elapsedLabel(o.createdAt)}
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

function BigGrid({ orders, tone }: { orders: Order[]; tone: "emerald" | "amber" }) {
  const accent = tone === "emerald" ? "text-emerald-400" : "text-amber-warm";
  return (
    <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
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
            <div className={`text-4xl sm:text-5xl font-black tabular-nums ${accent}`}>#{o.number}</div>
            <div className="text-xs text-white/60 truncate mt-1">{o.customer}</div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function PreparingKanban({ orders, menu }: { orders: Order[]; menu: EditableMenuItem[] }) {
  const catMap = useMemo(() => new Map(menu.map((m) => [m.id, m.category])), [menu]);

  if (orders.length === 0) {
    return (
      <div className="h-full grid place-items-center rounded-3xl bg-white/[0.02] border border-white/5">
        <div className="text-center">
          <div className="text-7xl mb-3">🍳</div>
          <div className="text-xl text-white/50 font-bold">Nenhum pedido em preparo</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 h-full content-start overflow-y-auto">
      <AnimatePresence>
        {orders.map((o) => {
          const min = elapsedMin(o.createdAt);
          const urgent = min >= 5;
          const verUrgent = min >= 8;
          // Categorias presentes
          const cats = new Set<EditableMenuItem["category"]>();
          o.items.forEach((i) => {
            const c = catMap.get(i.menuId);
            if (c) cats.add(c);
          });
          return (
            <motion.div
              key={o.id}
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`rounded-2xl p-4 border-2 flex flex-col gap-2 ${
                verUrgent ? "bg-red-500/15 border-red-500 animate-pulse" :
                urgent ? "bg-amber-warm/10 border-amber-warm" :
                "bg-white/[0.04] border-white/15"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-4xl font-black tabular-nums leading-none">#{o.number}</div>
                    {o.tableNumber && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-warm text-charcoal text-[10px] font-black">
                        🪑 {o.tableNumber}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/70 truncate mt-1">{o.customer}</div>
                </div>
                <div className={`text-xs font-mono font-bold tabular-nums shrink-0 ${
                  verUrgent ? "text-red-300" : urgent ? "text-amber-warm" : "text-white/50"
                }`}>
                  {elapsedLabel(o.createdAt)}
                </div>
              </div>

              <div className="flex gap-1 flex-wrap">
                {CATEGORIES.filter((c) => cats.has(c.key)).map((c) => (
                  <span key={c.key} className="text-base">{c.emoji}</span>
                ))}
              </div>

              <ul className="text-[11px] text-white/70 space-y-0.5 mt-1">
                {o.items.slice(0, 4).map((i) => (
                  <li key={i.menuId} className="truncate">
                    <span className="text-amber-warm font-bold">{i.quantity}×</span> {i.name}
                  </li>
                ))}
                {o.items.length > 4 && (
                  <li className="text-white/40 italic">+{o.items.length - 4} itens…</li>
                )}
              </ul>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
