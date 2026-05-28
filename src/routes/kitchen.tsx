import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useOrders, type Order, type OrderStatus } from "@/lib/orders-store";

export const Route = createFileRoute("/kitchen")({
  head: () => ({
    meta: [
      { title: "Cozinha — Fast Order" },
      { name: "description", content: "Painel de cozinha em tempo real da Top Burguer." },
    ],
  }),
  component: KitchenPage,
});

function elapsed(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Novo",
  preparing: "Preparando",
  done: "Pronto",
};

function KitchenPage() {
  const { orders, updateStatus, clearDone } = useOrders();
  const [, force] = useState(0);
  const prevIdsRef = useRef<Set<string>>(new Set());

  // Atualiza timers a cada segundo
  useEffect(() => {
    const i = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, []);

  // Beep sutil quando chega novo pedido
  useEffect(() => {
    const current = new Set(orders.map((o) => o.id));
    const isNew = orders.some((o) => !prevIdsRef.current.has(o.id));
    if (isNew && prevIdsRef.current.size > 0) {
      try {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new Ctx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 880;
        g.gain.value = 0.05;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.15);
      } catch {}
    }
    prevIdsRef.current = current;
  }, [orders]);

  const active = orders.filter((o) => o.status !== "done");
  const done = orders.filter((o) => o.status === "done");

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-white/10 bg-black/60 backdrop-blur sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-3xl">🍔</Link>
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                Top Burguer <span className="text-yellow-400">| Cozinha</span>
              </h1>
              <p className="text-xs text-white/50 uppercase tracking-widest">Kitchen Display System</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Stat label="Ativos" value={active.length} color="text-yellow-400" />
            <Stat label="Concluídos" value={done.length} color="text-green-400" />
            {done.length > 0 && (
              <button
                onClick={clearDone}
                className="px-3 py-2 text-xs rounded-lg bg-white/10 hover:bg-white/20 transition"
              >
                Limpar concluídos
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="p-6">
        {active.length === 0 ? (
          <div className="text-center py-32">
            <div className="text-7xl mb-4 animate-pulse">🍳</div>
            <p className="text-2xl text-white/40">Aguardando pedidos…</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {active.map((o) => (
              <OrderCard key={o.id} order={o} onStatus={(s) => updateStatus(o.id, s)} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-right">
      <div className={`text-3xl font-black ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div>
    </div>
  );
}

function OrderCard({ order, onStatus }: { order: Order; onStatus: (s: OrderStatus) => void }) {
  const age = (Date.now() - order.createdAt) / 1000;
  const urgent = age > 300; // > 5min

  const border =
    order.status === "preparing"
      ? "border-yellow-400 shadow-yellow-400/20"
      : urgent
      ? "border-red-500 shadow-red-500/30 animate-pulse"
      : "border-white/15";

  return (
    <div
      className={`rounded-2xl bg-neutral-900 border-2 ${border} shadow-lg p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-black">#{order.number}</div>
          <div className="text-sm text-white/70 truncate max-w-[180px]">{order.customer}</div>
        </div>
        <div className="text-right">
          <div className={`text-xs font-bold uppercase ${order.status === "preparing" ? "text-yellow-400" : "text-white/60"}`}>
            {STATUS_LABEL[order.status]}
          </div>
          <div className="text-xs font-mono text-white/50">{elapsed(order.createdAt)}</div>
        </div>
      </div>

      <ul className="space-y-1 flex-1">
        {order.items.map((i) => (
          <li key={i.menuId} className="flex gap-2 text-base">
            <span className="font-black text-yellow-400 w-6">{i.quantity}×</span>
            <span>{i.emoji} {i.name}</span>
          </li>
        ))}
      </ul>

      {order.notes && (
        <div className="text-xs bg-yellow-400/10 border border-yellow-400/30 text-yellow-200 rounded-lg p-2">
          📝 {order.notes}
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-white/10">
        {order.status === "pending" && (
          <button
            onClick={() => onStatus("preparing")}
            className="flex-1 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm transition active:scale-95"
          >
            ▶ Preparar
          </button>
        )}
        {order.status === "preparing" && (
          <button
            onClick={() => onStatus("done")}
            className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition active:scale-95"
          >
            ✓ Concluir
          </button>
        )}
      </div>
    </div>
  );
}
