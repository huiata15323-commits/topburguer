import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, LogOut, Lock } from "lucide-react";

export type StaffRole = "admin" | "cozinha" | "caixa";

const PINS: Record<string, StaffRole> = {
  "9999": "admin",
};

const PIN_KEY = "topburguer.staff.pin";
const AREA_PREFIX = "topburguer.staff.area.";
const LAST_ACTIVITY_PREFIX = "topburguer.staff.activity.";
const LOCK_KEY = "topburguer.staff.lock";
const ATTEMPTS_KEY = "topburguer.staff.attempts";
const MAX_ATTEMPTS = 5;
const LOCK_MS = 30_000;
const INACTIVITY_MS = 30 * 60_000; // 30 min

function areaKey(area: string) {
  return `${AREA_PREFIX}${area}`;
}
function activityKey(area: string) {
  return `${LAST_ACTIVITY_PREFIX}${area}`;
}

export function getStaffPin(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(PIN_KEY);
}

export function staffLogout(area?: string) {
  if (typeof window === "undefined") return;
  if (area) {
    sessionStorage.removeItem(areaKey(area));
    sessionStorage.removeItem(activityKey(area));
  } else {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(AREA_PREFIX) || k.startsWith(LAST_ACTIVITY_PREFIX))
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
  const [lockUntil, setLockUntil] = useState<number>(0);
  const [, force] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(areaKey(area));
    const last = Number(sessionStorage.getItem(activityKey(area)) ?? 0);

    if (
      (stored === "admin" || stored === "cozinha" || stored === "caixa") &&
      last &&
      Date.now() - last < INACTIVITY_MS
    ) {
      setRole(stored);
      sessionStorage.setItem(activityKey(area), String(Date.now()));
    } else if (stored) {
      // expirou por inatividade
      sessionStorage.removeItem(areaKey(area));
      sessionStorage.removeItem(activityKey(area));
    }

    const lk = Number(sessionStorage.getItem(LOCK_KEY) ?? 0);
    if (lk > Date.now()) setLockUntil(lk);

    setReady(true);
  }, [area]);

  // Atualiza atividade enquanto a área está aberta
  useEffect(() => {
    if (!role) return;
    const bump = () => sessionStorage.setItem(activityKey(area), String(Date.now()));
    const events: Array<keyof WindowEventMap> = ["click", "keydown", "pointermove", "touchstart"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    // Verifica inatividade a cada 30s
    const check = setInterval(() => {
      const last = Number(sessionStorage.getItem(activityKey(area)) ?? 0);
      if (last && Date.now() - last > INACTIVITY_MS) {
        sessionStorage.removeItem(areaKey(area));
        sessionStorage.removeItem(activityKey(area));
        window.location.reload();
      }
    }, 30_000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(check);
    };
  }, [role, area]);

  // Countdown do bloqueio
  useEffect(() => {
    if (lockUntil <= Date.now()) return;
    tickRef.current = setInterval(() => force((n) => n + 1), 500);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [lockUntil]);

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

  const lockedSecs = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
  const isLocked = lockedSecs > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    const r = PINS[pin.trim()];
    if (!r || !allow.includes(r)) {
      const attempts = Number(sessionStorage.getItem(ATTEMPTS_KEY) ?? 0) + 1;
      sessionStorage.setItem(ATTEMPTS_KEY, String(attempts));
      if (attempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCK_MS;
        sessionStorage.setItem(LOCK_KEY, String(until));
        sessionStorage.removeItem(ATTEMPTS_KEY);
        setLockUntil(until);
        setErr(`Muitas tentativas. Bloqueado por ${Math.ceil(LOCK_MS / 1000)}s.`);
      } else {
        setErr(
          !r
            ? `PIN inválido (${MAX_ATTEMPTS - attempts} tentativa${MAX_ATTEMPTS - attempts === 1 ? "" : "s"} restante${MAX_ATTEMPTS - attempts === 1 ? "" : "s"})`
            : "Este PIN não tem acesso a esta área.",
        );
      }
      return;
    }

    sessionStorage.setItem(areaKey(area), r);
    sessionStorage.setItem(activityKey(area), String(Date.now()));
    sessionStorage.setItem(PIN_KEY, pin.trim());
    sessionStorage.removeItem(ATTEMPTS_KEY);
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
            <Lock className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-semibold leading-tight">{title}</h1>
            <p className="text-xs text-muted-foreground">Digite o PIN para entrar nesta área</p>
          </div>
        </div>

        <div>
          <label htmlFor="staff-pin" className="text-xs font-medium text-muted-foreground">
            PIN de acesso
          </label>
          <input
            id="staff-pin"
            autoFocus
            type="password"
            inputMode="numeric"
            aria-label="PIN de acesso"
            aria-invalid={!!err}
            disabled={isLocked}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setErr("");
            }}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-lg tracking-[0.5em] text-center font-mono focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            placeholder="••••"
            maxLength={8}
          />
          {err && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {err}
            </p>
          )}
          {isLocked && (
            <p className="mt-2 text-xs text-muted-foreground">Tente novamente em {lockedSecs}s…</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLocked}
          className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLocked ? `Bloqueado (${lockedSecs}s)` : "Entrar"}
        </button>

        <Link to="/acesso" className="block text-center text-xs text-muted-foreground hover:text-foreground">
          ← Escolher outra área
        </Link>
      </form>
    </div>
  );
}
