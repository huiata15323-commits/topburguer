// Encerramento do dia: gera um PDF-resumo de todos os pedidos
// e, em seguida, zera a base — pronto pra próxima simulação.
import { useMemo, useState } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { useOrders, type Order } from "@/lib/orders-store";

function fmtDate(d: Date) {
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function buildPdf(orders: Order[]): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = M;

  const done = orders.filter((o) => o.status === "done");
  const revenue = done.reduce((s, o) => s + o.total, 0);
  const rated = done.filter((o) => o.rating);
  const avgRating = rated.length
    ? rated.reduce((s, o) => s + (o.rating ?? 0), 0) / rated.length
    : 0;
  const itemCounts = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of done) {
    for (const it of o.items) {
      const cur = itemCounts.get(it.menuId) ?? { name: it.name, qty: 0, revenue: 0 };
      cur.qty += it.quantity;
      cur.revenue += it.price * it.quantity;
      itemCounts.set(it.menuId, cur);
    }
  }
  const topItems = [...itemCounts.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);
  const avgPrepMin = done.length
    ? done.reduce((s, o) => s + ((o.doneAt ?? o.createdAt) - o.createdAt), 0) /
      done.length /
      60000
    : 0;

  // Cabeçalho
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(255, 167, 38);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("TOP BURGUER", M, 32);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório de encerramento", M, 50);
  doc.setFontSize(9);
  doc.text(fmtDate(new Date()), W - M, 50, { align: "right" });

  y = 95;
  doc.setTextColor(20, 20, 20);

  // KPIs
  const kpis: [string, string][] = [
    ["Pedidos concluídos", String(done.length)],
    ["Faturamento", `R$ ${revenue.toFixed(2)}`],
    ["Ticket médio", `R$ ${(done.length ? revenue / done.length : 0).toFixed(2)}`],
    ["Tempo médio", `${avgPrepMin.toFixed(1)} min`],
    ["Avaliações", rated.length ? `${avgRating.toFixed(1)} ★ (${rated.length})` : "—"],
  ];
  const colW = (W - M * 2) / kpis.length;
  kpis.forEach(([label, value], i) => {
    const x = M + colW * i;
    doc.setDrawColor(220);
    doc.roundedRect(x + 4, y, colW - 8, 56, 6, 6);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(label.toUpperCase(), x + 12, y + 18);
    doc.setFontSize(13);
    doc.setTextColor(20);
    doc.setFont("helvetica", "bold");
    doc.text(value, x + 12, y + 40);
    doc.setFont("helvetica", "normal");
  });
  y += 80;

  // Top itens
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Top itens vendidos", M, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (topItems.length === 0) {
    doc.setTextColor(150);
    doc.text("Sem itens vendidos.", M, y);
    y += 16;
    doc.setTextColor(20);
  } else {
    topItems.forEach((it, i) => {
      doc.text(`${i + 1}. ${it.name}`, M, y);
      doc.text(`${it.qty}x`, W - M - 100, y, { align: "right" });
      doc.text(`R$ ${it.revenue.toFixed(2)}`, W - M, y, { align: "right" });
      y += 14;
    });
  }
  y += 10;

  // Lista de pedidos
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Pedidos do dia", M, y);
  y += 16;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("#", M, y);
  doc.text("Cliente", M + 35, y);
  doc.text("Mesa", M + 180, y);
  doc.text("Status", M + 225, y);
  doc.text("Itens", M + 285, y);
  doc.text("Nota", M + 330, y);
  doc.text("Total", W - M, y, { align: "right" });
  y += 6;
  doc.setDrawColor(200);
  doc.line(M, y, W - M, y);
  y += 12;
  doc.setFont("helvetica", "normal");

  const sorted = [...orders].sort((a, b) => a.number - b.number);
  for (const o of sorted) {
    if (y > 780) {
      doc.addPage();
      y = M;
    }
    const qty = o.items.reduce((s, i) => s + i.quantity, 0);
    doc.text(String(o.number), M, y);
    doc.text(o.customer.slice(0, 22), M + 35, y);
    doc.text(o.tableNumber ? String(o.tableNumber) : "—", M + 180, y);
    doc.text(
      o.status === "done" ? "Concluído" : o.status === "preparing" ? "Em preparo" : "Recebido",
      M + 225,
      y
    );
    doc.text(String(qty), M + 285, y);
    doc.text(o.rating ? `${o.rating}★` : "—", M + 330, y);
    doc.text(`R$ ${o.total.toFixed(2)}`, W - M, y, { align: "right" });
    y += 13;
  }

  // Rodapé
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`Top Burguer · Página ${p}/${pages}`, W / 2, 825, { align: "center" });
  }
  return doc;
}

export function EndOfDayCard() {
  const { orders, clearAll } = useOrders();
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const fetchSummary = useServerFn(generateDaySummary);

  const summary = useMemo(() => {
    const done = orders.filter((o) => o.status === "done");
    const revenue = done.reduce((s, o) => s + o.total, 0);
    return { total: orders.length, done: done.length, revenue };
  }, [orders]);

  const handleClose = async () => {
    if (orders.length === 0) {
      toast.error("Nenhum pedido para encerrar.");
      return;
    }
    if (
      !confirm(
        `Encerrar o dia?\n\n• ${summary.done} concluídos · R$ ${summary.revenue.toFixed(2)}\n• ${summary.total} pedidos no total\n\nUm PDF será baixado e TODOS os pedidos serão apagados do sistema.`
      )
    )
      return;
    setBusy(true);
    try {
      const doc = buildPdf(orders);
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      doc.save(`top-burguer_${stamp}.pdf`);
      await clearAll();
      toast.success("Dia encerrado! Relatório salvo.");
    } catch (e) {
      console.error(e);
      toast.error("Falha ao encerrar o dia.");
    } finally {
      setBusy(false);
    }
  };

  const handlePreview = () => {
    if (orders.length === 0) return toast.error("Sem pedidos.");
    const doc = buildPdf(orders);
    doc.output("dataurlnewwindow");
  };

  const handleAiSummary = async () => {
    if (orders.length === 0) return toast.error("Sem pedidos para resumir.");
    setAiBusy(true);
    setAiSummary(null);
    try {
      const done = orders.filter((o) => o.status === "done");
      const revenue = done.reduce((s, o) => s + o.total, 0);
      const avgTicket = done.length ? revenue / done.length : 0;
      const avgPrepMin = done.length
        ? done.reduce((s, o) => s + ((o.doneAt ?? o.createdAt) - o.createdAt), 0) / done.length / 60000
        : 0;
      const rated = done.filter((o) => o.rating);
      const avgRating = rated.length
        ? rated.reduce((s, o) => s + (o.rating ?? 0), 0) / rated.length
        : 0;
      const hourly = new Array(24).fill(0) as number[];
      for (const o of orders) hourly[new Date(o.createdAt).getHours()]++;
      let peakHour: number | null = null;
      let peakHourCount = 0;
      hourly.forEach((c, h) => {
        if (c > peakHourCount) { peakHourCount = c; peakHour = h; }
      });
      const counts = new Map<string, { name: string; qty: number; revenue: number }>();
      for (const o of done) {
        for (const it of o.items) {
          const cur = counts.get(it.menuId) ?? { name: it.name, qty: 0, revenue: 0 };
          cur.qty += it.quantity;
          cur.revenue += it.price * it.quantity;
          counts.set(it.menuId, cur);
        }
      }
      const topItems = [...counts.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

      const res = await fetchSummary({
        data: {
          doneCount: done.length,
          totalCount: orders.length,
          revenue,
          avgTicket,
          avgPrepMin,
          avgRating,
          ratingsCount: rated.length,
          peakHour: peakHourCount > 0 ? peakHour : null,
          peakHourCount,
          topItems,
          hourlyCounts: hourly,
        },
      });
      setAiSummary(res.summary);
    } catch (e) {
      console.error(e);
      toast.error("Falha ao gerar resumo com IA.");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border-2 border-amber-warm/30 bg-gradient-to-br from-amber-warm/10 via-card to-card p-5 shadow-card-soft">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-black text-lg flex items-center gap-2">
            <span className="text-2xl">🏁</span> Encerrar dia
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Gera um PDF com o resumo do expediente e zera todos os pedidos.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Faturamento atual</div>
          <div className="text-2xl font-black text-ember">R$ {summary.revenue.toFixed(2)}</div>
          <div className="text-[11px] text-muted-foreground">
            {summary.done} concluídos · {summary.total} total
          </div>
        </div>
      </div>

      {/* Resumo executivo por IA */}
      <div className="mt-4 rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-500/10 via-fuchsia-500/5 to-transparent p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <div>
              <div className="font-bold text-sm">Resumo do dia (IA)</div>
              <div className="text-[11px] text-muted-foreground">Análise executiva gerada por inteligência artificial</div>
            </div>
          </div>
          <button
            onClick={handleAiSummary}
            disabled={aiBusy || orders.length === 0}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold text-xs shadow-md hover:brightness-110 disabled:opacity-40 transition"
          >
            {aiBusy ? "Analisando…" : aiSummary ? "↻ Gerar de novo" : "✨ Gerar resumo"}
          </button>
        </div>
        {aiSummary && (
          <div className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 bg-background/50 rounded-xl p-3 border border-border">
            {aiSummary}
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2 flex-wrap">
        <button
          onClick={handlePreview}
          disabled={busy || orders.length === 0}
          className="flex-1 py-2.5 rounded-xl bg-muted hover:bg-secondary font-bold text-sm disabled:opacity-40"
        >
          👁 Pré-visualizar PDF
        </button>
        <button
          onClick={handleClose}
          disabled={busy || orders.length === 0}
          className="flex-1 py-2.5 rounded-xl bg-gradient-ember text-ember-foreground font-bold text-sm shadow-ember disabled:opacity-40"
        >
          {busy ? "Encerrando…" : "🏁 Baixar PDF e encerrar"}
        </button>
      </div>
    </section>
  );
}
