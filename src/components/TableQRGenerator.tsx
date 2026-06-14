// Gerador de QR codes das mesas — imprime e cola na mesa
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";

const STORAGE_KEY = "fast-order:tables";

function readCount(): number {
  if (typeof window === "undefined") return 6;
  const v = parseInt(localStorage.getItem(STORAGE_KEY) || "6", 10);
  return Number.isFinite(v) && v > 0 ? Math.min(v, 50) : 6;
}

export function TableQRGenerator() {
  const [count, setCount] = useState<number>(6);
  const [origin, setOrigin] = useState<string>("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCount(readCount());
    setOrigin(window.location.origin);
  }, []);

  const tables = useMemo(() => Array.from({ length: count }, (_, i) => i + 1), [count]);

  const updateCount = (n: number) => {
    const safe = Math.max(1, Math.min(50, n));
    setCount(safe);
    localStorage.setItem(STORAGE_KEY, String(safe));
  };

  const handlePrint = () => {
    const node = printRef.current;
    if (!node) return;
    const html = `<!doctype html><html><head><title>QR Codes — Mesas</title>
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: system-ui, sans-serif; margin: 0; padding: 0; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14mm; }
  .card { border: 2px dashed #999; border-radius: 12px; padding: 10mm; text-align: center; page-break-inside: avoid; }
  .num { font-size: 38px; font-weight: 900; margin: 6mm 0 2mm; letter-spacing: 1px; }
  .brand { font-size: 14px; color: #b45309; text-transform: uppercase; letter-spacing: 4px; font-weight: 800; }
  .hint { font-size: 11px; color: #555; margin-top: 5mm; line-height: 1.4; }
  .qr { display: flex; justify-content: center; }
  svg { width: 60mm; height: 60mm; }
</style></head><body>${node.innerHTML}</body></html>`;
    const w = window.open("", "_blank", "width=900,height=1200");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 300);
  };

  return (
    <section className="rounded-3xl bg-card border border-border p-5 shadow-card-soft">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h2 className="font-black text-lg flex items-center gap-2">
            <span className="text-2xl">📱</span> QR Codes das mesas
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Cada QR abre o cardápio já marcando a mesa do cliente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Mesas:</label>
          <input
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => updateCount(parseInt(e.target.value || "1", 10))}
            className="w-20 px-2 py-1.5 rounded-lg border border-border bg-background text-center font-bold"
          />
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-lg bg-gradient-ember text-ember-foreground font-bold text-sm shadow-ember"
          >
            🖨 Imprimir
          </button>
        </div>
      </div>

      <div ref={printRef}>
        <div className="grid">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {tables.map((n) => {
              const url = origin ? `${origin}/order?mesa=${n}` : "";
              return (
                <div key={n} className="card rounded-2xl border-2 border-dashed border-border p-3 text-center bg-background">
                  <div className="brand text-[10px] uppercase tracking-[0.3em] text-amber-warm font-black">
                    Top Burguer
                  </div>
                  <div className="num text-3xl font-black tracking-wider mt-1">MESA {n}</div>
                  <div className="qr flex justify-center mt-2 bg-white p-2 rounded-lg">
                    {url && <QRCode value={url} size={140} level="M" />}
                  </div>
                  <div className="hint text-[10px] text-muted-foreground mt-2 leading-tight">
                    Aponte a câmera do celular para o QR e faça seu pedido
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </section>

  );
}
