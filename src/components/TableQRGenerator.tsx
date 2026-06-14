// Gerador de QR codes das mesas — múltiplos modelos de placa para imprimir
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { useBranding } from "@/lib/branding";

const STORAGE_KEY = "fast-order:tables";
const TEMPLATE_KEY = "fast-order:qr-template";

type TemplateId =
  | "classic"
  | "minimal"
  | "kraft"
  | "neon"
  | "birthday"
  | "valentine"
  | "christmas"
  | "junina"
  | "carnival"
  | "newyear";

type Template = {
  id: TemplateId;
  label: string;
  emoji: string;
  occasion: string;
  // estilos do cartão impresso
  bg: string; // background CSS
  color: string; // cor principal do texto
  accent: string; // cor de destaque (borda, brand)
  border: string; // border CSS
  decor?: string; // emoji decorativo no canto
  topLabel?: string; // texto pequeno no topo (ocasião)
  hint: string; // instrução para o cliente
};

const TEMPLATES: Template[] = [
  {
    id: "classic",
    label: "Clássico",
    emoji: "🔥",
    occasion: "Padrão da casa",
    bg: "#FFFFFF",
    color: "#1A1A1A",
    accent: "#D97706",
    border: "2px dashed #D97706",
    hint: "Aponte a câmera do celular para fazer seu pedido",
  },
  {
    id: "minimal",
    label: "Minimal",
    emoji: "⚪",
    occasion: "Sofisticado e limpo",
    bg: "#FAFAF7",
    color: "#111111",
    accent: "#111111",
    border: "1px solid #111111",
    hint: "Escaneie para abrir o cardápio",
  },
  {
    id: "kraft",
    label: "Kraft Artesanal",
    emoji: "📜",
    occasion: "Estilo rústico/burger",
    bg: "#D4B896",
    color: "#3D2817",
    accent: "#7C3F1B",
    border: "3px double #5D2F12",
    decor: "🍔",
    hint: "Cardápio digital — peça pela mesa",
  },
  {
    id: "neon",
    label: "Neon Night",
    emoji: "🌃",
    occasion: "Bar / Happy Hour",
    bg: "#0F0F1A",
    color: "#F5F5F5",
    accent: "#FF6B35",
    border: "2px solid #FF6B35",
    decor: "🍻",
    hint: "Scan & order — sem espera",
  },
  {
    id: "birthday",
    label: "Aniversário",
    emoji: "🎂",
    occasion: "Festa de aniversário",
    bg: "linear-gradient(135deg,#FFE5F1,#FFF4D6)",
    color: "#5C2A6B",
    accent: "#E91E63",
    border: "3px dashed #E91E63",
    decor: "🎉",
    topLabel: "FELIZ ANIVERSÁRIO",
    hint: "Peça pela mesa e celebre 🎈",
  },
  {
    id: "valentine",
    label: "Namorados",
    emoji: "❤️",
    occasion: "Dia dos Namorados",
    bg: "linear-gradient(135deg,#FFD6E0,#FFEBEE)",
    color: "#7A0E2E",
    accent: "#C2185B",
    border: "3px solid #C2185B",
    decor: "💕",
    topLabel: "MESA DO AMOR",
    hint: "Façam o pedido juntinhos 💌",
  },
  {
    id: "christmas",
    label: "Natal",
    emoji: "🎄",
    occasion: "Ceia de Natal",
    bg: "linear-gradient(135deg,#0B3D2E,#1A5D3A)",
    color: "#FFFFFF",
    accent: "#E63946",
    border: "3px solid #E63946",
    decor: "🎅",
    topLabel: "FELIZ NATAL",
    hint: "Boas festas! Peça pela mesa 🎁",
  },
  {
    id: "junina",
    label: "Festa Junina",
    emoji: "🌽",
    occasion: "Arraiá / São João",
    bg: "linear-gradient(135deg,#FFF2CC,#FFD699)",
    color: "#6B2C0E",
    accent: "#D62828",
    border: "3px dashed #D62828",
    decor: "🎪",
    topLabel: "ARRAIÁ DA CASA",
    hint: "Cê é doido, sô! Peça pela mesa 🪕",
  },
  {
    id: "carnival",
    label: "Carnaval",
    emoji: "🎭",
    occasion: "Folia de Carnaval",
    bg: "linear-gradient(135deg,#FFD93D,#FF6B9D,#6BCB77)",
    color: "#1A1A1A",
    accent: "#7B2CBF",
    border: "3px solid #7B2CBF",
    decor: "🎊",
    topLabel: "É CARNAVAL!",
    hint: "Cai na folia e peça pela mesa 🪇",
  },
  {
    id: "newyear",
    label: "Réveillon",
    emoji: "🎆",
    occasion: "Virada de ano",
    bg: "linear-gradient(135deg,#0A0A0A,#1A1A2E)",
    color: "#FFD700",
    accent: "#FFD700",
    border: "2px solid #FFD700",
    decor: "🥂",
    topLabel: "FELIZ ANO NOVO",
    hint: "Brinde e peça pela mesa ✨",
  },
];

function readCount(): number {
  if (typeof window === "undefined") return 6;
  const v = parseInt(localStorage.getItem(STORAGE_KEY) || "6", 10);
  return Number.isFinite(v) && v > 0 ? Math.min(v, 50) : 6;
}

function readTemplate(): TemplateId {
  if (typeof window === "undefined") return "classic";
  const v = localStorage.getItem(TEMPLATE_KEY) as TemplateId | null;
  return v && TEMPLATES.find((t) => t.id === v) ? v : "classic";
}

export function TableQRGenerator() {
  const [count, setCount] = useState<number>(6);
  const [origin, setOrigin] = useState<string>("");
  const [templateId, setTemplateId] = useState<TemplateId>("classic");
  const { branding } = useBranding();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCount(readCount());
    setOrigin(window.location.origin);
    setTemplateId(readTemplate());
  }, []);

  const tables = useMemo(() => Array.from({ length: count }, (_, i) => i + 1), [count]);
  const tpl = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];

  const updateCount = (n: number) => {
    const safe = Math.max(1, Math.min(50, n));
    setCount(safe);
    localStorage.setItem(STORAGE_KEY, String(safe));
  };

  const updateTemplate = (id: TemplateId) => {
    setTemplateId(id);
    localStorage.setItem(TEMPLATE_KEY, id);
  };

  const handlePrint = () => {
    const node = printRef.current;
    if (!node) return;
    const brand = branding.name || "Top Burguer";
    const html = `<!doctype html><html><head><title>QR Codes — Mesas (${tpl.label})</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; margin: 0; padding: 0; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8mm; }
  .card {
    position: relative;
    border-radius: 14px;
    padding: 8mm 6mm;
    text-align: center;
    page-break-inside: avoid;
    background: ${tpl.bg};
    color: ${tpl.color};
    border: ${tpl.border};
    min-height: 105mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
  }
  .decor { position: absolute; font-size: 30px; opacity: 0.85; }
  .decor.tl { top: 4mm; left: 5mm; }
  .decor.br { bottom: 4mm; right: 5mm; }
  .top { font-size: 10px; letter-spacing: 4px; font-weight: 800; opacity: 0.85; }
  .brand { font-size: 13px; text-transform: uppercase; letter-spacing: 5px; font-weight: 900; color: ${tpl.accent}; margin-top: 2mm; }
  .num-label { font-size: 11px; letter-spacing: 3px; font-weight: 700; opacity: 0.7; margin-top: 4mm; }
  .num { font-size: 54px; font-weight: 900; line-height: 1; margin-top: 1mm; letter-spacing: 2px; }
  .qr-wrap { display: flex; justify-content: center; margin: 4mm 0; }
  .qr-box { background: #fff; padding: 3mm; border-radius: 8px; }
  .qr-box svg { width: 42mm; height: 42mm; display: block; }
  .hint { font-size: 10px; opacity: 0.85; line-height: 1.35; padding: 0 4mm; font-weight: 600; }
</style></head><body>${node.innerHTML}</body></html>`;
    const w = window.open("", "_blank", "width=900,height=1200");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 350);
  };

  const brand = branding.name || "Top Burguer";

  return (
    <section className="rounded-3xl bg-card border border-border p-5 shadow-card-soft">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h2 className="font-black text-lg flex items-center gap-2">
            <span className="text-2xl">📱</span> QR Codes das mesas
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Escolha um modelo, defina quantas mesas e imprima as placas prontas.
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

      {/* Seletor de modelo */}
      <div className="mb-5">
        <div className="text-[11px] uppercase tracking-widest font-black text-muted-foreground mb-2">
          Modelo da placa · <span className="text-ember">{tpl.occasion}</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => updateTemplate(t.id)}
              className={`shrink-0 snap-start min-w-[110px] rounded-2xl px-3 py-3 text-left border-2 transition-all ${
                t.id === templateId
                  ? "border-ember bg-ember/10 scale-[1.02] shadow-ember"
                  : "border-border bg-background hover:border-ember/40"
              }`}
            >
              <div className="text-2xl">{t.emoji}</div>
              <div className="text-xs font-black mt-1">{t.label}</div>
              <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {t.occasion}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Preview de uma placa */}
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-widest font-black text-muted-foreground mb-2">
          Pré-visualização (Mesa 1)
        </div>
        <div
          className="mx-auto max-w-[260px] rounded-2xl p-5 text-center"
          style={{
            background: tpl.bg,
            color: tpl.color,
            border: tpl.border,
          }}
        >
          {tpl.topLabel && (
            <div className="text-[10px] tracking-[0.3em] font-black opacity-80">
              {tpl.topLabel}
            </div>
          )}
          <div
            className="text-[11px] tracking-[0.35em] font-black uppercase mt-1"
            style={{ color: tpl.accent }}
          >
            {brand}
          </div>
          <div className="text-[10px] tracking-[0.25em] mt-3 opacity-70 font-bold">
            MESA
          </div>
          <div className="text-5xl font-black leading-none">1</div>
          <div className="bg-white p-2 rounded-lg inline-block mt-3">
            {origin && <QRCode value={`${origin}/order?mesa=1`} size={110} level="M" />}
          </div>
          <div className="text-[10px] mt-2 opacity-85 font-semibold px-2">{tpl.hint}</div>
        </div>
      </div>

      {/* Conteúdo para impressão (oculto visualmente, mas presente no DOM) */}
      <div ref={printRef} className="hidden">
        <div className="grid">
          {tables.map((n) => {
            const url = origin ? `${origin}/order?mesa=${n}` : "";
            return (
              <div key={n} className="card">
                {tpl.decor && <span className="decor tl">{tpl.decor}</span>}
                {tpl.decor && <span className="decor br">{tpl.decor}</span>}
                <div>
                  {tpl.topLabel && <div className="top">{tpl.topLabel}</div>}
                  <div className="brand">{brand}</div>
                </div>
                <div>
                  <div className="num-label">MESA</div>
                  <div className="num">{n}</div>
                </div>
                <div className="qr-wrap">
                  <div className="qr-box">
                    {url && <QRCode value={url} size={160} level="M" />}
                  </div>
                </div>
                <div className="hint">{tpl.hint}</div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        🖨 Serão impressas <strong>{count}</strong> placas no modelo{" "}
        <strong>{tpl.label}</strong> — 2 por folha A4, prontas para recortar.
      </p>
    </section>
  );
}
