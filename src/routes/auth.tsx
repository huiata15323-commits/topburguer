import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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

  const handleGoogle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/admin",
      });
      if (result.error) {
        toast.error("Falha ao entrar com Google");
        setBusy(false);
        return;
      }
      // redirected → page will reload; else session already set
    } catch {
      toast.error("Erro inesperado com Google");
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

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border hover:bg-muted font-semibold transition disabled:opacity-50 mb-4"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.2 2.4-5.2 0-9.6-3.3-11.2-8L6.3 33C9.5 39.5 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C40.9 35.7 44 30.3 44 24c0-1.3-.1-2.4-.4-3.5z"/>
          </svg>
          Entrar com Google
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">ou com email</span>
          </div>
        </div>

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
