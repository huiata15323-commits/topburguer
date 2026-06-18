import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth, useUserRoles, type AppRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ensureApprovedAdminRole } from "@/lib/admin-access.functions";

type Props = {
  roles: AppRole[];
  children: ReactNode;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const err = error as {
      message?: unknown;
      error_description?: unknown;
      details?: unknown;
      error?: unknown;
    };
    const message = err.message ?? err.error_description ?? err.details ?? err.error;
    if (typeof message === "string") return message;
  }
  return "Erro inesperado. Tente sair e entrar novamente.";
}

/**
 * Gate de UI: exige usuário logado E pelo menos um dos papéis.
 * A segurança real continua sendo as RLS policies + edge functions.
 */
export function RoleGate({ roles, children }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { roles: userRoles, loading: rolesLoading, hasAnyRole } = useUserRoles(user?.id);
  const navigate = useNavigate();
  const [claiming, setClaiming] = useState(false);
  const [autoGrantTried, setAutoGrantTried] = useState(false);
  const grantApprovedAdmin = useServerFn(ensureApprovedAdminRole);

  useEffect(() => {
    if (!user || authLoading || rolesLoading || autoGrantTried) return;
    if (!roles.includes("admin") || userRoles.includes("admin")) return;

    // Evita loop infinito de reload: marca em sessionStorage que já tentamos
    // a liberação automática para este usuário nesta sessão. Se o grant
    // não conceder o papel, mostramos o botão de liberação manual em vez
    // de recarregar a página repetidamente.
    const flagKey = `topburguer.adminGrantTried.${user.id}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(flagKey)) {
      setAutoGrantTried(true);
      return;
    }

    setAutoGrantTried(true);
    setClaiming(true);
    if (typeof window !== "undefined") sessionStorage.setItem(flagKey, "1");
    grantApprovedAdmin({ data: {} })
      .then(() => {
        toast.success("Acesso de administrador liberado. Recarregando…");
        setTimeout(() => window.location.reload(), 600);
      })
      .catch((error) => {
        console.error("[admin access] grant failed", error);
        setClaiming(false);
      });
  }, [authLoading, autoGrantTried, grantApprovedAdmin, roles, rolesLoading, user, userRoles]);

  const claimAdmin = async () => {
    setClaiming(true);
    try {
      await grantApprovedAdmin({ data: {} });
      toast.success("Acesso de administrador liberado. Recarregando…");
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      toast.error("Não foi possível: " + getErrorMessage(e));
      setClaiming(false);
    }
  };

  if (authLoading || (user && rolesLoading)) {
    return (
      <main className="min-h-dvh grid place-items-center bg-background text-foreground">
        <div className="text-sm text-muted-foreground animate-pulse">Carregando…</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-dvh grid place-items-center bg-gradient-night text-white px-4">
        <div className="max-w-sm text-center space-y-4">
          <div className="text-5xl">🔒</div>
          <h1 className="text-2xl font-black">Acesso restrito</h1>
          <p className="text-sm text-white/70">Entre com sua conta para acessar esta área.</p>
          <Link
            to="/auth"
            className="inline-block px-6 py-3 rounded-xl bg-gradient-ember text-ember-foreground font-bold shadow-ember"
          >
            Entrar
          </Link>
        </div>
      </main>
    );
  }

  if (!hasAnyRole(roles)) {
    return (
      <main className="min-h-dvh grid place-items-center bg-background text-foreground px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">⛔</div>
          <h1 className="text-2xl font-black">Sem permissão</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta ({user.email}) não tem nenhum dos papéis necessários:{" "}
            <strong>{roles.join(", ")}</strong>.
          </p>
          <p className="text-xs text-muted-foreground">
            Papéis atuais: {userRoles.length > 0 ? userRoles.join(", ") : "nenhum"}.
            <br />
            Peça a um administrador para liberar seu acesso.
          </p>
          {roles.includes("admin") && (
            <div className="rounded-xl border border-amber-warm/40 bg-amber-warm/10 p-3 text-xs text-left">
              <div className="font-bold text-amber-warm mb-1">🚀 Administrador geral</div>
              <p className="text-muted-foreground mb-2">
                Se seu email estiver liberado pela equipe, ative seu acesso de administrador aqui.
              </p>
              <button
                onClick={claimAdmin}
                disabled={claiming}
                className="w-full py-2 rounded-lg bg-gradient-ember text-ember-foreground font-bold text-xs disabled:opacity-50"
              >
                {claiming ? "Liberando…" : "Liberar meu acesso de administrador"}
              </button>
            </div>
          )}
          <div className="flex gap-2 justify-center">
            <Link to="/" className="px-4 py-2 rounded-xl border border-border font-semibold">
              Início
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth", replace: true });
              }}
              className="px-4 py-2 rounded-xl bg-muted hover:bg-secondary font-semibold"
            >
              Sair
            </button>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
