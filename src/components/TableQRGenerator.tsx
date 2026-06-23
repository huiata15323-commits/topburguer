// Gerador de QR codes das mesas — múltiplos modelos de placa para imprimir
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { useBranding } from "@/lib/branding";
import { toast } from "sonner";

const STORAGE_KEY = "fast-order:tables";
const TEMPLATE_KEY = "fast-order:qr-template";
const POSTER_KEY = "fast-order:qr-poster";
const BASEURL_KEY = "fast-order:qr-baseurl";
const PUBLISHED_QR_BASE = "https://topburguer.lovable.app";
const buildTableMenuUrl = (tableNumber: number) => `${PUBLISHED_QR_BASE}/order?mesa=${tableNumber}`;

function isPreviewLikeUrl(value: string): boolean {
  if (!value) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return (
      host.includes("id-preview--") ||
      host.startsWith("preview--") ||
      host.includes("--preview") ||
      host.endsWith(".sandbox.lovable.dev") ||
      host.endsWith(".lovableproject.com") ||
      host.endsWith(".lovable.dev") ||
      host === "localhost" ||
      host.startsWith("127.") ||
      host.startsWith("192.168.") ||
      host.endsWith(".local")
    );
  } catch {
    return false;
  }
}

// Detecta um URL público estável (publicado) para os QR codes.
// Evita usar o domínio de preview do editor, que exige login e expira.
function suggestPublicBase(origin: string): string {
  if (!origin) return PUBLISHED_QR_BASE;
  try {
    // Domínios de preview do editor e hosts locais não são acessíveis ao público.
    // Sempre usamos o domínio publicado real (topburguer.lovable.app), porque
    // o slug de preview não bate com o slug publicado do projeto.
    return PUBLISHED_QR_BASE;
  } catch { return PUBLISHED_QR_BASE; }
}


function sanitizeBaseUrl(value: string, origin: string): string {
  // QR de cliente não pode depender de preview, cache local ou edição manual.
  // Trava sempre no domínio publicado para evitar tela de login no celular.
  return suggestPublicBase(origin || value);
}

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
  | "newyear"
  | "student"
  | "tent";

type Template = {
  id: TemplateId;
  label: string;
  emoji: string;
  occasion: string;
  bg: string;
  color: string;
  accent: string;
  border: string;
  decor?: string;
  topLabel?: string;
  hint: string;
  layout?: "card" | "poster" | "tent"; // poster = 1 por A4; tent = cavalete dobrável
};

const TEMPLATES: Template[] = [
  {
    id: "student",
    label: "Pôster Escolar",
    emoji: "🎓",
    occasion: "Projeto / Estudantil — A4 cheio",
    bg: "#231510",
    color: "#FFFFFF",
    accent: "#E85D3A",
    border: "0",
    decor: "★",
    topLabel: "APONTE A CÂMERA",
    hint: "Faça seu pedido direto pelo celular",
    layout: "poster",
  },
  {
    id: "tent",
    label: "Cavalete de Mesa",
    emoji: "⛺",
    occasion: "A4 dobrável — moldura elegante",
    bg: "#FBF7EE",
    color: "#1a1a1a",
    accent: "#B8924A",
    border: "0",
    decor: "❦",
    topLabel: "ESCANEIE PARA PEDIR",
    hint: "Aponte a câmera e faça seu pedido",
    layout: "tent",
  },
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

type Poster = {
  projectTitle: string;
  projectCaption: string;
  footerLine: string;
  photo1: string;
  photo2: string;
  useThemeColors: boolean;
};

const POSTER_DEFAULT: Poster = {
  projectTitle: "PROJETO DESENVOLVIDO PELOS ALUNOS",
  projectCaption: "2º Ano A e B — Curso Técnico",
  footerLine: "★ Bem-vindo ★",
  photo1: "",
  photo2: "",
  useThemeColors: true,
};

function readPoster(): Poster {
  if (typeof window === "undefined") return POSTER_DEFAULT;
  try {
    const raw = localStorage.getItem(POSTER_KEY);
    if (!raw) return POSTER_DEFAULT;
    return { ...POSTER_DEFAULT, ...(JSON.parse(raw) as Partial<Poster>) };
  } catch { return POSTER_DEFAULT; }
}

function readCount(): number {
  if (typeof window === "undefined") return 6;
  const v = parseInt(localStorage.getItem(STORAGE_KEY) || "6", 10);
  return Number.isFinite(v) && v > 0 ? Math.min(v, 50) : 6;
}

function readTemplate(): TemplateId {
  if (typeof window === "undefined") return "student";
  const v = localStorage.getItem(TEMPLATE_KEY) as TemplateId | null;
  return v && TEMPLATES.find((t) => t.id === v) ? v : "student";
}

// Pega cores efetivas do tema CSS atual
function themeColors(): { accent: string; dark: string; cream: string } {
  if (typeof window === "undefined") return { accent: "#E85D3A", dark: "#231510", cream: "#FBEFD8" };
  const cs = getComputedStyle(document.documentElement);
  const ember = cs.getPropertyValue("--ember").trim() || "oklch(0.62 0.22 35)";
  return {
    accent: `oklch(from ${ember} 0.62 0.22 h)`,
    dark: `oklch(from ${ember} 0.18 0.05 h)`,
    cream: `oklch(from ${ember} 0.95 0.04 h)`,
  };
}

export function TableQRGenerator() {
  const [count, setCount] = useState<number>(6);
  const [origin, setOrigin] = useState<string>("");
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [templateId, setTemplateId] = useState<TemplateId>("student");
  const [poster, setPoster] = useState<Poster>(POSTER_DEFAULT);
  const { branding } = useBranding();
  const printRef = useRef<HTMLDivElement>(null);
  const photo1Ref = useRef<HTMLInputElement>(null);
  const photo2Ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCount(readCount());
    const o = window.location.origin;
    setOrigin(o);
    setTemplateId(readTemplate());
    setPoster(readPoster());
    const saved = localStorage.getItem(BASEURL_KEY) || "";
    const safe = sanitizeBaseUrl(saved, o);
    setBaseUrl(safe);
    if (saved !== safe) localStorage.setItem(BASEURL_KEY, safe);
  }, []);

  const tables = useMemo(() => Array.from({ length: count }, (_, i) => i + 1), [count]);
  const tpl = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
  const isPoster = tpl.layout === "poster";
  const isTent = tpl.layout === "tent";
  const effectiveBaseUrl = useMemo(() => sanitizeBaseUrl(baseUrl, origin), [baseUrl, origin]);

  const updateCount = (n: number) => {
    const safe = Math.max(1, Math.min(50, n));
    setCount(safe);
    localStorage.setItem(STORAGE_KEY, String(safe));
  };

  const updateTemplate = (id: TemplateId) => {
    setTemplateId(id);
    localStorage.setItem(TEMPLATE_KEY, id);
  };

  const updatePoster = (patch: Partial<Poster>) => {
    const next = { ...poster, ...patch };
    setPoster(next);
    localStorage.setItem(POSTER_KEY, JSON.stringify(next));
  };

  const onPhotoFile = (slot: "photo1" | "photo2") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 800_000) { toast.error("Foto muito grande (máx 800KB)"); return; }
    const r = new FileReader();
    r.onload = () => { updatePoster({ [slot]: String(r.result || "") } as Partial<Poster>); toast.success("Foto aplicada"); };
    r.readAsDataURL(f);
  };

  const brand = branding.name || "Top Burguer";
  const initials = brand.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "TB";

  const handlePrint = () => {
    const node = printRef.current;
    if (!node) return;

    // Cores derivadas do tema ativo (se for pôster e usuário quiser)
    const { accent, dark, cream } = isPoster && poster.useThemeColors
      ? themeColors()
      : { accent: tpl.accent, dark: tpl.bg, cream: "#FBEFD8" };

    const posterCSS = `
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: "Inter", ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 0; background: ${dark}; color: #fff; }
  .page { width: 210mm; height: 297mm; padding: 0; page-break-after: always; position: relative; background: ${dark}; display: flex; flex-direction: column; }
  .page:last-child { page-break-after: auto; }
  .stripe { height: 9mm; background: ${accent}; position: relative; }
  .stripe::after { content: ""; position: absolute; left: 0; right: 0; bottom: -2mm; height: 2mm; background: #F4C430; }
  .stripe.bottom { margin-top: auto; }
  .stripe.bottom::after { top: -2mm; bottom: auto; }
  .body { flex: 1; padding: 10mm 14mm; display: flex; flex-direction: column; align-items: center; }
  h1.title { font-family: "Bricolage Grotesque", "Inter", sans-serif; font-weight: 900; font-size: 56pt; letter-spacing: -0.02em; margin: 4mm 0 1mm; color: #fff; text-align: center; line-height: 0.95; }
  .slogan { font-style: italic; color: ${accent}; font-size: 14pt; margin-bottom: 6mm; letter-spacing: 0.02em; }
  .slogan::before { content: "— "; } .slogan::after { content: " —"; }
  .card {
    background: ${cream}; color: #1a1a1a; border-radius: 16mm;
    width: 150mm; padding: 9mm 9mm 8mm; text-align: center; flex-shrink: 0;
  }
  .card .label { font-weight: 900; font-size: 18pt; letter-spacing: 0.02em; margin-bottom: 1mm; color: #1a1a1a; }
  .card .sub { font-size: 10pt; color: #444; margin-bottom: 5mm; }
  .qr-holder { position: relative; width: 110mm; height: 110mm; margin: 0 auto; background: #fff; padding: 4mm; border-radius: 4mm; }
  .qr-holder svg { width: 100% !important; height: 100% !important; display: block; }
  .qr-badge {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 18mm; height: 18mm; background: ${accent}; color: #fff;
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-weight: 900; font-size: 14pt; letter-spacing: 0.05em; box-shadow: 0 0 0 3mm #fff;
  }
  .mesa-line { margin-top: 6mm; font-weight: 900; font-size: 14pt; letter-spacing: 0.08em; color: #1a1a1a; }
  .mesa-line .num { display: inline-block; min-width: 28mm; border-bottom: 0.6mm solid #1a1a1a; padding-bottom: 0.5mm; }
  .project { margin-top: 8mm; text-align: center; }
  .project .ptitle { color: ${accent}; font-weight: 900; letter-spacing: 0.05em; font-size: 12pt; }
  .project .pcap { color: #ddd; font-size: 9.5pt; margin-top: 1mm; }
  .photos { display: flex; gap: 6mm; justify-content: center; margin-top: 4mm; }
  .photos .ph { width: 50mm; height: 36mm; border-radius: 4mm; overflow: hidden; background: #1a1a1a; display: flex; align-items: center; justify-content: center; color: #555; font-size: 9pt; border: 1mm solid #fff; }
  .photos .ph img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .footer-line { text-align: center; padding: 5mm 0; color: #fff; font-weight: 800; letter-spacing: 0.04em; font-size: 12pt; }
`;

    const cardCSS = `
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; margin: 0; padding: 0; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8mm; }
  .card {
    position: relative; border-radius: 14px; padding: 8mm 6mm; text-align: center;
    page-break-inside: avoid; background: ${tpl.bg}; color: ${tpl.color};
    border: ${tpl.border}; min-height: 105mm; display: flex; flex-direction: column;
    justify-content: space-between; overflow: hidden;
  }
  .decor { position: absolute; font-size: 30px; opacity: 0.85; }
  .decor.tl { top: 4mm; left: 5mm; } .decor.br { bottom: 4mm; right: 5mm; }
  .top { font-size: 10px; letter-spacing: 4px; font-weight: 800; opacity: 0.85; }
  .brand { font-size: 13px; text-transform: uppercase; letter-spacing: 5px; font-weight: 900; color: ${tpl.accent}; margin-top: 2mm; }
  .num-label { font-size: 11px; letter-spacing: 3px; font-weight: 700; opacity: 0.7; margin-top: 4mm; }
  .num { font-size: 54px; font-weight: 900; line-height: 1; margin-top: 1mm; letter-spacing: 2px; }
  .qr-wrap { display: flex; justify-content: center; margin: 4mm 0; }
  .qr-box { background: #fff; padding: 3mm; border-radius: 8px; }
  .qr-box svg { width: 42mm; height: 42mm; display: block; }
  .hint { font-size: 10px; opacity: 0.85; line-height: 1.35; padding: 0 4mm; font-weight: 600; }
`;

    const tentCSS = `
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: "Cormorant Garamond", "Playfair Display", Georgia, serif; margin: 0; padding: 0; background: #FBF7EE; }
  .page { width: 210mm; height: 297mm; position: relative; background: #FBF7EE; page-break-after: always; display: flex; flex-direction: column; }
  .page:last-child { page-break-after: auto; }
  .half { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; padding: 10mm; }
  .half.top { transform: rotate(180deg); }
  .fold {
    position: absolute; left: 6mm; right: 6mm; top: 50%; height: 0;
    border-top: 1px dashed #B8924A; opacity: 0.55; transform: translateY(-50%);
    text-align: center;
  }
  .fold span {
    position: relative; top: -2.5mm; background: #FBF7EE; padding: 0 4mm;
    font-family: ui-sans-serif, sans-serif; font-size: 7pt; letter-spacing: 0.4em;
    color: #B8924A; font-weight: 700;
  }
  .tent-card {
    width: 175mm; height: 122mm; position: relative;
    background: #FBF7EE;
    padding: 8mm 10mm;
    display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  }
  /* Moldura dupla dourada */
  .tent-card::before {
    content: ""; position: absolute; inset: 4mm;
    border: 1.2pt solid #B8924A; border-radius: 2mm;
  }
  .tent-card::after {
    content: ""; position: absolute; inset: 5.5mm;
    border: 0.4pt solid #B8924A; border-radius: 1.5mm;
  }
  .ornament {
    font-size: 22pt; color: #B8924A; line-height: 1; margin-top: 1mm;
    letter-spacing: 0.3em; position: relative; z-index: 2;
  }
  .toplabel {
    font-family: ui-sans-serif, sans-serif; font-size: 8pt; letter-spacing: 0.45em;
    color: #8a6a2e; font-weight: 700; margin-top: 2mm; position: relative; z-index: 2;
  }
  .brand {
    font-family: "Cormorant Garamond", "Playfair Display", Georgia, serif;
    font-weight: 600; font-size: 34pt; color: #2a1d0c; letter-spacing: 0.04em;
    line-height: 1; margin-top: 2mm; position: relative; z-index: 2;
    text-align: center;
  }
  .slogan {
    font-style: italic; color: #8a6a2e; font-size: 10pt; margin-top: 1.5mm;
    position: relative; z-index: 2;
  }
  .row { display: flex; align-items: center; gap: 7mm; margin-top: 3mm; position: relative; z-index: 2; }
  .qr-box { background: #fff; padding: 2.5mm; border: 0.6pt solid #B8924A; border-radius: 1.5mm; }
  .qr-box svg { width: 38mm; height: 38mm; display: block; }
  .mesa { text-align: left; }
  .mesa .lbl { font-family: ui-sans-serif, sans-serif; font-size: 9pt; letter-spacing: 0.4em; color: #8a6a2e; font-weight: 700; }
  .mesa .num { font-family: "Cormorant Garamond", "Playfair Display", Georgia, serif; font-weight: 700; font-size: 56pt; color: #2a1d0c; line-height: 0.9; }
  .hint { font-family: ui-sans-serif, sans-serif; font-size: 8.5pt; color: #5a4a2a; margin-top: 1mm; position: relative; z-index: 2; text-align: center; max-width: 130mm; }
`;

    const css = isPoster ? posterCSS : (isTent ? tentCSS : cardCSS);
    const html = `<!doctype html><html><head><title>QR Codes — Mesas (${tpl.label})</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<style>${css}</style></head><body>${node.innerHTML}</body></html>`;
    const w = window.open("", "_blank", "width=900,height=1200");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 600);
  };

  // ===== Render do conteúdo de impressão (oculto) =====
  const renderPosterPage = (n: number) => {
    const url = buildTableMenuUrl(n);
    return (
      <div key={n} className="page">
        <div className="stripe" />
        <div className="body">
          <h1 className="title">{brand.toUpperCase()}</h1>
          {branding.slogan && <div className="slogan">{branding.slogan}</div>}
          <div className="card">
            <div className="label">APONTE A CÂMERA</div>
            <div className="sub">{tpl.hint}</div>
            <div className="qr-holder">
              {url && <QRCode value={url} size={400} level="M" />}
            </div>
            <div className="mesa-line">MESA Nº <span className="num">{n}</span></div>
          </div>
          <div className="project">
            <div className="ptitle">{poster.projectTitle}</div>
            <div className="pcap">{poster.projectCaption}</div>
            {(poster.photo1 || poster.photo2) && (
              <div className="photos">
                <div className="ph">{poster.photo1 ? <img src={poster.photo1} alt="" /> : "foto 1"}</div>
                <div className="ph">{poster.photo2 ? <img src={poster.photo2} alt="" /> : "foto 2"}</div>
              </div>
            )}
          </div>
          <div className="footer-line">{poster.footerLine}</div>
        </div>
        <div className="stripe bottom" />
      </div>
    );
  };

  const renderCard = (n: number) => {
    const url = buildTableMenuUrl(n);
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
          <div className="qr-box">{url && <QRCode value={url} size={160} level="L" />}</div>
        </div>
        <div className="hint">{tpl.hint}</div>
      </div>
    );
  };

  const renderTentFace = (n: number) => {
    const url = buildTableMenuUrl(n);
    return (
      <div className="tent-card">
        <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
          <div className="ornament">❦ ❧ ❦</div>
          <div className="toplabel">{tpl.topLabel}</div>
          <div className="brand">{brand}</div>
          {branding.slogan && <div className="slogan">— {branding.slogan} —</div>}
        </div>
        <div className="row">
          <div className="qr-box">{url && <QRCode value={url} size={160} level="M" />}</div>
          <div className="mesa">
            <div className="lbl">MESA Nº</div>
            <div className="num">{n}</div>
          </div>
        </div>
        <div className="hint">{tpl.hint}</div>
      </div>
    );
  };

  const renderTentPage = (n: number) => (
    <div key={n} className="page">
      <div className="half top">{renderTentFace(n)}</div>
      <div className="fold"><span>DOBRE AQUI</span></div>
      <div className="half">{renderTentFace(n)}</div>
    </div>
  );

  // Preview do pôster (escala reduzida)
  const previewUrl = buildTableMenuUrl(1);
  const themePreview = poster.useThemeColors ? themeColors() : { accent: tpl.accent, dark: tpl.bg, cream: "#FBEFD8" };

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
            type="number" min={1} max={50} value={count}
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

      {/* URL pública usada pelos QR Codes */}
      <div className="mb-5 rounded-2xl border-2 border-amber-warm/40 bg-amber-warm/10 p-3">
        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
          <label className="text-[11px] uppercase tracking-widest font-black text-muted-foreground">
            🔗 URL pública dos QR Codes
          </label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                const v = suggestPublicBase(origin);
                setBaseUrl(v);
                localStorage.setItem(BASEURL_KEY, v);
                toast.success("URL pública restaurada");
              }}
              className="text-[10px] px-2 py-1 rounded-md bg-background border border-border hover:border-ember font-bold"
            >Usar publicada</button>
            {baseUrl && (
              <a
                href={buildTableMenuUrl(1)}
                target="_blank" rel="noreferrer"
                className="text-[10px] px-2 py-1 rounded-md bg-background border border-border hover:border-ember font-bold"
              >Testar</a>
            )}
          </div>
        </div>
        <input
          value={effectiveBaseUrl}
          readOnly
          placeholder="https://seusite.lovable.app"
          className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm font-mono"
        />
        <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
          Os clientes vão escanear o QR e abrir <code className="font-mono">{PUBLISHED_QR_BASE}/order?mesa=N</code>.
          O link foi travado no domínio publicado para não cair no preview que pede login.
        </p>
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
              <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{t.occasion}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Painel de edição do pôster */}
      {isPoster && (
        <div className="mb-5 rounded-2xl border-2 border-ember/30 bg-ember/5 p-4 space-y-3">
          <div className="font-black text-sm flex items-center gap-2">
            <span>🎓</span> Editar pôster escolar
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox" checked={poster.useThemeColors}
              onChange={(e) => updatePoster({ useThemeColors: e.target.checked })}
              className="accent-ember w-4 h-4"
            />
            <span>Usar cores do tema ativo (recomendado)</span>
          </label>
          <div className="grid sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Título do projeto</label>
              <input
                value={poster.projectTitle}
                onChange={(e) => updatePoster({ projectTitle: e.target.value.slice(0, 60) })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Legenda (turma/curso)</label>
              <input
                value={poster.projectCaption}
                onChange={(e) => updatePoster({ projectCaption: e.target.value.slice(0, 80) })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Frase do rodapé</label>
              <input
                value={poster.footerLine}
                onChange={(e) => updatePoster({ footerLine: e.target.value.slice(0, 80) })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-bold"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["photo1", "photo2"] as const).map((slot, i) => (
              <div key={slot} className="rounded-xl border border-border bg-background p-2">
                <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Foto {i + 1}</div>
                {poster[slot] ? (
                  <div className="relative">
                    <img src={poster[slot]} alt="" className="w-full h-20 object-cover rounded-lg" />
                    <button
                      onClick={() => updatePoster({ [slot]: "" } as Partial<Poster>)}
                      className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded"
                    >✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => (slot === "photo1" ? photo1Ref : photo2Ref).current?.click()}
                    className="w-full h-20 rounded-lg border-2 border-dashed border-border hover:border-ember/40 text-xs text-muted-foreground"
                  >📷 Enviar foto</button>
                )}
              </div>
            ))}
            <input ref={photo1Ref} type="file" accept="image/*" onChange={onPhotoFile("photo1")} className="hidden" />
            <input ref={photo2Ref} type="file" accept="image/*" onChange={onPhotoFile("photo2")} className="hidden" />
          </div>
        </div>
      )}

      {/* Pré-visualização */}
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-widest font-black text-muted-foreground mb-2">
          Pré-visualização (Mesa 1) — 1 placa por folha A4
        </div>
        {isTent ? (
          <div
            className="mx-auto rounded-lg overflow-hidden shadow-2xl relative"
            style={{ width: 210, aspectRatio: "210 / 297", background: "#FBF7EE", fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            {[1, 0].map((rot) => (
              <div
                key={rot}
                style={{
                  position: "absolute", left: 0, right: 0, height: "50%",
                  top: rot ? 0 : "50%",
                  transform: rot ? "rotate(180deg)" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 6,
                }}
              >
                <div style={{
                  position: "relative", width: "92%", height: "88%", padding: "8px 10px",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ position: "absolute", inset: 4, border: "1px solid #B8924A", borderRadius: 4 }} />
                  <div style={{ position: "absolute", inset: 6, border: "0.5px solid #B8924A", borderRadius: 3 }} />
                  <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
                    <div style={{ color: "#B8924A", fontSize: 9, letterSpacing: "0.3em" }}>❦ ❧ ❦</div>
                    <div style={{ fontSize: 5.5, letterSpacing: "0.4em", color: "#8a6a2e", fontWeight: 700, marginTop: 2, fontFamily: "ui-sans-serif" }}>{tpl.topLabel}</div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#2a1d0c", lineHeight: 1, marginTop: 2, letterSpacing: "0.04em" }}>{brand}</div>
                  </div>
                  <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ background: "#fff", padding: 2, border: "0.5px solid #B8924A", borderRadius: 2 }}>
                      {previewUrl && <QRCode value={previewUrl} size={48} level="M" />}
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 5, letterSpacing: "0.35em", color: "#8a6a2e", fontWeight: 700, fontFamily: "ui-sans-serif" }}>MESA Nº</div>
                      <div style={{ fontSize: 26, fontWeight: 700, color: "#2a1d0c", lineHeight: 0.9 }}>1</div>
                    </div>
                  </div>
                  <div style={{ position: "relative", zIndex: 2, fontSize: 5, color: "#5a4a2a", textAlign: "center", fontFamily: "ui-sans-serif" }}>{tpl.hint}</div>
                </div>
              </div>
            ))}
            <div style={{
              position: "absolute", top: "50%", left: 8, right: 8,
              borderTop: "0.5px dashed #B8924A", transform: "translateY(-50%)",
              textAlign: "center",
            }}>
              <span style={{ position: "relative", top: -5, background: "#FBF7EE", padding: "0 6px", fontSize: 5, letterSpacing: "0.4em", color: "#B8924A", fontWeight: 700, fontFamily: "ui-sans-serif" }}>DOBRE AQUI</span>
            </div>
          </div>
        ) : isPoster ? (
          <div
            className="mx-auto rounded-lg overflow-hidden shadow-2xl"
            style={{ width: 210, aspectRatio: "210 / 297", background: themePreview.dark, color: "#fff", fontFamily: "Inter, sans-serif" }}
          >
            <div style={{ height: 6, background: themePreview.accent, borderBottom: "1.5px solid #F4C430" }} />
            <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", alignItems: "center", height: "calc(100% - 12px)" }}>
              <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.02em", lineHeight: 0.95, textAlign: "center" }}>
                {brand.toUpperCase()}
              </div>
              {branding.slogan && (
                <div style={{ fontStyle: "italic", color: themePreview.accent, fontSize: 7, marginTop: 2 }}>— {branding.slogan} —</div>
              )}
              <div style={{ background: themePreview.cream, color: "#1a1a1a", borderRadius: 10, padding: "6px 6px 5px", width: "85%", marginTop: 6, textAlign: "center" }}>
                <div style={{ fontWeight: 900, fontSize: 8 }}>APONTE A CÂMERA</div>
                <div style={{ fontSize: 5, color: "#444", marginBottom: 3 }}>{tpl.hint}</div>
                <div style={{ position: "relative", width: 78, height: 78, margin: "0 auto", background: "#fff", padding: 2, borderRadius: 3 }}>
                  {previewUrl && <QRCode value={previewUrl} size={74} level="H" />}
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 16, height: 16, borderRadius: "50%", background: themePreview.accent, color: "#fff", fontWeight: 900, fontSize: 7, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 2px #fff" }}>
                    {initials}
                  </div>
                </div>
                <div style={{ marginTop: 5, fontWeight: 900, fontSize: 7, letterSpacing: "0.05em" }}>MESA Nº ___</div>
              </div>
              <div style={{ marginTop: 6, textAlign: "center" }}>
                <div style={{ color: themePreview.accent, fontWeight: 900, fontSize: 6 }}>{poster.projectTitle}</div>
                <div style={{ color: "#ddd", fontSize: 4.5, marginTop: 1 }}>{poster.projectCaption}</div>
                {(poster.photo1 || poster.photo2) && (
                  <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 3 }}>
                    {[poster.photo1, poster.photo2].map((p, i) => (
                      <div key={i} style={{ width: 30, height: 22, background: "#1a1a1a", border: "0.5px solid #fff", borderRadius: 2, overflow: "hidden" }}>
                        {p && <img src={p} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 6, fontWeight: 800, fontSize: 6 }}>{poster.footerLine}</div>
              </div>
            </div>
            <div style={{ height: 6, background: themePreview.accent, borderTop: "1.5px solid #F4C430" }} />
          </div>
        ) : (
          <div
            className="mx-auto max-w-[260px] rounded-2xl p-5 text-center"
            style={{ background: tpl.bg, color: tpl.color, border: tpl.border }}
          >
            {tpl.topLabel && <div className="text-[10px] tracking-[0.3em] font-black opacity-80">{tpl.topLabel}</div>}
            <div className="text-[11px] tracking-[0.35em] font-black uppercase mt-1" style={{ color: tpl.accent }}>{brand}</div>
            <div className="text-[10px] tracking-[0.25em] mt-3 opacity-70 font-bold">MESA</div>
            <div className="text-5xl font-black leading-none">1</div>
            <div className="bg-white p-2 rounded-lg inline-block mt-3">
              {previewUrl && <QRCode value={previewUrl} size={110} level="M" />}
            </div>
            <div className="text-[10px] mt-2 opacity-85 font-semibold px-2">{tpl.hint}</div>
          </div>
        )}
      </div>

      {/* Conteúdo de impressão (oculto) */}
      <div ref={printRef} className="hidden">
        {isPoster
          ? tables.map(renderPosterPage)
          : isTent
            ? tables.map(renderTentPage)
            : <div className="grid">{tables.map(renderCard)}</div>}
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        🖨 {count} placa{count > 1 ? "s" : ""} — modelo <strong>{tpl.label}</strong>
        {isPoster ? " (1 por folha A4)" : isTent ? " (1 por folha A4 — dobre ao meio)" : " (2 por folha A4, prontas para recortar)"}.
      </p>
    </section>
  );
}
