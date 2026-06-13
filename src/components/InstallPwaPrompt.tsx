// Banner discreto pra instalar o app (PWA). Aparece só quando o navegador
// dispara beforeinstallprompt e o usuário ainda não dispensou.
import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "fast-order:pwa-dismissed";

export function InstallPwaPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !deferred) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] rounded-2xl bg-card border-2 border-ember/40 shadow-ember p-4 flex items-center gap-3 backdrop-blur">
      <span className="text-3xl">📱</span>
      <div className="flex-1 min-w-0">
        <div className="font-black text-sm">Instalar como app</div>
        <div className="text-[11px] text-muted-foreground">Acesso rápido na tela inicial, sem abrir o navegador.</div>
      </div>
      <button
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
          setVisible(false);
        }}
        className="px-3 py-2 rounded-xl bg-gradient-ember text-ember-foreground font-bold text-xs shadow-ember whitespace-nowrap"
      >
        Instalar
      </button>
      <button
        onClick={() => {
          localStorage.setItem(DISMISSED_KEY, "1");
          setVisible(false);
        }}
        className="text-muted-foreground hover:text-foreground text-xl leading-none px-1"
        aria-label="Dispensar"
      >
        ×
      </button>
    </div>
  );
}
