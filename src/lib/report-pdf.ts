// Gera relatório PDF consolidado (financeiro + operacional) usando jsPDF.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Order } from "./orders-store";
import type { Expense } from "./expenses-store";
import { CATEGORY_LABEL } from "./expenses-store";
import { getBranding } from "./branding";

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type ReportRange = { label: string; from: number; to: number };

export function generateReportPDF(opts: {
  orders: Order[];
  expenses: Expense[];
  range: ReportRange;
}) {
  const { orders, expenses, range } = opts;
  const brand = getBranding();
  const brandName = (brand.name || "Loja").toUpperCase();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // ===== Header bar
  doc.setFillColor(15, 15, 18);
  doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(255, 168, 38);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(brandName, 40, 38);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório Geral · Financeiro & Operacional", 40, 56);
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text(
    `Período: ${range.label}   ·   Gerado em ${new Date().toLocaleString("pt-BR")}`,
    W - 40,
    56,
    { align: "right" }
  );

  // ===== KPIs
  const revenue = orders.reduce((a, o) => a + o.total, 0);
  const expenseTotal = expenses.reduce((a, e) => a + e.amount, 0);
  const profit = revenue - expenseTotal;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const avgTicket = orders.length ? revenue / orders.length : 0;
  const done = orders.filter((o) => o.status === "done");
  const prepTimes = done.filter((o) => o.doneAt).map((o) => (o.doneAt! - o.createdAt) / 1000);
  const avgPrep = prepTimes.length ? prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length : 0;

  let y = 100;
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Resumo Executivo", 40, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(70, 70, 70);
  const summary =
    `No período, a operação ${profit >= 0 ? "lucrou" : "teve prejuízo de"} ${BRL(Math.abs(profit))}. ` +
    `Foram ${orders.length} pedidos somando ${BRL(revenue)} em receita e ${expenses.length} despesas totalizando ${BRL(expenseTotal)}. ` +
    (revenue > 0 ? `Margem de lucro de ${margin.toFixed(1)}%. ` : "") +
    `Ticket médio: ${BRL(avgTicket)}.`;
  const lines = doc.splitTextToSize(summary, W - 80);
  doc.text(lines, 40, y);
  y += lines.length * 13 + 10;

  // KPI cards
  const kpis = [
    { label: "Receita", value: BRL(revenue), color: [16, 185, 129] },
    { label: "Despesas", value: BRL(expenseTotal), color: [239, 68, 68] },
    { label: "Lucro", value: BRL(profit), color: profit >= 0 ? [255, 168, 38] : [239, 68, 68] },
    { label: "Margem", value: `${margin.toFixed(1)}%`, color: [99, 102, 241] },
  ];
  const cw = (W - 80 - 30) / 4;
  kpis.forEach((k, i) => {
    const x = 40 + i * (cw + 10);
    doc.setFillColor(248, 248, 250);
    doc.roundedRect(x, y, cw, 56, 6, 6, "F");
    doc.setFillColor(k.color[0], k.color[1], k.color[2]);
    doc.rect(x, y, 4, 56, "F");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "normal");
    doc.text(k.label.toUpperCase(), x + 12, y + 18);
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.text(k.value, x + 12, y + 40);
  });
  y += 72;

  // Operacional
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.text("Operacional", 40, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(70, 70, 70);
  doc.text(
    `Pedidos concluídos: ${done.length}/${orders.length}   ·   Tempo médio de preparo: ${avgPrep ? `${Math.round(avgPrep / 60)}m ${Math.round(avgPrep % 60)}s` : "—"}`,
    40,
    y
  );
  y += 18;

  // ===== Top itens
  const itemMap = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of orders) {
    for (const i of o.items) {
      const cur = itemMap.get(i.menuId) ?? { name: i.name, qty: 0, revenue: 0 };
      cur.qty += i.quantity;
      cur.revenue += i.quantity * i.price;
      itemMap.set(i.menuId, cur);
    }
  }
  const topItems = [...itemMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);

  autoTable(doc, {
    startY: y,
    head: [["#", "Produto", "Quantidade", "Receita"]],
    body: topItems.map((it, idx) => [String(idx + 1), it.name, String(it.qty), BRL(it.revenue)]),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [255, 168, 38], textColor: [30, 30, 30], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    margin: { left: 40, right: 40 },
    didDrawPage: () => {
      // Title before table on first page; on later pages, leave it.
    },
  });
  // @ts-expect-error autoTable adds lastAutoTable on doc
  y = doc.lastAutoTable.finalY + 16;

  // ===== Despesas por categoria
  const byCat: Record<string, number> = {};
  for (const e of expenses) byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
  if (Object.keys(byCat).length) {
    autoTable(doc, {
      startY: y,
      head: [["Categoria", "Total", "% das despesas"]],
      body: Object.entries(byCat).map(([k, v]) => [
        CATEGORY_LABEL[k as keyof typeof CATEGORY_LABEL] ?? k,
        BRL(v),
        expenseTotal > 0 ? `${((v / expenseTotal) * 100).toFixed(1)}%` : "—",
      ]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [253, 245, 245] },
      margin: { left: 40, right: 40 },
    });
    // @ts-expect-error autoTable adds lastAutoTable on doc
    y = doc.lastAutoTable.finalY + 16;
  }

  // ===== Lista de pedidos
  autoTable(doc, {
    startY: y,
    head: [["#", "Cliente", "Data", "Itens", "Status", "Total"]],
    body: orders.slice(0, 200).map((o) => {
      const qty = o.items.reduce((a, b) => a + b.quantity, 0);
      const st = o.status === "done" ? "Concluído" : o.status === "preparing" ? "Preparando" : "Novo";
      return [
        `#${o.number}`,
        o.customer,
        new Date(o.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
        `${qty} item(ns)`,
        st,
        BRL(o.total),
      ];
    }),
    styles: { fontSize: 8.5, cellPadding: 5 },
    headStyles: { fillColor: [40, 40, 50], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 250] },
    margin: { left: 40, right: 40 },
  });
  // @ts-expect-error autoTable lastAutoTable
  y = doc.lastAutoTable.finalY + 16;

  // ===== Lista de despesas
  if (expenses.length) {
    autoTable(doc, {
      startY: y,
      head: [["Data", "Descrição", "Categoria", "Valor"]],
      body: expenses.slice(0, 200).map((e) => [
        new Date(e.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
        e.description,
        CATEGORY_LABEL[e.category],
        BRL(e.amount),
      ]),
      styles: { fontSize: 8.5, cellPadding: 5 },
      headStyles: { fillColor: [40, 40, 50], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 248, 250] },
      margin: { left: 40, right: 40 },
    });
  }

  // Footer page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${brand.whiteLabel ? brandName : brandName + " — Relatório"} — página ${i}/${pages}`,
      W / 2,
      doc.internal.pageSize.getHeight() - 18,
      { align: "center" }
    );
  }

  const slug = (brand.name || "loja").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const filename = `${slug}-relatorio-${range.label.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
