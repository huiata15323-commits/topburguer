// Hub interno do restaurante — central de acesso mobile-first
// para Cardápio, Cozinha, Admin, Painel, Dashboard e Financeiro.
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useBranding } from "@/lib/branding";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Painel — Top Burguer" },
      { name: "description", content: "Hub do restaurante: cardápio, cozinha, admin, painel e financeiro." },
    ],
  }),
  component: AppHub,
});

type Tile = {
  to: "/order" | "/kitchen" | "/admin" | "/painel" | "/dashboard" | "/finance" | "/mesa" | "/status";
  emoji: string;
  title: string;
  desc: string;
  accent?: boolean;
};

const TILES: Tile[] = [
  { to: "/order",     emoji: "📱", title: "Cardápio",   desc: "Cliente faz o pedido pelo celular.", accent: true },
  { to: "/kitchen",   emoji: "🔥", title: "Cozinha (KDS)", desc: "Fila de pedidos em tempo real." },
  { to: "/painel",    emoji: "📺", title: "Painel TV",  desc: "Chamada de pedidos prontos com voz." },
  { to: "/admin",     emoji: "⚙️", title: "Admin",      desc: "Cardápio, fotos por IA, branding." },
  { to: "/dashboard", emoji: "📊", title: "Dashboard",  desc: "Vendas, horários de pico e heatmap." },
  { to: "/finance",   emoji: "💰", title: "Financeiro", desc: "Caixa do dia, relatórios em PDF." },
  { to: "/mesa",      emoji: "🍽️", title: "Comanda",    desc: "Total da mesa e dividir a conta." },
  { to: "/status",    emoji: "⏱️", title: "Status",     desc: "Cliente acompanha o pedido." },
];

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } }),
};

function AppHub() {
  const { branding } = useBranding();
  return (
    <main className="min-h-screen bg-gradient-night text-white relative overflow-hidden pb-24">
      <div className="absolute inset-0 bg-grain pointer-events-none" />

      {/* Top bar */}
      <header className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 pt-5 pb-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-ember grid place-items-center font-black text-lg shadow-ember">
            {branding.emoji}
          </div>
          <div className="min-w-0">
            <div className="font-black tracking-tight truncate text-sm sm:text-base">{branding.name}</div>
            <div className="text-[10px] uppercase tracking-widest text-white/40">Painel do restaurante</div>
          </div>
        </Link>
        <div className="hidden sm:flex items-center gap-2 text-xs text-white/60">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live" />
          Sistema online
        </div>
      </header>

      {/* Hero compacto */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 pt-4 pb-6">
        <motion.h1
          initial="hidden" animate="show" variants={fade}
          className="text-2xl sm:text-4xl font-black tracking-tight text-balance"
        >
          O que você quer fazer agora?
        </motion.h1>
        <motion.p
          initial="hidden" animate="show" variants={fade} custom={1}
          className="mt-2 text-sm sm:text-base text-white/60"
        >
          Toque em um cartão pra abrir. Tudo conectado em tempo real.
        </motion.p>
      </section>

      {/* Grid de cartões */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {TILES.map((t, i) => (
            <motion.div
              key={t.to}
              initial="hidden" animate="show" variants={fade} custom={i}
            >
              <Link
                to={t.to}
                className={`group block h-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 border transition-all active:scale-[0.98] ${
                  t.accent
                    ? "border-amber-warm/40 bg-gradient-to-br from-amber-warm/15 to-ember/10 hover:border-amber-warm/70 shadow-ember/30 shadow-lg"
                    : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20"
                }`}
              >
                <div className="text-3xl sm:text-4xl">{t.emoji}</div>
                <div className="mt-2 sm:mt-3 font-black text-base sm:text-lg leading-tight">{t.title}</div>
                <div className="mt-1 text-[11px] sm:text-xs text-white/55 leading-snug line-clamp-2">{t.desc}</div>
                <div className={`mt-3 text-xs font-bold ${t.accent ? "text-amber-warm" : "text-white/70"} group-hover:translate-x-1 transition-transform`}>
                  Abrir →
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto max-w-md grid grid-cols-4">
          {[
            { to: "/app" as const,     emoji: "🏠", label: "Hub" },
            { to: "/order" as const,   emoji: "📱", label: "Pedir" },
            { to: "/kitchen" as const, emoji: "🔥", label: "Cozinha" },
            { to: "/admin" as const,   emoji: "⚙️", label: "Admin" },
          ].map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-amber-warm" }}
              inactiveProps={{ className: "text-white/60" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wider hover:text-white transition"
            >
              <span className="text-lg leading-none">{n.emoji}</span>
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
