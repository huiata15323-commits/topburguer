import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useOrders, type Order } from "@/lib/orders-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Top Burguer" },
      { name: "description", content: "Histórico diário, métricas e itens mais vendidos." },
    ],
  }),
  component: DashboardPage,
});

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}
function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtMin(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${String(r).padStart(2, "0")}s` : `${r}s`;
}

function DashboardPage() {
  const { orders } = useOrders();
  const [range, setRange] = useState<"today" | "7d" | "all">("today");

  const filtered = useMemo(() => {
    const now = Date.now();
    if (range === "today") {
      const start = startOfDay(new Date());
      return orders.filter((o) => o.createdAt >= start);
    }
    if (range === "7d") {
      const start = now - 7 * 24 * 60 * 60 * 1000;
      return orders.filter((o) => o.createdAt >= start);
    }
    return orders;
  }, [orders, range]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const hourly = useMemo(() => computeHourly(filtered), [filtered]);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-white/10 bg-black/80 backdrop-blur sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link to="/" className="w-10 h-10 rounded-xl bg-gradient-ember grid place-items-center font-black shadow-ember">T</Link>
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                Top Burguer <span className="text-amber-warm">| Dashboard</span>
              </h1>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-live" /> Métricas em tempo real
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RangeChip active={range === "today"} onClick={() => setRange("today")}>Hoje</RangeChip>
            <RangeChip active={range === "7d"} onClick={() => setRange("7d")}>7 dias</RangeChip>
            <RangeChip active={range === "all"} onClick={() => setRange("all")}>Tudo</RangeChip>
            <Link to="/kitchen" className="ml-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition">
              Cozinha →
            </Link>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Pedidos" value={String(stats.count)} sub={`${stats.done} concluídos`} accent="ember" />
          <KpiCard label="Faturamento" value={fmtBRL(stats.revenue)} sub={`Ticket médio ${fmtBRL(stats.avgTicket)}`} accent="emerald" />
          <KpiCard label="Tempo médio" value={fmtMin(stats.avgPrepMs)} sub="do pedido à entrega" accent="amber" />
          <KpiCard label="Itens vendidos" value={String(stats.itemsSold)} sub={`${stats.uniqueItems} produtos`} accent="violet" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top items */}
          <section className="lg:col-span-2 rounded-2xl bg-neutral-900 border border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-lg">🔥 Mais vendidos</h2>
              <span className="text-xs text-white/40">Top 8</span>
            </div>
            {stats.topItems.length === 0 ? (
              <EmptyHint label="Sem vendas no período." />
            ) : (
              <ul className="space-y-3">
                {stats.topItems.map((it, idx) => {
                  const pct = stats.topItems[0].qty > 0 ? (it.qty / stats.topItems[0].qty) * 100 : 0;
                  return (
                    <motion.li
                      key={it.menuId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-6 text-center text-xs font-mono text-white/40">{idx + 1}</div>
                      <img src={it.image} alt="" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm">
                          <span className="font-bold truncate">{it.name}</span>
                          <span className="font-mono text-amber-warm">{it.qty}×</span>
                        </div>
                        <div className="h-1.5 mt-1.5 rounded-full bg-white/5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: idx * 0.04 }}
                            className="h-full bg-gradient-ember"
                          />
                        </div>
                      </div>
                      <div className="text-xs text-white/50 font-mono w-20 text-right">{fmtBRL(it.revenue)}</div>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Hourly chart */}
          <section className="rounded-2xl bg-neutral-900 border border-white/10 p-5">
            <h2 className="font-black text-lg mb-4">⏱ Por horário</h2>
            {hourly.every((h) => h === 0) ? (
              <EmptyHint label="Aguardando pedidos." />
            ) : (
              <div className="flex items-end gap-1 h-48">
                {hourly.map((v, h) => {
                  const max = Math.max(...hourly, 1);
                  const pct = (v / max) * 100;
                  return (
                    <div key={h} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-white/5 rounded-t-md relative h-full flex items-end">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${pct}%` }}
                          transition={{ duration: 0.5, delay: h * 0.01 }}
                          className={`w-full rounded-t-md ${v > 0 ? "bg-gradient-ember" : ""}`}
                          title={`${v} pedido(s) às ${h}h`}
                        />
                      </div>
                      {h % 3 === 0 && (
                        <div className="text-[9px] text-white/40 font-mono">{String(h).padStart(2, "0")}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-3 text-xs text-white/40">
              Pico: <span className="text-amber-warm font-bold">{stats.peakHour !== null ? `${String(stats.peakHour).padStart(2, "0")}h` : "—"}</span>
            </div>
          </section>
        </div>

        {/* History table */}
        <section className="rounded-2xl bg-neutral-900 border border-white/10 overflow-hidden">
          <div className="p-5 flex items-center justify-between">
            <h2 className="font-black text-lg">📋 Histórico</h2>
            <span className="text-xs text-white/40">{filtered.length} pedidos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-white/40 border-y border-white/10">
                <tr>
                  <th className="text-left px-5 py-3">#</th>
                  <th className="text-left px-3 py-3">Cliente</th>
                  <th className="text-left px-3 py-3">Itens</th>
                  <th className="text-left px-3 py-3">Status</th>
                  <th className="text-right px-3 py-3">Tempo</th>
                  <th className="text-right px-5 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-white/40">Nenhum pedido no período.</td></tr>
                ) : (
                  filtered.slice(0, 50).map((o) => {
                    const prep = o.doneAt ? o.doneAt - o.createdAt : null;
                    const qty = o.items.reduce((a, b) => a + b.quantity, 0);
                    return (
                      <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                        <td className="px-5 py-3 font-black">#{o.number}</td>
                        <td className="px-3 py-3 truncate max-w-[180px]">{o.customer}</td>
                        <td className="px-3 py-3 text-white/60">{qty} item(ns)</td>
                        <td className="px-3 py-3">
                          <StatusPill status={o.status} />
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-white/70">{prep ? fmtMin(prep) : "—"}</td>
                        <td className="px-5 py-3 text-right font-bold text-amber-warm">{fmtBRL(o.total)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function KpiCard({
  label, value, sub, accent,
}: {
  label: string; value: string; sub: string;
  accent: "ember" | "emerald" | "amber" | "violet";
}) {
  const accentCls = {
    ember: "from-ember/30 to-transparent",
    emerald: "from-emerald-500/30 to-transparent",
    amber: "from-amber-warm/30 to-transparent",
    violet: "from-violet-500/30 to-transparent",
  }[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl border border-white/10 bg-neutral-900 p-5 overflow-hidden`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${accentCls} opacity-60 pointer-events-none`} />
      <div className="relative">
        <div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div>
        <div className="text-3xl font-black mt-1 tabular-nums">{value}</div>
        <div className="text-xs text-white/50 mt-1">{sub}</div>
      </div>
    </motion.div>
  );
}

function RangeChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-xs rounded-lg font-bold border transition ${
        active ? "bg-amber-warm/20 text-amber-warm border-amber-warm/40" : "bg-white/5 border-transparent hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: Order["status"] }) {
  const cfg = {
    pending: { cls: "bg-white/10 text-white/70", label: "Novo" },
    preparing: { cls: "bg-amber-warm/15 text-amber-warm", label: "Preparando" },
    done: { cls: "bg-emerald-500/15 text-emerald-400", label: "Pronto" },
  }[status];
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${cfg.cls}`}>{cfg.label}</span>;
}

function EmptyHint({ label }: { label: string }) {
  return <div className="text-center py-10 text-white/40 text-sm">{label}</div>;
}

function computeStats(orders: Order[]) {
  const done = orders.filter((o) => o.status === "done");
  const revenue = orders.reduce((a, o) => a + o.total, 0);
  const prepTimes = done.filter((o) => o.doneAt).map((o) => o.doneAt! - o.createdAt);
  const avgPrepMs = prepTimes.length ? prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length : 0;

  const itemMap = new Map<string, { menuId: string; name: string; image: string; qty: number; revenue: number }>();
  for (const o of orders) {
    for (const i of o.items) {
      const cur = itemMap.get(i.menuId) ?? { menuId: i.menuId, name: i.name, image: i.image, qty: 0, revenue: 0 };
      cur.qty += i.quantity;
      cur.revenue += i.quantity * i.price;
      itemMap.set(i.menuId, cur);
    }
  }
  const topItems = [...itemMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
  const itemsSold = [...itemMap.values()].reduce((a, b) => a + b.qty, 0);

  const hourly = new Array(24).fill(0) as number[];
  for (const o of orders) hourly[new Date(o.createdAt).getHours()]++;
  let peakHour: number | null = null;
  let peak = 0;
  hourly.forEach((v, h) => { if (v > peak) { peak = v; peakHour = h; } });

  return {
    count: orders.length,
    done: done.length,
    revenue,
    avgTicket: orders.length ? revenue / orders.length : 0,
    avgPrepMs,
    itemsSold,
    uniqueItems: itemMap.size,
    topItems,
    peakHour,
  };
}

function computeHourly(orders: Order[]): number[] {
  const arr = new Array(24).fill(0) as number[];
  for (const o of orders) arr[new Date(o.createdAt).getHours()]++;
  return arr;
}
