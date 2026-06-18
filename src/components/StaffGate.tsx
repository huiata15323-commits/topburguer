import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, LogOut, Lock } from "lucide-react";

export type StaffRole = "admin" | "cozinha" | "caixa";

const PINS: Record<string, StaffRole> = {
  "9999": "admin",
  "2113": "cozinha",
  "4554": "caixa",
};

const PIN_KEY = "topburguer.staff.pin";
const AREA_PREFIX = "topburguer.staff.area.";

function areaKey(area: string) {
  return `${AREA_PREFIX}${area}`;
}

export function getStaffPin(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(PIN_KEY);
}

export function staffLogout(area?: string) {
  if (typeof window === "undefined") return;
  if (area) {
    sessionStorage.removeItem(areaKey(area));
  } else {
    // Clear everything
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(AREA_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
    sessionStorage.removeItem(PIN_KEY);
  }
  window.location.reload();
}

interface Props {
  area: string;
  allow: StaffRole[];
  title?: string;
  children: React.ReactNode;
}

export function StaffGate({ area, allow, title = "Área restrita", children }: Props) {
  const [role, setRole] = useState<StaffRole | null>(null);
  const [ready, setReady] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem(areaKey(area));
    if (stored === "admin" || stored === "cozinha" || stored === "caixa") {
      setRole(stored);
    }
    setReady(true);
  }, [area]);

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
            onClick={() => staffLogout(area)}
            className="ml-1 text-muted-foreground hover:text-foreground"
            title="Sair desta área"
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
      setErr(`Este PIN não tem acesso a esta área.`);
      return;
    }
    sessionStorage.setItem(areaKey(area), r);
    sessionStorage.setItem(PIN_KEY, pin.trim());
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
            <p className="text-xs text-muted-foreground">Digite o PIN para entrar nesta área</p>
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

        <Link to="/acesso" className="block text-center text-xs text-muted-foreground hover:text-foreground">
          ← Escolher outra área
        </Link>
      </form>
    </div>
  );
}
