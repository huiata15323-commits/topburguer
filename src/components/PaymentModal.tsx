// Modal de pagamento PIX simulado — gera código PIX-like (BR Code falso),
// QR code escaneável, animação de confirmação. Para fins de simulação em sala.
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "react-qr-code";

type Status = "pending" | "confirming" | "paid";

function genPixCode(amount: number, txId: string): string {
  // Estrutura aproximada de um PIX BR Code (EMV), só pra parecer real no QR.
  const merchant = "TOPBURGUER";
  const city = "SAOPAULO";
  const amt = amount.toFixed(2);
  return `00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540${amt.length}${amt}5802BR5910${merchant}6009${city}62${(4 + txId.length).toString().padStart(2, "0")}05${txId.length.toString().padStart(2, "0")}${txId}6304ABCD`;
}

export function PaymentModal({
  open, amount, customer, onClose, onConfirmed,
}: {
  open: boolean;
  amount: number;
  customer: string;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [status, setStatus] = useState<Status>("pending");
  const [seconds, setSeconds] = useState(0);
  const txId = `TB${Date.now().toString().slice(-8)}`;
  const pixCode = genPixCode(amount, txId);

  useEffect(() => {
    if (!open) {
      setStatus("pending");
      setSeconds(0);
      return;
    }
    const i = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(i);
  }, [open]);

  const handleConfirm = () => {
    setStatus("confirming");
    // Simula validação no banco
    setTimeout(() => {
      setStatus("paid");
      setTimeout(() => onConfirmed(), 900);
    }, 1500);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
    } catch {}
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm grid place-items-center p-4"
        onClick={status === "pending" ? onClose : undefined}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-3xl border border-border shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 grid place-items-center font-black text-xl">
              ⚡
            </div>
            <div className="flex-1">
              <div className="font-black text-lg leading-none">Pagamento PIX</div>
              <div className="text-xs text-white/80">Simulação · {customer}</div>
            </div>
            {status === "pending" && (
              <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">×</button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {status === "pending" && (
              <motion.div
                key="qr"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-5"
              >
                <div className="text-center mb-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-widest">Total</div>
                  <div className="text-4xl font-black text-emerald-600">R$ {amount.toFixed(2)}</div>
                </div>

                <div className="bg-white p-4 rounded-2xl flex justify-center mx-auto w-fit border-2 border-emerald-500/30">
                  <QRCode value={pixCode} size={180} />
                </div>

                <p className="text-xs text-center text-muted-foreground mt-3">
                  Escaneie com o app do banco ou copie o código abaixo
                </p>

                <div className="mt-3 bg-muted rounded-xl p-3 flex items-center gap-2">
                  <code className="text-[10px] truncate flex-1 font-mono">{pixCode}</code>
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg bg-charcoal text-white text-xs font-bold shrink-0"
                  >
                    Copiar
                  </button>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl bg-muted hover:bg-secondary font-bold text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-sm shadow-lg"
                  >
                    ✓ Confirmar pagamento
                  </button>
                </div>

                <div className="text-center text-[10px] text-muted-foreground mt-3">
                  Aguardando pagamento · {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                  {String(seconds % 60).padStart(2, "0")}
                </div>
              </motion.div>
            )}

            {status === "confirming" && (
              <motion.div
                key="confirming"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-10 text-center"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 mx-auto rounded-full border-4 border-emerald-500/30 border-t-emerald-500"
                />
                <div className="mt-4 font-black text-lg">Validando pagamento…</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Confirmando com o banco
                </div>
              </motion.div>
            )}

            {status === "paid" && (
              <motion.div
                key="paid"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="p-10 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 14 }}
                  className="w-20 h-20 mx-auto rounded-full bg-emerald-500 grid place-items-center text-4xl text-white shadow-lg"
                >
                  ✓
                </motion.div>
                <div className="mt-4 font-black text-xl text-emerald-600">Pagamento aprovado!</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Enviando pedido para a cozinha…
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
