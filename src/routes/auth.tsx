import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/lib/branding";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Top Burguer" },
      { name: "description", content: "Acesse o painel administrativo do Top Burguer." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { branding } = useBranding();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/admin", replace: true });
    }
  }, [user, loading, navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu email se a confirmação estiver ativa.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("Bem-vindo!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na autenticação");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-dvh grid place-items-center bg-gradient-night text-white px-4 py-8">
      <div className="w-full max-w-md rounded-3xl bg-card text-card-foreground shadow-2xl border border-border p-6 sm:p-8">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-ember grid place-items-center font-black shadow-ember">
            {branding.emoji}
          </div>
          <div>
            <div className="font-black leading-none">{branding.name}</div>
            <div className="text-[10px] text-amber-warm uppercase tracking-widest">
              Acesso da equipe
            </div>
          </div>
        </Link>

        <h1 className="text-2xl font-black mb-1">
          {mode === "signin" ? "Entrar" : "Criar conta"}
        </h1>
        <p className="text-sm text-muted-foreground mb-5">
          {mode === "signin"
            ? "Acesse o painel, financeiro ou cozinha."
            : "Crie sua conta. Um admin vai liberar seu acesso."}
        </p>

        <form onSubmit={handleEmail} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border focus:border-ember focus:outline-none bg-background"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border focus:border-ember focus:outline-none bg-background"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl bg-gradient-ember text-ember-foreground font-bold disabled:opacity-50 shadow-ember"
          >
            {busy ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground mt-4"
        >
          {mode === "signin" ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}
        </button>

        <Link to="/" className="block text-center text-xs text-muted-foreground mt-6 hover:text-amber-warm">
          ← Voltar para o cardápio
        </Link>
      </div>
    </main>
  );
}
