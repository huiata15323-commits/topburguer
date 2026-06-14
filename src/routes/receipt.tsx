import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import { useOrders, type Order } from "@/lib/orders-store";
import { useBranding } from "@/lib/branding";

const search = z.object({ n: z.coerce.number().int().positive().optional() });

export const Route = createFileRoute("/receipt")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Recibo — Top Burguer" },
      { name: "description", content: "Recibo do seu pedido. Mostre na retirada ou imprima." },
    ],
  }),
  component: ReceiptPage,
});

const STATUS_LABEL = {
  pending: "Aguardando",
  preparing: "Preparando",
  done: "Pronto p/ retirada",
} as const;

function ReceiptPage() {
  const { n } = useSearch({ from: "/receipt" });
  const { orders } = useOrders();
  const order: Order | undefined = useMemo(
    () => (n ? orders.find((o) => o.number === n) : undefined),
    [orders, n]
  );

  const shareUrl =
    typeof window !== "undefined" && n
      ? `${window.location.origin}/status?n=${n}`
      : "";
  const qrSrc = shareUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(shareUrl)}`
    : "";

  if (!n || !order) {
    return (
      <main className="min-h-screen bg-background grid place-items-center p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🧾</div>
          <h1 className="text-2xl font-black mb-2">Recibo não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            Informe o número do pedido para visualizar o recibo.
          </p>
          <Link
            to="/status"
            className="inline-block px-5 py-3 rounded-xl bg-gradient-ember text-ember-foreground font-bold shadow-ember"
          >
            Ir para Status
          </Link>
        </div>
      </main>
    );
  }

  const date = new Date(order.createdAt);
  const dateStr = date.toLocaleDateString("pt-BR");
  const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <main className="min-h-screen bg-neutral-100 text-charcoal py-6 px-4 print:bg-white print:py-0 print:px-0">
      {/* Screen-only toolbar */}
      <div className="max-w-sm mx-auto flex items-center justify-between mb-4 print:hidden">
        <Link to="/status" search={{ n }} className="text-sm font-semibold text-charcoal/70 hover:text-charcoal">
          ← Voltar
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-lg bg-charcoal text-white text-xs font-bold hover:brightness-110"
          >
            🖨 Imprimir
          </button>
        </div>
      </div>

      {/* Ticket */}
      <article
        id="receipt"
        className="receipt mx-auto max-w-sm bg-white shadow-2xl print:shadow-none rounded-xl print:rounded-none overflow-hidden font-mono text-[13px] leading-snug"
      >
        {/* Top notch */}
        <div className="h-3 bg-[radial-gradient(circle_at_8px_-2px,transparent_6px,white_6px)] [background-size:16px_12px] bg-charcoal print:hidden" />

        <div className="p-6">
          <header className="text-center pb-3 border-b border-dashed border-charcoal/40">
            <div className="text-2xl font-black tracking-tight">TOP BURGUER</div>
            <div className="text-[11px] uppercase tracking-widest opacity-70">Top Burguer • Recibo</div>
            <div className="mt-1 text-[11px] opacity-70">{dateStr} • {timeStr}</div>
          </header>

          {/* Big pickup number */}
          <div className="text-center my-4">
            <div className="text-[10px] uppercase tracking-widest opacity-60">Senha de retirada</div>
            <div className="text-6xl font-black leading-none mt-1">#{order.number}</div>
            <div className="mt-2 inline-block px-3 py-1 rounded-full bg-charcoal text-white text-[10px] font-bold uppercase tracking-widest">
              {STATUS_LABEL[order.status]}
            </div>
          </div>

          <div className="text-[12px] pb-3 border-b border-dashed border-charcoal/40">
            <div className="flex justify-between"><span className="opacity-70">Cliente</span><span className="font-bold truncate max-w-[60%] text-right">{order.customer}</span></div>
            <div className="flex justify-between"><span className="opacity-70">Pedido</span><span className="font-bold">#{order.number}</span></div>
          </div>

          {/* Items */}
          <ul className="py-3 space-y-2 border-b border-dashed border-charcoal/40">
            {order.items.map((i) => (
              <li key={i.menuId}>
                <div className="flex justify-between gap-2">
                  <span className="font-bold">
                    {i.quantity}× {i.name}
                  </span>
                  <span className="font-bold tabular-nums">R$ {(i.price * i.quantity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] opacity-60">
                  <span>unit. R$ {i.price.toFixed(2)}</span>
                </div>
                {i.notes && (
                  <div className="text-[11px] mt-0.5">↳ {i.notes}</div>
                )}
              </li>
            ))}
          </ul>

          {order.notes && (
            <div className="text-[11px] py-2 border-b border-dashed border-charcoal/40">
              <span className="font-bold">Obs.:</span> {order.notes}
            </div>
          )}

          {/* Totals */}
          <div className="py-3 text-[13px]">
            <div className="flex justify-between">
              <span className="opacity-70">Subtotal</span>
              <span className="tabular-nums">R$ {order.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-black mt-1">
              <span>TOTAL</span>
              <span className="tabular-nums">R$ {order.total.toFixed(2)}</span>
            </div>
          </div>

          {/* QR */}
          <div className="border-t border-dashed border-charcoal/40 pt-4 flex flex-col items-center gap-2">
            {qrSrc && (
              <img
                src={qrSrc}
                alt="QR para acompanhar o pedido"
                width={160}
                height={160}
                className="rounded-md"
              />
            )}
            <div className="text-[10px] text-center opacity-70 leading-tight">
              Escaneie para acompanhar o status<br />
              em tempo real
            </div>
          </div>

          <footer className="text-center text-[10px] uppercase tracking-widest opacity-60 pt-4 mt-3 border-t border-dashed border-charcoal/40">
            Obrigado pela preferência!<br />
            Apresente este recibo no balcão.
          </footer>
        </div>

        {/* Bottom notch */}
        <div className="h-3 bg-[radial-gradient(circle_at_8px_14px,transparent_6px,white_6px)] [background-size:16px_12px] bg-charcoal print:hidden" />
      </article>

      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 4mm; }
          html, body { background: white !important; }
          .receipt { box-shadow: none !important; max-width: none !important; width: 100% !important; }
        }
      `}</style>
    </main>
  );
}
