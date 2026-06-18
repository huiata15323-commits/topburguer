// Botão "🎙️ Pedir por voz" — escuta o cliente. Tenta parser local rápido
// e, se falhar, chama IA (Gemini) para entender a fala em linguagem natural.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { isVoiceSupported, startVoice, parseVoiceOrder } from "@/lib/voice-input";
import { parseVoiceOrderAI } from "@/lib/ai-voice-order.functions";

type Props = {
  menu: { id: string; name: string; emoji: string; soldOut?: boolean }[];
  onAdd: (items: { menuId: string; quantity: number }[]) => void;
};

export function VoiceOrderButton({ menu, onAdd }: Props) {
  const [mounted, setMounted] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [stopper, setStopper] = useState<{ stop: () => void } | null>(null);
  const callAI = useServerFn(parseVoiceOrderAI);

  useEffect(() => setMounted(true), []);

  if (!mounted || !isVoiceSupported()) return null;

  const handleFinal = async (text: string) => {
    const available = menu.filter((m) => !m.soldOut);
    const parsed = parseVoiceOrder(text, available.map((m) => ({ id: m.id, name: m.name })));
    if (parsed.length > 0) {
      onAdd(parsed.map((p) => ({ menuId: p.menuId, quantity: p.quantity })));
      toast.success(`✓ ${parsed.map((p) => `${p.quantity}× ${p.matchedName}`).join(", ")}`);
      return;
    }
    // Fallback IA
    setThinking(true);
    try {
      const r = await callAI({
        data: { transcript: text, menu: available.map((m) => ({ id: m.id, name: m.name })) },
      });
      if (r.error === "rate_limit") return toast.error("⏳ Muitas tentativas — aguarde 1min.");
      if (r.error === "no_credits") return toast.error("💳 Sem créditos de IA.");
      if (r.error) return toast.error("IA indisponível. Tente novamente.");
      if (r.items.length === 0) {
        return toast.error('Não entendi. Tente: "dois X-Bacon e uma coca".');
      }
      onAdd(r.items.map((i) => ({ menuId: i.id, quantity: i.quantity })));
      const names = r.items
        .map((i) => `${i.quantity}× ${available.find((m) => m.id === i.id)?.name ?? ""}`)
        .join(", ");
      toast.success(`🤖 ${names}`);
    } finally {
      setThinking(false);
    }
  };

  const start = () => {
    setTranscript("");
    setListening(true);
    const s = startVoice({
      onResult: (text, isFinal) => {
        setTranscript(text);
        if (isFinal) {
          setListening(false);
          void handleFinal(text);
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

  const busy = listening || thinking;

  return (
    <>
      <button
        onClick={listening ? stop : start}
        disabled={thinking}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${
          listening
            ? "bg-red-500 text-white shadow-lg animate-pulse"
            : thinking
              ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md opacity-90"
              : "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-md hover:scale-[1.02] active:scale-[0.98]"
        }`}
      >
        <span className="text-xl">{listening ? "⏹️" : thinking ? "🧠" : "🎙️"}</span>
        {listening
          ? "Estou ouvindo… toque para parar"
          : thinking
            ? "IA entendendo seu pedido…"
            : "Pedir por voz (IA)"}
      </button>

      <AnimatePresence>
        {busy && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-2 rounded-xl border border-violet-400/30 bg-gradient-to-r from-indigo-500/5 to-fuchsia-500/5 px-3 py-2"
          >
            <div className="text-[10px] font-black text-violet-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              {thinking ? "🧠 IA processando" : "🎙️ Ouvindo"}
              <span className="inline-flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
            <div className="text-sm italic text-muted-foreground min-h-[1.5rem]">
              {transcript || 'Fale algo como: "dois X-Bacon, uma batata e duas cocas"'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
