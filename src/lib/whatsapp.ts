// Helper: gera link wa.me com mensagem pré-pronta para notificar cliente.
// Aceita telefone em formato livre BR; normaliza para E.164 (+55).

export function normalizePhoneBR(raw: string): string | null {
  const digits = (raw || "").replace(/\D+/g, "");
  if (!digits) return null;
  // Se começa com 55 e tem 12-13 dígitos => internacional
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  // 10-11 dígitos => assume BR e prepend 55
  if (digits.length === 10 || digits.length === 11) return "55" + digits;
  return null;
}

export function formatPhoneBR(raw: string): string {
  const d = (raw || "").replace(/\D+/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function buildReadyMessage(opts: {
  customer: string;
  number: number;
  total?: number;
}): string {
  const totalStr = typeof opts.total === "number"
    ? ` Total: ${opts.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`
    : "";
  return (
    `🍔 Top Burguer\n` +
    `Olá ${opts.customer}! Seu pedido *#${opts.number}* está PRONTO para retirada. 🔥${totalStr}\n` +
    `Obrigado pela preferência!`
  );
}

export function waLink(phoneE164: string, message: string): string {
  return `https://wa.me/${phoneE164}?text=${encodeURIComponent(message)}`;
}
