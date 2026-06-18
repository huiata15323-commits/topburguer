import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrders, type Order, type OrderStatus } from "@/lib/orders-store";
import { buildReadyMessage, waLink, formatPhoneBR } from "@/lib/whatsapp";
import { StaffGate } from "@/components/StaffGate";
import { toast } from "sonner";

export const Route = createFileRoute("/kitchen")({
  head: () => ({
    meta: [
      { title: "Cozinha — Top Burguer" },
      { name: "description", content: "Painel de cozinha em tempo real da Top Burguer." },
    ],
  }),
  component: () => (
    <StaffGate area="kitchen" allow={["admin", "cozinha", "caixa"]} title="Painel da Cozinha">
      <KitchenPage />
    </StaffGate>
  ),
});

function elapsed(ms: number) {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}

// Marca local (por aba) de quando o pedido entrou em "preparing" via clique.
// Evita usar createdAt como cronômetro de preparo (pedidos antigos no banco
// mostrariam horas de "preparo" antes mesmo de alguém clicar em Preparar).
const PREP_KEY = "topb.prepStartedAt";
function readPrepMap(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(PREP_KEY) ?? "{}"); } catch { return {}; }
}
function writePrepMap(m: Record<string, number>) {
  try { localStorage.setItem(PREP_KEY, JSON.stringify(m)); } catch {}
}
function markPrepStart(id: string) {
  const m = readPrepMap();
  if (!m[id]) { m[id] = Date.now(); writePrepMap(m); }
}
function clearPrepStart(id: string) {
  const m = readPrepMap();
  if (m[id]) { delete m[id]; writePrepMap(m); }
}
function getPrepStart(id: string): number | undefined {
  return readPrepMap()[id];
}


const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Novo",
  preparing: "Preparando",
  done: "Pronto",
};

type LuxSensor = EventTarget & { illuminance?: number; start: () => void; stop: () => void };
type LuxSensorCtor = new (opts?: { frequency?: number }) => LuxSensor;

function KitchenPage() {
  const { orders, updateStatus, markNotified, clearDone } = useOrders();
  const [, force] = useState(0);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [tvMode, setTvMode] = useState(false);
  const [autoBrightness, setAutoBrightness] = useState(true);
  const [brightness, setBrightness] = useState(1);
  const [showAggregate, setShowAggregate] = useState(false);
  const containerRef = useRef<HTMLElement>(null);

  // Agregado de produção: soma todas as quantidades por item dos pedidos ativos
  const aggregate = useMemo(() => {
    const map = new Map<string, { name: string; image: string; emoji: string; qty: number }>();
    orders
      .filter((o) => o.status === "pending" || o.status === "preparing")
      .forEach((o) => {
        o.items.forEach((i) => {
          const cur = map.get(i.menuId);
          if (cur) cur.qty += i.quantity;
          else map.set(i.menuId, { name: i.name, image: i.image, emoji: i.emoji, qty: i.quantity });
        });
      });
    return [...map.values()].sort((a, b) => b.qty - a.qty);
  }, [orders]);

  // Optimized tick: only update when there are active orders (saves CPU/GPU on TVs)
  useEffect(() => {
    const hasActive = orders.some((o) => o.status !== "done");
    if (!hasActive) return;
    const i = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, [orders]);

  // Auto brightness: ambient light sensor when available, else time of day
  useEffect(() => {
    if (!autoBrightness) return;
    let sensor: LuxSensor | null = null;
    const computeFromHour = () => {
      const h = new Date().getHours();
      // Night dim (22h–7h): 0.7; Daytime peak (10–17h): 1.05; transitions: 0.85
      if (h >= 22 || h < 7) return 0.7;
      if (h >= 10 && h < 17) return 1.05;
      return 0.88;
    };
    setBrightness(computeFromHour());
    const interval = setInterval(() => setBrightness(computeFromHour()), 60_000);

    const SensorCtor = (window as unknown as { AmbientLightSensor?: LuxSensorCtor }).AmbientLightSensor;
    if (SensorCtor) {
      try {
        sensor = new SensorCtor({ frequency: 0.2 });
        const handler = () => {
          const lux = sensor?.illuminance ?? 0;
          // Map 0–800 lux → 0.55–1.15
          const b = Math.min(1.15, Math.max(0.55, 0.55 + (lux / 800) * 0.6));
          setBrightness(b);
        };
        sensor.addEventListener("reading", handler);
        sensor.start();
      } catch {}
    }
    return () => {
      clearInterval(interval);
      try { sensor?.stop(); } catch {}
    };
  }, [autoBrightness]);

  // Beep on new orders
  useEffect(() => {
    const current = new Set(orders.map((o) => o.id));
    const isNew = orders.some((o) => !prevIdsRef.current.has(o.id));
    if (isNew && prevIdsRef.current.size > 0) {
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 880;
        g.gain.value = 0.05;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.18);
      } catch {}
    }
    prevIdsRef.current = current;
  }, [orders]);

  // Track fullscreen exit (Esc)
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setTvMode(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleTv = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen?.();
        setTvMode(true);
      } else {
        await document.exitFullscreen?.();
        setTvMode(false);
      }
    } catch {
      setTvMode((v) => !v);
    }
  };

  const pending = orders.filter((o) => o.status === "pending");
  const preparing = orders.filter((o) => o.status === "preparing");
  const done = orders.filter((o) => o.status === "done");
  const active = orders.filter((o) => o.status !== "done");
  const list = filter === "all" ? active : orders.filter((o) => o.status === filter);

  // Emojis flutuantes — pré-distribuídos para o fundo não parecer aleatório demais
  const floatingEmojis = [
    { e: "🍔", left: "8%",  dur: 26, delay: 0,   size: "3.5rem" },
    { e: "🍟", left: "22%", dur: 32, delay: 6,   size: "2.5rem" },
    { e: "🥤", left: "38%", dur: 28, delay: 12,  size: "3rem"   },
    { e: "🌶️", left: "55%", dur: 36, delay: 3,   size: "2rem"   },
    { e: "🧀", left: "72%", dur: 30, delay: 18,  size: "2.8rem" },
    { e: "🥓", left: "88%", dur: 34, delay: 9,   size: "2.6rem" },
    { e: "🍅", left: "15%", dur: 38, delay: 22,  size: "2.2rem" },
    { e: "🥗", left: "62%", dur: 30, delay: 15,  size: "2.6rem" },
  ];

  return (
    <main
      ref={containerRef}
      style={{ filter: `brightness(${brightness.toFixed(2)})` }}
      className={`min-h-screen bg-neutral-950 text-white transition-[filter] duration-700 relative overflow-hidden ${tvMode ? "tv-mode" : ""}`}
    >
      {/* Fundo interativo: aurora, grade técnica e emojis flutuantes */}
      <div aria-hidden className="absolute inset-0 pointer-events-none z-0">
        <div className="kitchen-aurora" />
        <div className="kitchen-grid" />
        {floatingEmojis.map((f, i) => (
          <span
            key={i}
            className="float-emoji"
            style={{
              left: f.left,
              animationDuration: `${f.dur}s`,
              animationDelay: `-${f.delay}s`,
              fontSize: f.size,
            }}
          >
            {f.e}
          </span>
        ))}
        {/* Barra de status superior — pulso brand quando há pedidos urgentes */}
        {orders.some((o) => o.status !== "done" && (Date.now() - o.createdAt) / 1000 > 300) && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />
        )}
      </div>

      <div className="relative z-10">
      <header className="border-b border-white/10 bg-black/70 backdrop-blur-xl sticky top-0 z-10">

        <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link to="/" className="w-10 h-10 rounded-xl bg-gradient-ember grid place-items-center font-black shadow-ember">T</Link>
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                Top Burguer <span className="text-amber-warm">| Cozinha</span>
              </h1>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-live" /> Kitchen Display System
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="Todos" count={active.length} />
            <FilterChip active={filter === "pending"} onClick={() => setFilter("pending")} label="Novos" count={pending.length} tone="amber" />
            <FilterChip active={filter === "preparing"} onClick={() => setFilter("preparing")} label="Preparando" count={preparing.length} tone="ember" />
            <FilterChip active={filter === "done"} onClick={() => setFilter("done")} label="Prontos" count={done.length} tone="emerald" />
            {done.length > 0 && (
              <button
                onClick={clearDone}
                className="px-3 py-2 text-xs rounded-lg bg-white/10 hover:bg-white/20 transition"
              >
                Limpar concluídos
              </button>
            )}
            <button
              onClick={() => setAutoBrightness((v) => !v)}
              title="Ajuste automático de brilho"
              className={`px-3 py-2 text-xs rounded-lg transition ${autoBrightness ? "bg-amber-warm/20 text-amber-warm border border-amber-warm/40" : "bg-white/10 hover:bg-white/20"}`}
            >
              {autoBrightness ? "☀ Auto" : "☼ Manual"} <span className="opacity-60 ml-1">{Math.round(brightness * 100)}%</span>
            </button>
            <button
              onClick={() => setShowAggregate((v) => !v)}
              title="Total agregado de itens em produção"
              className={`px-3 py-2 text-xs rounded-lg transition ${showAggregate ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-white/10 hover:bg-white/20"}`}
            >
              📊 {showAggregate ? "Ocultar agregado" : "Ver agregado"}
            </button>
            <button
              onClick={toggleTv}
              className="px-3 py-2 text-xs rounded-lg bg-gradient-ember text-charcoal font-bold transition hover:brightness-110"
            >
              {tvMode ? "⤬ Sair TV" : "⛶ Modo TV"}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showAggregate && aggregate.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-emerald-500/30 bg-gradient-to-r from-emerald-600/15 via-emerald-500/5 to-transparent overflow-hidden"
          >
            <div className="px-6 py-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">📊</span>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300 font-black">Produção agregada</div>
                  <div className="text-xs text-white/60">Total de itens a preparar em todos os pedidos ativos</div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {aggregate.map((a) => (
                  <div key={a.name} className="rounded-xl bg-black/40 border border-emerald-500/20 p-3 flex items-center gap-3">
                    <div className="text-4xl font-black text-emerald-400 tabular-nums leading-none shrink-0">{a.qty}×</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate">{a.name}</div>
                      <div className="text-base">{a.emoji}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={tvMode ? "p-4" : "p-6"}>
        {list.length === 0 ? (
          <div className="text-center py-32">
            <motion.div
              animate={{ scale: [1, 1.06, 1], rotate: [0, -3, 3, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-7xl mb-4"
            >
              🍳
            </motion.div>
            <p className="text-2xl text-white/40">Aguardando pedidos…</p>
            <p className="mt-2 text-sm text-white/30">Abra <code className="text-amber-warm">/order</code> em outra aba para testar.</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${tvMode ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4 text-lg" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"}`}>
            <AnimatePresence mode="popLayout">
              {list.map((o) => (
                <OrderCard key={o.id} order={o} onStatus={(s) => updateStatus(o.id, s)} onNotified={() => markNotified(o.id)} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      </div>
    </main>

  );
}

function FilterChip({
  active, onClick, label, count, tone,
}: {
  active: boolean; onClick: () => void; label: string; count: number;
  tone?: "ember" | "amber" | "emerald";
}) {
  const toneCls =
    tone === "ember" ? "text-ember" :
    tone === "amber" ? "text-amber-warm" :
    tone === "emerald" ? "text-emerald-400" : "text-white";
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
        active ? "bg-white/15 border-white/30" : "bg-white/5 border-transparent hover:bg-white/10"
      }`}
    >
      {label} <span className={`ml-1 ${toneCls}`}>{count}</span>
    </button>
  );
}

function OrderCard({ order, onStatus, onNotified }: { order: Order; onStatus: (s: OrderStatus) => void; onNotified: () => void }) {
  const age = (Date.now() - order.createdAt) / 1000;
  const urgent = age > 300 && order.status !== "done";

  const border =
    order.status === "done"
      ? "border-emerald-500/40 opacity-70"
      : order.status === "preparing"
      ? "border-amber-warm shadow-tv-glow"
      : urgent
      ? "border-red-500 shadow-red-500/30"
      : "border-white/15";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", damping: 22, stiffness: 240 }}
      className={`rounded-2xl bg-neutral-900 border-2 ${border} shadow-lg p-4 flex flex-col gap-3 ${urgent ? "animate-pulse" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-3xl font-black">#{order.number}</div>
            {order.tableNumber && (
              <span className="px-2 py-0.5 rounded-full bg-amber-warm text-charcoal text-xs font-black tracking-wide">
                🪑 MESA {order.tableNumber}
              </span>
            )}
          </div>
          <div className="text-sm text-white/70 truncate max-w-[180px]">{order.customer}</div>
          {order.phone && (
            <div className="text-[11px] text-emerald-400/80 font-mono mt-0.5">📱 {formatPhoneBR(order.phone.replace(/^55/, ""))}</div>
          )}
        </div>
        <div className="text-right">
          <div className={`text-xs font-bold uppercase ${
            order.status === "preparing" ? "text-amber-warm" :
            order.status === "done" ? "text-emerald-400" : "text-white/60"
          }`}>
            {STATUS_LABEL[order.status]}
          </div>
          <div className="text-xs font-mono text-white/50">{elapsed(order.createdAt)}</div>
        </div>
      </div>

      <ul className="space-y-2 flex-1">
        {order.items.map((i) => (
          <li key={i.menuId} className="flex items-start gap-2 text-base">
            <img src={i.image} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-white/10" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-amber-warm">{i.quantity}×</span>
                <span className="truncate">{i.name}</span>
              </div>
              {i.notes && <div className="text-[11px] text-amber-warm/80 truncate">📝 {i.notes}</div>}
            </div>
          </li>
        ))}
      </ul>

      {order.notes && (
        <div className="text-xs bg-amber-warm/10 border border-amber-warm/30 text-amber-warm rounded-lg p-2">
          📝 {order.notes}
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-white/10">
        {order.status === "pending" && (
          <button
            onClick={() => onStatus("preparing")}
            className="flex-1 py-2.5 rounded-lg bg-amber-warm hover:brightness-110 text-charcoal font-bold text-sm transition active:scale-95"
          >
            ▶ Preparar
          </button>
        )}
        {order.status === "preparing" && (
          <button
            onClick={() => onStatus("done")}
            className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition active:scale-95"
          >
            ✓ Concluir
          </button>
        )}
        {order.status === "done" && (
          <button
            onClick={() => onStatus("preparing")}
            className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-xs transition"
          >
            ↺ Reabrir
          </button>
        )}
        <a
          href={`/receipt?n=${order.number}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-xs font-bold transition"
          title="Imprimir comanda 80mm"
        >
          🖨
        </a>
        {order.status !== "done" && (
          <button
            onClick={() => {
              const reason = window.prompt(`Cancelar pedido #${order.number}? Informe o motivo (opcional):`, "");
              if (reason === null) return;
              const ok = window.confirm(`Confirmar cancelamento do pedido #${order.number}?${reason ? `\n\nMotivo: ${reason}` : ""}`);
              if (!ok) return;
              onStatus("done");
              toast.warning(`❌ Pedido #${order.number} cancelado${reason ? ` — ${reason}` : ""}`);
            }}
            className="px-3 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-xs font-bold transition"
            title="Cancelar pedido"
          >
            ✕
          </button>
        )}
      </div>


      {order.status === "done" && order.phone && (
        <a
          href={waLink(order.phone, buildReadyMessage({ customer: order.customer, number: order.number, total: order.total }))}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNotified}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition active:scale-95 ${
            order.notifiedAt
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "bg-[#25D366] hover:brightness-110 text-white shadow-lg"
          }`}
        >
          {order.notifiedAt ? "✓ Cliente notificado" : "💬 Notificar pelo WhatsApp"}
        </a>
      )}
    </motion.div>
  );
}
