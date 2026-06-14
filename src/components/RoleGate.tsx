import { ReactNode, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth, useUserRoles, type AppRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  roles: AppRole[];
  children: ReactNode;
};

/**
 * Gate de UI: exige usuário logado E pelo menos um dos papéis.
 * A segurança real continua sendo as RLS policies + edge functions.
 */
export function RoleGate({ roles, children }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { roles: userRoles, loading: rolesLoading, hasAnyRole } = useUserRoles(user?.id);
  const navigate = useNavigate();
  const [claiming, setClaiming] = useState(false);

  const claimAdmin = async () => {
    setClaiming(true);
    try {
      const { error } = await supabase.rpc("claim_first_admin");
      if (error) throw error;
      toast.success("Você agora é admin! Recarregando…");
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("admin already exists")) {
        toast.error("Já existe um admin. Peça para ele te liberar.");
      } else {
        toast.error("Não foi possível: " + msg);
      }
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
