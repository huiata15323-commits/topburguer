// Voz sintetizada para chamar pedidos prontos no painel da cozinha/TV.
// Usa Web Speech API (nativa do navegador, sem custos).
let voicesReady = false;
let chosenVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const all = window.speechSynthesis.getVoices();
  if (all.length === 0) return null;
  // Prefere voz pt-BR feminina/clara
  const ptBr = all.filter((v) => /pt[-_]BR/i.test(v.lang));
  const pt = all.filter((v) => /^pt/i.test(v.lang));
  return (
    ptBr.find((v) => /female|fem|maria|luciana|google/i.test(v.name)) ??
    ptBr[0] ??
    pt[0] ??
    all[0]
  );
}

export function initVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  if (voicesReady) return;
  const tryPick = () => {
    chosenVoice = pickVoice();
    if (chosenVoice) voicesReady = true;
  };
  tryPick();
  // Em alguns navegadores as vozes carregam tarde
  window.speechSynthesis.onvoiceschanged = tryPick;
}

export function speak(text: string, opts?: { rate?: number; pitch?: number; volume?: number }) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  if (!voicesReady) {
    chosenVoice = pickVoice();
    voicesReady = !!chosenVoice;
  }
  try {
    const u = new SpeechSynthesisUtterance(text);
    if (chosenVoice) {
      u.voice = chosenVoice;
      u.lang = chosenVoice.lang;
    } else {
      u.lang = "pt-BR";
    }
    u.rate = opts?.rate ?? 0.95;
    u.pitch = opts?.pitch ?? 1.05;
    u.volume = opts?.volume ?? 1;
    window.speechSynthesis.speak(u);
  } catch (e) {
    console.warn("[voice] speak failed", e);
  }
}

export function announceReady(orderNumber: number, table?: number, customer?: string) {
  const parts: string[] = [`Pedido ${orderNumber},`];
  if (table) parts.push(`mesa ${table},`);
  else if (customer) parts.push(`${customer.split(" ")[0]},`);
  parts.push("pronto para retirada!");
  speak(parts.join(" "));
}

export function announceWaiter(table?: number) {
  speak(
    table
      ? `Atenção, atendente solicitado na mesa ${table}.`
      : "Atenção, atendente solicitado.",
    { pitch: 1.15 }
  );
}
