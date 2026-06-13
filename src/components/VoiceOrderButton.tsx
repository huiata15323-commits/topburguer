// Botão "🎙️ Pedir por voz" — escuta o cliente, parseia o cardápio e adiciona ao carrinho.
import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { isVoiceSupported, startVoice, parseVoiceOrder } from "@/lib/voice-input";

type Props = {
  menu: { id: string; name: string; emoji: string; soldOut?: boolean }[];
  onAdd: (items: { menuId: string; quantity: number }[]) => void;
};

export function VoiceOrderButton({ menu, onAdd }: Props) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [stopper, setStopper] = useState<{ stop: () => void } | null>(null);

  if (!isVoiceSupported()) return null;

  const start = () => {
    setTranscript("");
    setListening(true);
    const s = startVoice({
      onResult: (text, isFinal) => {
        setTranscript(text);
        if (isFinal) {
          const parsed = parseVoiceOrder(
            text,
            menu.filter((m) => !m.soldOut).map((m) => ({ id: m.id, name: m.name }))
          );
          if (parsed.length === 0) {
            toast.error("Não entendi nenhum item. Tente: \"dois X-Bacon e uma coca\".");
          } else {
            onAdd(parsed.map((p) => ({ menuId: p.menuId, quantity: p.quantity })));
            toast.success(
              `Adicionado: ${parsed.map((p) => `${p.quantity}× ${p.matchedName}`).join(", ")}`
            );
          }
          setListening(false);
        }
      },
      onError: (msg) => {
        toast.error(`Microfone: ${msg}`);
        setListening(false);
      },
      onEnd: () => setListening(false),
    });
    setStopper(s);
  };

  const stop = () => {
    stopper?.stop();
    setListening(false);
  };

  return (
    <>
      <button
        onClick={listening ? stop : start}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${
          listening
            ? "bg-red-500 text-white shadow-lg animate-pulse"
            : "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white shadow-md hover:scale-[1.02]"
        }`}
      >
        <span className="text-xl">{listening ? "⏹️" : "🎙️"}</span>
        {listening ? "Estou ouvindo… toque para parar" : "Pedir por voz"}
      </button>

      <AnimatePresence>
        {listening && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-2 rounded-xl border border-indigo-400/30 bg-indigo-500/5 px-3 py-2"
          >
            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-wider mb-1">
              Ouvindo…
            </div>
            <div className="text-sm italic text-muted-foreground min-h-[1.5rem]">
              {transcript || "Fale algo como: \"dois X-Bacon e uma batata frita\""}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
