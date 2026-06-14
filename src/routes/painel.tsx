// Painel público de senha — exibe em letras gigantes os pedidos prontos
// para retirada e, em paralelo, a fila de produção. Ideal para uma TV no balcão.
// Filtros (Tudo / Prontos / Em preparo) persistem no URL — basta abrir
// /painel?view=ready numa TV pra dedicar a tela só à retirada.
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { useOrders, type Order } from "@/lib/orders-store";
import { useMenu, type EditableMenuItem } from "@/lib/menu-store";
import { initVoice, announceReady, announceWaiter, speak } from "@/lib/voice";
import { spawnFakeOrder } from "@/lib/demo-mode";
import confetti from "canvas-confetti";

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

// Hook: pedidos marcados como "entregues" — escondidos do painel mas preservados
// no DB para relatórios. Persiste no localStorage com expiração de 8h.
function useDeliveredHidden() {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = JSON.parse(localStorage.getItem("painel.delivered") ?? "{}") as Record<string, number>;
      const now = Date.now();
      const fresh = Object.entries(raw).filter(([, t]) => now - t < 8 * 3600_000);
      const map = Object.fromEntries(fresh);
      localStorage.setItem("painel.delivered", JSON.stringify(map));
      setHidden(new Set(Object.keys(map)));
    } catch {}
  }, []);
  const hide = useCallback((id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        const raw = JSON.parse(localStorage.getItem("painel.delivered") ?? "{}") as Record<string, number>;
        raw[id] = Date.now();
        localStorage.setItem("painel.delivered", JSON.stringify(raw));
      } catch {}
      return next;
    });
  }, []);
  return { hidden, hide };
}

function PainelPage() {
  const { view } = useSearch({ from: "/painel" });
  const navigate = useNavigate({ from: "/painel" });
  const { orders: allOrders, clearWaiterCall } = useOrders();
  const { items: menu } = useMenu();
  const { hidden: deliveredHidden, hide: markDelivered } = useDeliveredHidden();
  const orders = useMemo(
    () => allOrders.filter((o) => !(o.status === "done" && deliveredHidden.has(o.id))),
    [allOrders, deliveredHidden]
  );
  const lastReadyIds = useRef<Set<string>>(new Set());
  const lastWaiterIds = useRef<Set<string>>(new Set());
  const [, force] = useState(0);
  const [voiceOn, setVoiceOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("painel.voice") !== "off";
  });
  const [demoOn, setDemoOn] = useState(false);
  const demoTimerRef = useRef<number | null>(null);
  // Fila de pedidos a exibir em tela cheia (takeover cinematográfico)
  const [spotlightQueue, setSpotlightQueue] = useState<Order[]>([]);
  const currentSpotlight = spotlightQueue[0];

  const reannounce = useCallback((o: Order) => {
    setSpotlightQueue((q) => [...q, o]);
    if (voiceOn) announceReady(o.number, o.tableNumber, o.customer);
    toast.success(`🔔 Chamando #${o.number} novamente`);
  }, [voiceOn]);

  // Tempo médio de preparo (últimos 10 done)
  const avgPrepMin = useMemo(() => {
    const recent = allOrders
      .filter((o) => o.status === "done" && o.doneAt)
      .slice(0, 10);
    if (recent.length === 0) return null;
    const total = recent.reduce((s, o) => s + Math.max(0, (o.doneAt ?? 0) - o.createdAt), 0);
    return Math.max(1, Math.round(total / recent.length / 60000));
  }, [allOrders]);

  // Avança a fila do spotlight automaticamente (5.5s cada)
  useEffect(() => {
    if (!currentSpotlight) return;
    // confetti dourado por cima
    try {
      const fire = (angle: number, originX: number) => {
        confetti({
          particleCount: 60,
          spread: 70,
          angle,
          origin: { x: originX, y: 0.6 },
          colors: ["#FFD700", "#FFA500", "#FF6B35", "#10b981"],
          scalar: 1.2,
          ticks: 200,
        });
      };
      fire(60, 0.1);
      fire(120, 0.9);
    } catch {}
    const t = setTimeout(() => {
      setSpotlightQueue((q) => q.slice(1));
    }, 5500);
    return () => clearTimeout(t);
  }, [currentSpotlight]);

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

  // ===== Modo apresentador / demo automático =====
  // Atalho: tecla "D" liga/desliga. Enquanto ligado, injeta pedidos sintéticos
  // a cada ~9-13s, que progridem sozinhos (pending → preparing → done) e são
  // deletados após 60s pra não poluir o relatório real.
  const scheduleDemo = useCallback(() => {
    const next = 9000 + Math.random() * 4000;
    demoTimerRef.current = window.setTimeout(async () => {
      await spawnFakeOrder(menu);
      scheduleDemo();
    }, next);
  }, [menu]);

  useEffect(() => {
    if (!demoOn) {
      if (demoTimerRef.current) {
        clearTimeout(demoTimerRef.current);
        demoTimerRef.current = null;
      }
      return;
    }
    // primeiro pedido quase imediato
    void spawnFakeOrder(menu);
    scheduleDemo();
    return () => {
      if (demoTimerRef.current) {
        clearTimeout(demoTimerRef.current);
        demoTimerRef.current = null;
      }
    };
  }, [demoOn, menu, scheduleDemo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "d") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      setDemoOn((v) => {
        const next = !v;
        toast.success(next ? "🎬 Modo apresentador ligado" : "⏸ Modo apresentador desligado");
        return next;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
      // Anúncio por voz + takeover na tela
      const newOrders = newOnes
        .map((id) => orders.find((o) => o.id === id))
        .filter((o): o is Order => !!o);
      setSpotlightQueue((q) => [...q, ...newOrders]);
      if (voiceOn) {
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

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setDemoOn((v) => {
                const next = !v;
                toast.success(next ? "🎬 Demo ligado (atalho: D)" : "⏸ Demo desligado");
                return next;
              });
            }}
            title="Modo apresentador: gera pedidos automáticos (atalho: D)"
            className={`grid place-items-center w-10 h-10 rounded-xl border transition ${
              demoOn
                ? "bg-purple-500/20 border-purple-400/50 text-purple-200 animate-live"
                : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"
            }`}
          >
            🎬
          </button>
          <button
            onClick={() => {
              const next = !voiceOn;
              setVoiceOn(next);
              if (next) speak("Anúncios de voz ativados.");
            }}
            title={voiceOn ? "Desativar anúncios de voz" : "Ativar anúncios de voz"}
            className={`grid place-items-center w-10 h-10 rounded-xl border transition ${
              voiceOn
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-white/5 border-white/10 text-white/40"
            }`}
          >
            {voiceOn ? "🔊" : "🔇"}
          </button>
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Prontos</div>
              <div className="text-lg font-black text-emerald-400 tabular-nums leading-none">{ready.length}</div>
            </div>
            <div className="w-px h-7 bg-white/10" />
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Preparo</div>
              <div className="text-lg font-black text-amber-warm tabular-nums leading-none">{preparing.length}</div>
            </div>
            {avgPrepMin != null && (
              <>
                <div className="w-px h-7 bg-white/10" />
                <div className="text-center">
                  <div className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Médio</div>
                  <div className="text-lg font-black text-white/90 tabular-nums leading-none">{avgPrepMin}m</div>
                </div>
              </>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-black tabular-nums">{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
            <div className="text-[10px] uppercase tracking-widest text-white/40 hidden sm:block">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </div>
          </div>
        </div>
      </header>

      {/* Banner do modo demo */}
      <AnimatePresence>
        {demoOn && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gradient-to-r from-purple-600/30 via-fuchsia-500/15 to-transparent border-b border-purple-400/30 overflow-hidden"
          >
            <div className="px-4 sm:px-8 py-2 text-xs sm:text-sm font-bold flex items-center gap-3 text-purple-100">
              <span className="text-lg animate-live">🎬</span>
              <span>MODO APRESENTADOR · gerando pedidos sintéticos · pressione <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">D</kbd> para desligar</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


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
              <FeaturedReady featured={featured} onReannounce={reannounce} onDelivered={markDelivered} />
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

      <SpotlightTakeover order={currentSpotlight} />
    </main>
  );
}

function SpotlightTakeover({ order }: { order?: Order }) {
  return (
    <AnimatePresence>
      {order && (
        <motion.div
          key={order.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 grid place-items-center overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(16,72,52,0.95) 0%, rgba(5,15,12,0.98) 60%, #000 100%)",
          }}
        >
          {/* Raios de luz girando */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(255,215,0,0.08) 20deg, transparent 40deg, transparent 180deg, rgba(16,185,129,0.08) 200deg, transparent 220deg)",
            }}
          />
          {/* Aurora dourada pulsante */}
          <motion.div
            className="absolute w-[700px] h-[700px] rounded-full bg-amber-warm/20 blur-3xl pointer-events-none"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />

          <motion.div
            initial={{ scale: 0.4, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ type: "spring", damping: 14, stiffness: 180 }}
            className="relative text-center px-6"
          >
            {/* Badge superior */}
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-emerald-500/30 border-2 border-emerald-400/60 backdrop-blur-md mb-6 shadow-[0_0_60px_rgba(16,185,129,0.5)]"
            >
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm sm:text-base uppercase tracking-[0.5em] text-emerald-100 font-black">
                Pedido Pronto
              </span>
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            </motion.div>

            {/* Número gigante */}
            <motion.div
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="font-black tabular-nums leading-none text-[clamp(10rem,28vw,32rem)] bg-gradient-to-br from-amber-200 via-amber-warm to-ember bg-clip-text text-transparent"
              style={{
                textShadow: "0 0 120px rgba(255,180,80,0.7)",
                filter: "drop-shadow(0 0 40px rgba(255,200,100,0.5))",
              }}
            >
              #{order.number}
            </motion.div>

            {/* Nome do cliente */}
            <div className="mt-6 text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight max-w-[90vw] mx-auto truncate"
              style={{ textShadow: "0 4px 30px rgba(0,0,0,0.6)" }}>
              {order.customer}
            </div>

            {/* Mesa + Retirada */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {order.tableNumber ? (
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-ember shadow-ember text-charcoal text-2xl sm:text-3xl font-black"
                >
                  🪑 MESA {order.tableNumber}
                </motion.div>
              ) : (
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-amber-warm shadow-tv-glow text-charcoal text-2xl sm:text-3xl font-black"
                >
                  🛍 RETIRAR NO BALCÃO
                </motion.div>
              )}
              {order.tableNumber && (
                <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 border border-white/20 text-white text-xl sm:text-2xl font-black backdrop-blur-sm">
                  🛎 LEVAR À MESA
                </div>
              )}
            </div>

            <div className="mt-8 text-xs sm:text-sm uppercase tracking-[0.4em] text-white/50 font-bold">
              {order.items.reduce((s, i) => s + i.quantity, 0)} itens · Top Burguer
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
    <section className="rounded-3xl bg-gradient-to-br from-emerald-600/25 via-emerald-500/10 to-transparent border border-emerald-500/30 grid place-items-center p-6 sm:p-8 relative overflow-hidden min-h-0 shadow-[inset_0_0_120px_rgba(16,185,129,0.15)]">
      <div className="absolute inset-0 bg-grain opacity-50" />
      {/* Auroras animadas */}
      {featured && (
        <>
          <motion.div
            className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-emerald-400/20 blur-3xl pointer-events-none"
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 6, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-32 -right-32 w-[480px] h-[480px] rounded-full bg-amber-warm/20 blur-3xl pointer-events-none"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 7, repeat: Infinity }}
          />
        </>
      )}
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live" />
              <span className="text-xs sm:text-sm uppercase tracking-[0.4em] text-emerald-200 font-black">
                Pronto para retirar
              </span>
            </div>
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`font-black tabular-nums leading-none mt-3 sm:mt-4 bg-gradient-to-br from-white via-amber-warm to-ember bg-clip-text text-transparent drop-shadow-2xl ${
                big ? "text-[clamp(14rem,38vw,40rem)]" : "text-[clamp(10rem,24vw,24rem)]"
              }`}
              style={{ textShadow: "0 0 80px rgba(245, 166, 35, 0.4)" }}
            >
              #{featured.number}
            </motion.div>
            <div className="mt-4 text-3xl sm:text-5xl font-black text-white truncate max-w-[80vw] mx-auto tracking-tight">
              {featured.customer}
            </div>
            {featured.tableNumber && (
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-gradient-ember shadow-ember text-charcoal text-xl sm:text-2xl font-black"
              >
                🪑 MESA {featured.tableNumber}
              </motion.div>
            )}
            <div className="mt-4 text-sm sm:text-base text-white/50 font-medium uppercase tracking-widest">
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
