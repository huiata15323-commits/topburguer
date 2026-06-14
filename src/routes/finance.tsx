import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useOrders } from "@/lib/orders-store";
import { useExpenses, CATEGORY_LABEL, type ExpenseCategory } from "@/lib/expenses-store";
import { generateReportPDF } from "@/lib/report-pdf";
import { StaffGate } from "@/components/StaffGate";
import { RoleGate } from "@/components/RoleGate";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "Financeiro — Top Burguer" },
      { name: "description", content: "Controle de despesas, lucro e relatórios financeiros." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <RoleGate roles={["admin", "cashier"]}>
      <StaffGate allow={["admin", "caixa"]} title="Financeiro / Caixa">
        <FinancePage />
      </StaffGate>
    </RoleGate>
  ),
});

function startOfDay(d: Date) { const c = new Date(d); c.setHours(0,0,0,0); return c.getTime(); }
function fmtBRL(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtDate(ts: number) { return new Date(ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); }

type Range = "today" | "7d" | "30d" | "all";

function FinancePage() {
  const { orders } = useOrders();
  const { expenses, addExpense, removeExpense, clearAll } = useExpenses();
  const [range, setRange] = useState<Range>("today");

  // form
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("insumos");

  const fromTs = useMemo(() => {
    const now = Date.now();
    if (range === "today") return startOfDay(new Date());
    if (range === "7d") return now - 7 * 86400000;
    if (range === "30d") return now - 30 * 86400000;
    return 0;
  }, [range]);

  const filteredOrders = useMemo(() => orders.filter((o) => o.createdAt >= fromTs), [orders, fromTs]);
  const filteredExpenses = useMemo(() => expenses.filter((e) => e.createdAt >= fromTs), [expenses, fromTs]);

  const revenue = filteredOrders.reduce((a, o) => a + o.total, 0);
  const expenseTotal = filteredExpenses.reduce((a, e) => a + e.amount, 0);
  const profit = revenue - expenseTotal;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const byCategory = useMemo(() => {
    const map: Record<ExpenseCategory, number> = { insumos: 0, contas: 0, salarios: 0, outros: 0 };
    for (const e of filteredExpenses) map[e.category] += e.amount;
    return map;
  }, [filteredExpenses]);

  const submit = () => {
    if (!desc.trim()) return toast.error("Informe a descrição");
    const v = Number(amount.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return toast.error("Valor inválido");
    if (v > 1_000_000) return toast.error("Valor muito alto");
    addExpense({ description: desc.trim().slice(0, 100), amount: v, category });
    setDesc(""); setAmount("");
    toast.success("Despesa registrada");
  };

  const exportCSV = () => {
    const rows: string[] = [];
    rows.push("tipo,data,categoria_ou_cliente,descricao_ou_itens,valor");
    for (const o of filteredOrders) {
      const items = o.items.map((i) => `${i.quantity}x ${i.name}`).join(" | ");
      rows.push([
        "RECEITA",
        new Date(o.createdAt).toISOString(),
        csv(o.customer),
        csv(`#${o.number} — ${items}`),
        o.total.toFixed(2),
      ].join(","));
    }
    for (const e of filteredExpenses) {
      rows.push([
        "DESPESA",
        new Date(e.createdAt).toISOString(),
        CATEGORY_LABEL[e.category],
        csv(e.description),
        e.amount.toFixed(2),
      ].join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `topburguer-financeiro-${range}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  const exportPDF = () => {
    const label = range === "today" ? "Hoje" : range === "7d" ? "Últimos 7 dias" : range === "30d" ? "Últimos 30 dias" : "Histórico completo";
    generateReportPDF({
      orders: filteredOrders,
      expenses: filteredExpenses,
      range: { label, from: fromTs, to: Date.now() },
    });
    toast.success("Relatório PDF gerado");
  };

  const resetFinance = () => {
    if (!confirm("Zerar TODAS as despesas registradas? Esta ação não pode ser desfeita.")) return;
    clearAll();
    toast.success("Financeiro zerado");
  };


  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-white/10 bg-black/80 backdrop-blur sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link to="/" className="w-10 h-10 rounded-xl bg-gradient-ember grid place-items-center font-black shadow-ember">T</Link>
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                Top Burguer <span className="text-amber-warm">| Financeiro</span>
              </h1>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-live" /> Receita · Despesas · Lucro
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(["today","7d","30d","all"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-2 text-xs rounded-lg font-bold border transition ${
                  range === r ? "bg-amber-warm/20 text-amber-warm border-amber-warm/40" : "bg-white/5 border-transparent hover:bg-white/10"
                }`}
              >
                {r === "today" ? "Hoje" : r === "7d" ? "7 dias" : r === "30d" ? "30 dias" : "Tudo"}
              </button>
            ))}
            <button
              onClick={exportPDF}
              className="px-3 py-2 text-xs rounded-lg bg-ember/20 text-ember border border-ember/40 hover:bg-ember/30 font-bold transition"
            >
              📄 Relatório PDF
            </button>
            <button
              onClick={exportCSV}
              className="px-3 py-2 text-xs rounded-lg bg-white/10 hover:bg-white/20 font-bold transition"
            >
              ⬇ CSV
            </button>
            <button
              onClick={resetFinance}
              className="px-3 py-2 text-xs rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/30 font-bold transition"
              title="Zerar todas as despesas"
            >
              🗑 Zerar
            </button>
            <Link to="/dashboard" className="px-3 py-2 text-xs rounded-lg bg-white/10 hover:bg-white/20 font-bold transition">
              Dashboard →
            </Link>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Resumo executivo */}
        <section className="rounded-2xl border border-amber-warm/30 bg-gradient-to-br from-amber-warm/10 to-transparent p-6">
          <div className="text-[10px] uppercase tracking-widest text-amber-warm font-bold mb-2">Resumo executivo</div>
          <p className="text-lg text-white/90 leading-relaxed">
            No período, você {profit >= 0 ? "lucrou" : "teve prejuízo de"}{" "}
            <span className={`font-black ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {fmtBRL(Math.abs(profit))}
            </span>{" "}
            — recebeu <span className="font-bold text-amber-warm">{fmtBRL(revenue)}</span> em{" "}
            <span className="font-bold">{filteredOrders.length}</span> pedidos e gastou{" "}
            <span className="font-bold text-red-300">{fmtBRL(expenseTotal)}</span> em{" "}
            <span className="font-bold">{filteredExpenses.length}</span> despesas.
            {revenue > 0 && (
              <> Margem de lucro: <span className="font-bold">{margin.toFixed(1)}%</span>.</>
            )}
          </p>
        </section>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi label="Receita" value={fmtBRL(revenue)} sub={`${filteredOrders.length} pedidos`} tone="emerald" />
          <Kpi label="Despesas" value={fmtBRL(expenseTotal)} sub={`${filteredExpenses.length} lançamentos`} tone="red" />
          <Kpi label="Lucro líquido" value={fmtBRL(profit)} sub={`Margem ${margin.toFixed(1)}%`} tone={profit >= 0 ? "ember" : "red"} />
          <Kpi label="Ticket médio" value={fmtBRL(filteredOrders.length ? revenue / filteredOrders.length : 0)} sub="por pedido" tone="amber" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Lista de despesas */}
          <section className="rounded-2xl bg-neutral-900 border border-white/10 overflow-hidden">
            <div className="p-5 flex items-center justify-between">
              <h2 className="font-black text-lg">💸 Despesas</h2>
              <span className="text-xs text-white/40">{filteredExpenses.length} no período</span>
            </div>

            {/* Categoria breakdown */}
            <div className="px-5 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(byCategory) as ExpenseCategory[]).map((k) => (
                <div key={k} className="rounded-lg bg-white/5 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-white/50">{CATEGORY_LABEL[k]}</div>
                  <div className="text-sm font-bold text-white/90">{fmtBRL(byCategory[k])}</div>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto border-t border-white/10">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-widest text-white/40 border-b border-white/10">
                  <tr>
                    <th className="text-left px-5 py-3">Data</th>
                    <th className="text-left px-3 py-3">Descrição</th>
                    <th className="text-left px-3 py-3">Categoria</th>
                    <th className="text-right px-3 py-3">Valor</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {filteredExpenses.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-white/40">Nenhuma despesa no período.</td></tr>
                    ) : filteredExpenses.map((e) => (
                      <motion.tr
                        key={e.id}
                        layout
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="border-b border-white/5 hover:bg-white/[0.03]"
                      >
                        <td className="px-5 py-3 text-white/60 font-mono text-xs">{fmtDate(e.createdAt)}</td>
                        <td className="px-3 py-3 truncate max-w-[260px]">{e.description}</td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white/70">
                            {CATEGORY_LABEL[e.category]}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-red-300">{fmtBRL(e.amount)}</td>
                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={() => { removeExpense(e.id); toast.success("Removida"); }}
                            className="text-xs text-white/40 hover:text-red-400 transition"
                            title="Remover"
                          >
                            ✕
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </section>

          {/* Formulário nova despesa */}
          <section className="rounded-2xl bg-neutral-900 border border-white/10 p-5 self-start lg:sticky lg:top-24">
            <h2 className="font-black text-lg mb-4">➕ Nova despesa</h2>
            <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1">Descrição</label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              maxLength={100}
              placeholder="Ex: Caixa de pão brioche"
              className="w-full px-3 py-2.5 rounded-xl bg-neutral-800 border border-white/10 focus:border-amber-warm focus:outline-none mb-3"
            />
            <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1">Valor (R$)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
              inputMode="decimal"
              placeholder="0,00"
              className="w-full px-3 py-2.5 rounded-xl bg-neutral-800 border border-white/10 focus:border-amber-warm focus:outline-none mb-3 font-mono"
            />
            <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1">Categoria</label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(Object.keys(CATEGORY_LABEL) as ExpenseCategory[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setCategory(k)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${
                    category === k
                      ? "bg-amber-warm/20 text-amber-warm border-amber-warm/40"
                      : "bg-white/5 border-transparent hover:bg-white/10 text-white/70"
                  }`}
                >
                  {CATEGORY_LABEL[k]}
                </button>
              ))}
            </div>
            <button
              onClick={submit}
              className="w-full py-3 rounded-xl bg-gradient-ember text-charcoal font-bold shadow-ember hover:brightness-110 transition active:scale-[0.98]"
            >
              Registrar despesa
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "emerald" | "red" | "ember" | "amber" }) {
  const grad = {
    emerald: "from-emerald-500/30",
    red: "from-red-500/30",
    ember: "from-ember/30",
    amber: "from-amber-warm/30",
  }[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl border border-white/10 bg-neutral-900 p-5 overflow-hidden"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${grad} to-transparent opacity-60 pointer-events-none`} />
      <div className="relative">
        <div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div>
        <div className="text-3xl font-black mt-1 tabular-nums">{value}</div>
        <div className="text-xs text-white/50 mt-1">{sub}</div>
      </div>
    </motion.div>
  );
}

function csv(s: string) {
  const needs = /[",\n]/.test(s);
  const esc = s.replace(/"/g, '""');
  return needs ? `"${esc}"` : esc;
}
