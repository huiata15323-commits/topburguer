import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { useOrders, type Order } from "@/lib/orders-store";
import { useExpenses } from "@/lib/expenses-store";
import { generateReportPDF } from "@/lib/report-pdf";
import { StaffGate } from "@/components/StaffGate";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Top Burguer" },
      { name: "description", content: "Painel interativo com métricas, gráficos e relatórios." },
    ],
  }),
  component: () => (
    <StaffGate area="dashboard" allow={["admin"]} title="Dashboard">
      <DashboardPage />
    </StaffGate>
  ),
});

type Range = "today" | "7d" | "30d" | "all";

function startOfDay(d: Date) { const c = new Date(d); c.setHours(0, 0, 0, 0); return c.getTime(); }
function fmtBRL(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtMin(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${String(r).padStart(2, "0")}s` : `${r}s`;
}

const PIE_COLORS = ["#ff8a3d", "#ffa826", "#10b981", "#6366f1", "#ec4899", "#06b6d4", "#f43f5e", "#a855f7"];

function DashboardPage() {
  const { orders, clearAll } = useOrders();
  const { expenses } = useExpenses();
  const [range, setRange] = useState<Range>("today");
  const [statusFilter, setStatusFilter] = useState<"all" | Order["status"]>("all");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const fromTs = useMemo(() => {
    const now = Date.now();
    if (range === "today") return startOfDay(new Date());
    if (range === "7d") return now - 7 * 86400000;
    if (range === "30d") return now - 30 * 86400000;
    return 0;
  }, [range]);

  const filtered = useMemo(
    () => orders.filter((o) => o.createdAt >= fromTs && (statusFilter === "all" || o.status === statusFilter)),
    [orders, fromTs, statusFilter]
  );
  const filteredExpenses = useMemo(() => expenses.filter((e) => e.createdAt >= fromTs), [expenses, fromTs]);

  // Período anterior (mesma duração) para comparação
  const previousRevenue = useMemo(() => {
    if (range === "all" || fromTs === 0) return null;
    const duration = Date.now() - fromTs;
    const prevFrom = fromTs - duration;
    return orders
      .filter((o) => o.createdAt >= prevFrom && o.createdAt < fromTs)
      .reduce((a, o) => a + o.total, 0);
  }, [orders, fromTs, range]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const trend = useMemo(() => computeTrend(filtered, range), [filtered, range]);
  const expenseTotal = filteredExpenses.reduce((a, e) => a + e.amount, 0);
  const profit = stats.revenue - expenseTotal;
  const donePct = stats.count > 0 ? Math.round((stats.done / stats.count) * 100) : 0;
  const tablesServed = useMemo(
    () => new Set(filtered.filter((o) => o.tableNumber).map((o) => o.tableNumber)).size,
    [filtered]
  );
  const revenueDelta = previousRevenue !== null && previousRevenue > 0
    ? ((stats.revenue - previousRevenue) / previousRevenue) * 100
    : null;

  const pieData = stats.topItems.map((it) => ({ name: it.name, value: it.qty }));

  const rangeLabel = range === "today" ? "Hoje" : range === "7d" ? "Últimos 7 dias" : range === "30d" ? "Últimos 30 dias" : "Histórico completo";

  const exportPDF = () => {
    generateReportPDF({
      orders: filtered,
      expenses: filteredExpenses,
      range: { label: rangeLabel, from: fromTs, to: Date.now() },
    });
    toast.success("Relatório PDF gerado");
  };

  const exportCSV = () => {
    const header = ["numero","cliente","telefone","mesa","itens","status","total","criado_em","concluido_em","avaliacao"];
    const rows = filtered.map((o) => [
      o.number,
      `"${(o.customer ?? "").replace(/"/g, '""')}"`,
      o.phone ?? "",
      o.tableNumber ?? "",
      o.items.reduce((a, b) => a + b.quantity, 0),
      o.status,
      o.total.toFixed(2).replace(".", ","),
      new Date(o.createdAt).toLocaleString("pt-BR"),
      o.doneAt ? new Date(o.doneAt).toLocaleString("pt-BR") : "",
      o.rating ?? "",
    ].join(";"));
    const csv = "\uFEFF" + [header.join(";"), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedidos-${rangeLabel.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  const resetOrders = () => {
    if (!confirm("Zerar TODOS os pedidos e reiniciar o contador? Esta ação não pode ser desfeita.")) return;
    clearAll();
    toast.success("Pedidos zerados");
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(255,138,61,0.08),_transparent_60%),_#0a0a0b] text-white">
      <header className="relative overflow-hidden border-b border-white/10 bg-gradient-night sticky top-0 z-10 backdrop-blur">
        <div className="kitchen-aurora opacity-60 pointer-events-none" aria-hidden />
        <div className="kitchen-grid pointer-events-none" aria-hidden />
        <div className="relative px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="w-11 h-11 rounded-2xl bg-gradient-ember grid place-items-center font-black shadow-ember ring-2 ring-white/10 text-lg">T</Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight truncate">
                Top Burguer <span className="bg-gradient-amber bg-clip-text text-transparent">| Dashboard</span>
              </h1>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-live" />
                Tempo real · <span className="text-amber-warm">{rangeLabel}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
              {(["today","7d","30d","all"] as Range[]).map((r) => (
                <Chip key={r} active={range === r} onClick={() => setRange(r)}>
                  {r === "today" ? "Hoje" : r === "7d" ? "7d" : r === "30d" ? "30d" : "Tudo"}
                </Chip>
              ))}
            </div>
            <button
              onClick={exportPDF}
              className="px-3 py-2 text-xs rounded-lg bg-ember/20 text-ember border border-ember/40 hover:bg-ember/30 hover:scale-105 font-bold transition-all"
            >
              📄 PDF
            </button>
            <button
              onClick={exportCSV}
              className="px-3 py-2 text-xs rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 hover:scale-105 font-bold transition-all"
              title="Exportar pedidos para CSV (Excel)"
            >
              📊 CSV
            </button>
            <button
              onClick={resetOrders}
              className="px-3 py-2 text-xs rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25 hover:scale-105 border border-red-500/30 font-bold transition-all"
              title="Zerar pedidos"
            >
              🗑 Zerar
            </button>
            <Link to="/finance" className="px-3 py-2 text-xs rounded-lg bg-white/10 hover:bg-white/20 hover:scale-105 font-bold transition-all">
              Financeiro →
            </Link>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* KPIs clicáveis */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard label="Pedidos" value={String(stats.count)} sub={`${stats.done} concluídos`} accent="ember" icon="🧾"
            active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
          <KpiCard label="Novos" value={String(stats.pending)} sub="aguardando" accent="amber" icon="🆕"
            active={statusFilter === "pending"} onClick={() => setStatusFilter("pending")} />
          <KpiCard label="Preparando" value={String(stats.preparing)} sub="em produção" accent="ember" icon="🍳"
            active={statusFilter === "preparing"} onClick={() => setStatusFilter("preparing")} />
          <KpiCard
            label="Faturamento"
            value={fmtBRL(stats.revenue)}
            icon="💰"
            sub={
              revenueDelta !== null
                ? `${revenueDelta >= 0 ? "▲" : "▼"} ${Math.abs(revenueDelta).toFixed(1)}% vs anterior`
                : `Ticket ${fmtBRL(stats.avgTicket)}`
            }
            accent="emerald"
          />
          <KpiCard label="Lucro" value={fmtBRL(profit)} icon={profit >= 0 ? "📈" : "📉"} sub={`Despesas ${fmtBRL(expenseTotal)}`} accent={profit >= 0 ? "violet" : "red"} />
        </div>

        {/* KPIs secundários */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Tempo médio preparo" value={fmtMin(stats.avgPrepMs)} sub={`${stats.done} concluídos`} accent="amber" icon="⏱" />
          <KpiCard label="Itens vendidos" value={String(stats.itemsSold)} sub={`${stats.uniqueItems} produtos`} accent="ember" icon="🍔" />
          <KpiCard label="Mesas atendidas" value={String(tablesServed)} sub="únicas no período" accent="violet" icon="🪑" />
          <KpiCard label="Taxa de conclusão" value={`${donePct}%`} sub={`${stats.done}/${stats.count} pedidos`} accent={donePct >= 80 ? "emerald" : "amber"} icon="✅" />
        </div>

        {/* Trend line chart */}
        <section className="rounded-2xl bg-neutral-900 border border-white/10 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-lg">📈 Receita ao longo do tempo</h2>
            <span className="text-xs text-white/40">{trend.bucketLabel}</span>
          </div>
          {trend.data.every((d) => d.revenue === 0) ? (
            <EmptyHint label="Sem dados no período." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="label" stroke="#ffffff60" fontSize={11} />
                  <YAxis stroke="#ffffff60" fontSize={11} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    contentStyle={{ background: "#0a0a0a", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#ffa826" }}
                    formatter={(v: number) => fmtBRL(v)}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#ffa826" strokeWidth={2.5} dot={{ fill: "#ff8a3d", r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie + Bar */}
          <section className="rounded-2xl bg-neutral-900 border border-white/10 p-5">
            <h2 className="font-black text-lg mb-3">🥧 Distribuição de itens</h2>
            {pieData.length === 0 ? (
              <EmptyHint label="Sem vendas." />
            ) : (
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData} dataKey="value" nameKey="name"
                      innerRadius={50} outerRadius={90} paddingAngle={2}
                      onClick={(d: { name: string }) => setSelectedItem((cur) => (cur === d.name ? null : d.name))}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}
                          stroke={selectedItem === pieData[i].name ? "#fff" : "transparent"}
                          strokeWidth={2}
                          style={{ cursor: "pointer", opacity: selectedItem && selectedItem !== pieData[i].name ? 0.4 : 1 }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#0a0a0a", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number, n: string) => [`${v} un.`, n]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: "#ffffff80" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {selectedItem && (
              <p className="text-xs text-amber-warm mt-2">Selecionado: <b>{selectedItem}</b> (clique novamente para limpar)</p>
            )}
          </section>

          {/* Hourly bar */}
          <section className="rounded-2xl bg-neutral-900 border border-white/10 p-5">
            <h2 className="font-black text-lg mb-3">⏱ Pedidos por horário</h2>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={stats.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="hour" stroke="#ffffff60" fontSize={11} />
                  <YAxis stroke="#ffffff60" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#0a0a0a", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(h) => `${String(h).padStart(2, "0")}h`}
                    formatter={(v: number) => [`${v} pedido(s)`, "Total"]}
                  />
                  <Bar dataKey="count" fill="#ff8a3d" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-xs text-white/40">
              Pico: <span className="text-amber-warm font-bold">{stats.peakHour !== null ? `${String(stats.peakHour).padStart(2, "0")}h` : "—"}</span>
            </div>
          </section>
        </div>

        {/* Operação e satisfação */}
        <OperationsRow orders={filtered} />



        {/* Top items list */}
        <section className="rounded-2xl bg-neutral-900 border border-white/10 p-5">
          <h2 className="font-black text-lg mb-4">🔥 Mais vendidos</h2>
          {stats.topItems.length === 0 ? (
            <EmptyHint label="Sem vendas no período." />
          ) : (
            <ul className="space-y-3">
              {stats.topItems.map((it, idx) => {
                const pct = stats.topItems[0].qty > 0 ? (it.qty / stats.topItems[0].qty) * 100 : 0;
                const isSel = selectedItem === it.name;
                return (
                  <motion.li
                    key={it.menuId}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => setSelectedItem(isSel ? null : it.name)}
                    className={`flex items-center gap-3 cursor-pointer rounded-lg p-1.5 -m-1.5 transition ${isSel ? "bg-amber-warm/10" : "hover:bg-white/[0.03]"}`}
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
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
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

        {/* History table */}
        <section className="rounded-2xl bg-neutral-900 border border-white/10 overflow-hidden">
          <div className="p-5 flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-black text-lg">📋 Histórico</h2>
            <span className="text-xs text-white/40">
              {filtered.length} pedidos · filtro: {statusFilter === "all" ? "todos" : statusFilter}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-white/40 border-y border-white/10">
                <tr>
                  <th className="text-left px-5 py-3">#</th>
                  <th className="text-left px-3 py-3">Cliente</th>
                  <th className="text-left px-3 py-3">Telefone</th>
                  <th className="text-left px-3 py-3">Itens</th>
                  <th className="text-left px-3 py-3">Status</th>
                  <th className="text-right px-3 py-3">Tempo</th>
                  <th className="text-right px-5 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-white/40">Nenhum pedido no período.</td></tr>
                ) : (
                  filtered.slice(0, 100).map((o) => {
                    const prep = o.doneAt ? o.doneAt - o.createdAt : null;
                    const qty = o.items.reduce((a, b) => a + b.quantity, 0);
                    return (
                      <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                        <td className="px-5 py-3 font-black">#{o.number}</td>
                        <td className="px-3 py-3 truncate max-w-[160px]">{o.customer}</td>
                        <td className="px-3 py-3 text-xs text-white/50 font-mono">{o.phone ? "📱" : "—"}</td>
                        <td className="px-3 py-3 text-white/60">{qty} item(ns)</td>
                        <td className="px-3 py-3"><StatusPill status={o.status} /></td>
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
  label, value, sub, accent, active, onClick,
}: {
  label: string; value: string; sub: string;
  accent: "ember" | "emerald" | "amber" | "violet" | "red";
  active?: boolean; onClick?: () => void;
}) {
  const accentCls = {
    ember: "from-ember/30 to-transparent",
    emerald: "from-emerald-500/30 to-transparent",
    amber: "from-amber-warm/30 to-transparent",
    violet: "from-violet-500/30 to-transparent",
    red: "from-red-500/30 to-transparent",
  }[accent];
  const Comp = onClick ? "button" : "div";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl border bg-neutral-900 p-4 overflow-hidden text-left transition ${active ? "border-amber-warm/60 shadow-tv-glow" : "border-white/10"}`}
    >
      <Comp onClick={onClick} className="block w-full text-left">
        <div className={`absolute inset-0 bg-gradient-to-br ${accentCls} opacity-60 pointer-events-none`} />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div>
          <div className="text-2xl font-black mt-1 tabular-nums">{value}</div>
          <div className="text-[11px] text-white/50 mt-1">{sub}</div>
        </div>
      </Comp>
    </motion.div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

function OperationsRow({ orders }: { orders: Order[] }) {
  const done = orders.filter((o) => o.status === "done" && o.doneAt);
  const fast = done.filter((o) => (o.doneAt! - o.createdAt) <= 10 * 60000).length;
  const fastPct = done.length ? Math.round((fast / done.length) * 100) : 0;
  const rated = orders.filter((o) => o.rating);
  const avgRating = rated.length
    ? rated.reduce((s, o) => s + (o.rating ?? 0), 0) / rated.length
    : 0;
  const ratingDist = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    count: rated.filter((o) => o.rating === s).length,
  }));
  const waiterCalls = orders.filter((o) => o.waiterCalledAt).length;

  // Mesas (heatmap)
  const tableMap = new Map<number, { orders: number; revenue: number }>();
  for (const o of orders) {
    if (!o.tableNumber) continue;
    const cur = tableMap.get(o.tableNumber) ?? { orders: 0, revenue: 0 };
    cur.orders++;
    cur.revenue += o.total;
    tableMap.set(o.tableNumber, cur);
  }
  const tables = [...tableMap.entries()]
    .map(([n, v]) => ({ n, ...v }))
    .sort((a, b) => b.orders - a.orders);
  const maxOrders = tables[0]?.orders ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Performance */}
      <section className="rounded-2xl bg-neutral-900 border border-white/10 p-5">
        <h2 className="font-black text-lg mb-4">⚡ Performance da cozinha</h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
            <div className="text-[10px] uppercase tracking-widest text-emerald-300">Em até 10 min</div>
            <div className="text-3xl font-black text-emerald-400 tabular-nums">{fastPct}%</div>
            <div className="text-[11px] text-white/50">{fast} de {done.length} pedidos</div>
          </div>
          <div className="rounded-xl bg-amber-warm/10 border border-amber-warm/30 p-3">
            <div className="text-[10px] uppercase tracking-widest text-amber-warm">Chamadas atendente</div>
            <div className="text-3xl font-black text-amber-warm tabular-nums">{waiterCalls}</div>
            <div className="text-[11px] text-white/50">no período</div>
          </div>
        </div>
        <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Velocidade</div>
        <div className="h-3 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-amber-warm to-red-500"
            style={{ width: `${Math.max(5, fastPct)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-white/40 mt-1">
          <span>🐢 Lento</span>
          <span>🚀 Rápido</span>
        </div>
      </section>

      {/* Satisfação */}
      <section className="rounded-2xl bg-neutral-900 border border-white/10 p-5">
        <h2 className="font-black text-lg mb-4">⭐ Satisfação</h2>
        {rated.length === 0 ? (
          <EmptyHint label="Sem avaliações ainda." />
        ) : (
          <>
            <div className="flex items-baseline gap-2 mb-3">
              <div className="text-5xl font-black text-amber-warm tabular-nums">
                {avgRating.toFixed(1)}
              </div>
              <div className="text-xl">
                {"★".repeat(Math.round(avgRating))}
                <span className="text-white/20">{"★".repeat(5 - Math.round(avgRating))}</span>
              </div>
              <div className="text-xs text-white/40 ml-auto">{rated.length} avaliações</div>
            </div>
            <ul className="space-y-1.5">
              {ratingDist.map((r) => {
                const pct = rated.length ? (r.count / rated.length) * 100 : 0;
                return (
                  <li key={r.stars} className="flex items-center gap-2 text-xs">
                    <span className="w-8 text-white/60 tabular-nums">{r.stars}★</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full bg-amber-warm" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-white/50 tabular-nums">{r.count}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {/* Heatmap de mesas */}
      <section className="rounded-2xl bg-neutral-900 border border-white/10 p-5">
        <h2 className="font-black text-lg mb-4">🪑 Mesas mais ativas</h2>
        {tables.length === 0 ? (
          <EmptyHint label="Sem pedidos por mesa." />
        ) : (
          <>
            <div className="grid grid-cols-5 gap-1.5 mb-4">
              {tables.slice(0, 20).map((t) => {
                const intensity = maxOrders ? t.orders / maxOrders : 0;
                return (
                  <div
                    key={t.n}
                    title={`Mesa ${t.n} · ${t.orders} pedido(s) · R$ ${t.revenue.toFixed(2)}`}
                    className="aspect-square rounded-lg grid place-items-center text-xs font-black border border-white/10 transition-transform hover:scale-110 cursor-help"
                    style={{
                      background: `rgba(255, 138, 61, ${0.15 + intensity * 0.65})`,
                    }}
                  >
                    {t.n}
                  </div>
                );
              })}
            </div>
            <ul className="space-y-1 text-xs">
              {tables.slice(0, 3).map((t, i) => (
                <li key={t.n} className="flex items-center gap-2">
                  <span className="text-amber-warm font-black">{["🥇","🥈","🥉"][i]}</span>
                  <span className="font-bold">Mesa {t.n}</span>
                  <span className="text-white/40 ml-auto tabular-nums">
                    {t.orders} ped · R$ {t.revenue.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}


function computeStats(orders: Order[]) {
  const done = orders.filter((o) => o.status === "done");
  const pending = orders.filter((o) => o.status === "pending").length;
  const preparing = orders.filter((o) => o.status === "preparing").length;
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
  const hourlyData = hourly.map((count, hour) => ({ hour: String(hour).padStart(2, "0"), count }));

  return {
    count: orders.length,
    done: done.length,
    pending,
    preparing,
    revenue,
    avgTicket: orders.length ? revenue / orders.length : 0,
    avgPrepMs,
    itemsSold,
    uniqueItems: itemMap.size,
    topItems,
    peakHour,
    hourlyData,
  };
}

function computeTrend(orders: Order[], range: Range) {
  // today / 7d / 30d → diferentes granularidades
  if (range === "today") {
    // por hora (24 buckets)
    const buckets = Array.from({ length: 24 }, (_, h) => ({ label: `${String(h).padStart(2, "0")}h`, revenue: 0, count: 0 }));
    for (const o of orders) {
      const h = new Date(o.createdAt).getHours();
      buckets[h].revenue += o.total;
      buckets[h].count++;
    }
    return { data: buckets, bucketLabel: "por hora" };
  }
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 30;
  const today = startOfDay(new Date());
  const buckets = Array.from({ length: days }, (_, i) => {
    const day = today - (days - 1 - i) * 86400000;
    return { ts: day, label: new Date(day).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), revenue: 0, count: 0 };
  });
  for (const o of orders) {
    const day = startOfDay(new Date(o.createdAt));
    const b = buckets.find((x) => x.ts === day);
    if (b) { b.revenue += o.total; b.count++; }
  }
  return { data: buckets, bucketLabel: range === "all" ? "últimos 30 dias" : "por dia" };
}
