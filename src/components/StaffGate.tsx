import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, LogOut, Lock } from "lucide-react";

export type StaffRole = "admin" | "cozinha" | "caixa";

// PINs de demonstração (este é um sistema simulado, não use em produção real)
const PINS: Record<string, StaffRole> = {
  "9999": "admin",
  "1234": "cozinha",
  "4321": "caixa",
};

const STORAGE_KEY = "topburguer.staff.role";

export function getStaffRole(): StaffRole | null {
  if (typeof window === "undefined") return null;
  const r = localStorage.getItem(STORAGE_KEY);
  return r === "admin" || r === "cozinha" || r === "caixa" ? r : null;
}

export function staffLogout() {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

interface Props {
  allow: StaffRole[];
  title?: string;
  children: React.ReactNode;
}

export function StaffGate({ allow, title = "Área restrita", children }: Props) {
  const [role, setRole] = useState<StaffRole | null>(null);
  const [ready, setReady] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setRole(getStaffRole());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Verificando acesso…
      </div>
    );
  }

  if (role && allow.includes(role)) {
    return (
      <>
        <div className="fixed bottom-3 right-3 z-50 flex items-center gap-2 rounded-full bg-card/90 backdrop-blur px-3 py-1.5 text-xs shadow-lg border border-border">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span className="font-medium uppercase tracking-wide">{role}</span>
          <button
            onClick={staffLogout}
            className="ml-1 text-muted-foreground hover:text-foreground"
            title="Sair"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
        {children}
      </>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = PINS[pin.trim()];
    if (!r) {
      setErr("PIN inválido");
      return;
    }
    if (!allow.includes(r)) {
      setErr(`Acesso negado para ${r}. Requer: ${allow.join(", ")}`);
      return;
    }
    localStorage.setItem(STORAGE_KEY, r);
    setRole(r);
    setErr("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center gap-2 text-foreground">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold leading-tight">{title}</h1>
            <p className="text-xs text-muted-foreground">
              Acesso: {allow.join(" / ")}
            </p>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">PIN de funcionário</label>
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setErr("");
            }}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-lg tracking-[0.5em] text-center font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="••••"
            maxLength={8}
          />
          {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 font-medium hover:opacity-90 transition"
        >
          Entrar
        </button>

        <div className="text-[10px] text-muted-foreground border-t border-border pt-3 space-y-0.5">
          <p className="font-medium">PINs demo:</p>
          <p>Admin: <span className="font-mono">9999</span> · Cozinha: <span className="font-mono">1234</span> · Caixa: <span className="font-mono">4321</span></p>
        </div>

        <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-foreground">
          ← Voltar para o cardápio
        </Link>
      </form>
    </div>
  );
}
