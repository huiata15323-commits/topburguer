// Heatmap visual de faturamento por mesa (baseado nos pedidos atuais).
import { useMemo } from "react";
import { useOrders } from "@/lib/orders-store";

export function TableHeatmap() {
  const { orders } = useOrders();

  const data = useMemo(() => {
    const map = new Map<number, { revenue: number; count: number }>();
    for (const o of orders) {
      if (!o.tableNumber) continue;
      const cur = map.get(o.tableNumber) ?? { revenue: 0, count: 0 };
      cur.revenue += o.total;
      cur.count += 1;
      map.set(o.tableNumber, cur);
    }
    const tables = [...map.entries()]
      .map(([n, v]) => ({ n, ...v }))
      .sort((a, b) => a.n - b.n);
    const maxRev = tables.reduce((m, t) => Math.max(m, t.revenue), 0);
    return { tables, maxRev };
  }, [orders]);

  return (
    <section className="rounded-3xl border-2 border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 via-card to-card p-5 shadow-card-soft">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <h2 className="font-black text-lg flex items-center gap-2">
            <span className="text-2xl">🗺️</span> Heatmap de mesas
          </h2>
          <p className="text-xs text-muted-foreground">
            Mesas que mais faturam no expediente atual.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {data.tables.length} mesa{data.tables.length !== 1 ? "s" : ""} atendida{data.tables.length !== 1 ? "s" : ""}
        </span>
      </div>

      {data.tables.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground italic">
          Nenhum pedido de mesa registrado ainda.
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {data.tables.map((t) => {
            const pct = data.maxRev > 0 ? t.revenue / data.maxRev : 0;
            // Gradiente do verde claro ao vermelho-fogo conforme a "temperatura"
            const hue = 140 - pct * 140; // 140=verde → 0=vermelho
            const sat = 70 + pct * 25;
            const light = 70 - pct * 25;
            return (
              <div
                key={t.n}
                className="aspect-square rounded-xl grid place-items-center text-center p-1 shadow-sm border border-white/10"
                style={{
                  background: `hsl(${hue}, ${sat}%, ${light}%)`,
                  color: pct > 0.55 ? "white" : "#1a1a1a",
                }}
                title={`Mesa ${t.n} · ${t.count} pedido${t.count !== 1 ? "s" : ""}`}
              >
                <div>
                  <div className="text-[10px] font-bold uppercase opacity-80">Mesa</div>
                  <div className="text-xl font-black leading-none">{t.n}</div>
                  <div className="text-[10px] font-bold mt-0.5 tabular-nums">
                    R$ {t.revenue.toFixed(0)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
