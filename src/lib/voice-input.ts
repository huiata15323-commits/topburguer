// Pedido por voz — wrapper Web Speech Recognition (pt-BR).
// Reconhece nomes do cardápio + quantidades faladas em português.

type SpeechRecognitionResult = { transcript: string };
type SpeechRecognitionAlternative = { 0: SpeechRecognitionResult; isFinal: boolean };
type SpeechRecognitionEventLike = { results: ArrayLike<SpeechRecognitionAlternative> };

type Listener = {
  onResult: (text: string, isFinal: boolean) => void;
  onError?: (msg: string) => void;
  onEnd?: () => void;
};

export function isVoiceSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  );
}

export function startVoice(l: Listener): { stop: () => void } | null {
  if (!isVoiceSupported()) {
    l.onError?.("Reconhecimento de voz não disponível neste navegador.");
    return null;
  }
  const Ctor =
    (window as unknown as { SpeechRecognition?: new () => unknown }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;
  const rec = new (Ctor as new () => {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start: () => void;
    stop: () => void;
    onresult: ((e: SpeechRecognitionEventLike) => void) | null;
    onerror: ((e: { error: string }) => void) | null;
    onend: (() => void) | null;
  })();
  rec.lang = "pt-BR";
  rec.continuous = false;
  rec.interimResults = true;
  rec.onresult = (e) => {
    const last = e.results[e.results.length - 1];
    if (!last) return;
    l.onResult(last[0].transcript, !!last.isFinal);
  };
  rec.onerror = (e) => l.onError?.(e.error || "Erro de reconhecimento");
  rec.onend = () => l.onEnd?.();
  try { rec.start(); } catch { /* ignore double start */ }
  return { stop: () => { try { rec.stop(); } catch { /* noop */ } } };
}

// Converte números falados em PT-BR para inteiros (1..20)
const NUM_WORDS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, três: 3, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
};

export type ParsedItem = { menuId: string; quantity: number; matchedName: string };

/** Tenta extrair itens do cardápio a partir do texto falado.
 *  Algoritmo simples: para cada item do cardápio, procura nome (ou primeira palavra)
 *  no texto, e captura a quantidade que aparece imediatamente antes. */
export function parseVoiceOrder(
  text: string,
  menu: { id: string; name: string }[]
): ParsedItem[] {
  const norm = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[,.!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = norm.split(" ");
  const out: ParsedItem[] = [];

  for (const item of menu) {
    const itemNorm = item.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const itemWords = itemNorm.split(/\s+/);
    if (norm.includes(itemNorm)) {
      const idx = norm.indexOf(itemNorm);
      const before = norm.slice(0, idx).trim().split(" ").filter(Boolean);
      const last = before[before.length - 1];
      let qty = 1;
      if (last) {
        const n = parseInt(last, 10);
        if (Number.isFinite(n) && n > 0 && n < 50) qty = n;
        else if (NUM_WORDS[last]) qty = NUM_WORDS[last];
      }
      if (!out.find((x) => x.menuId === item.id)) {
        out.push({ menuId: item.id, quantity: qty, matchedName: item.name });
      }
    } else {
      // fallback: primeira palavra distintiva do item (>3 letras)
      const key = itemWords.find((w) => w.length > 3);
      if (key && tokens.includes(key)) {
        const i = tokens.indexOf(key);
        const prev = tokens[i - 1];
        let qty = 1;
        if (prev) {
          const n = parseInt(prev, 10);
          if (Number.isFinite(n) && n > 0 && n < 50) qty = n;
          else if (NUM_WORDS[prev]) qty = NUM_WORDS[prev];
        }
        if (!out.find((x) => x.menuId === item.id)) {
          out.push({ menuId: item.id, quantity: qty, matchedName: item.name });
        }
      }
    }
  }
  return out;
}
