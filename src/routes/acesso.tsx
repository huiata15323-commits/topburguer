import { createFileRoute, Link } from "@tanstack/react-router";
import { ChefHat, MonitorPlay, DollarSign, Settings, BarChart3, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/acesso")({
  head: () => ({
    meta: [
      { title: "Acesso restrito — Top Burguer" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AcessoPage,
});

const NEON = "#FF4500";

const cards = [
  { to: "/kitchen", title: "Painel da Cozinha", desc: "Pedidos chegando em tempo real", icon: ChefHat },
  { to: "/painel", title: "Painel de Entrega", desc: "Senhas prontas para o cliente", icon: MonitorPlay, search: { view: "ready" as const } },
  { to: "/finance", title: "Financeiro / Caixa", desc: "Fechamento e relatórios", icon: DollarSign },
  { to: "/admin", title: "Admin Geral", desc: "Cardápio, mesas, QR Codes, configurações", icon: Settings },
  { to: "/dashboard", title: "Dashboard Completo", desc: "Métricas, vendas e desempenho", icon: BarChart3 },
];

function AcessoPage() {
  return (
    <div className="min-h-screen bg-black px-4 py-10" lang="pt-BR" translate="no">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm mb-6 transition"
          style={{ color: NEON, textShadow: `0 0 8px ${NEON}80` }}
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para o site
        </Link>

        <header className="mb-8">
          <h1
            className="text-3xl sm:text-4xl font-black tracking-tight text-white"
            style={{ textShadow: `0 0 12px ${NEON}, 0 0 24px ${NEON}80` }}
          >
            Acesso restrito
          </h1>
          <p className="text-white/60 mt-2">
            Escolha um painel. Cada área pede o PIN da equipe responsável.
          </p>
        </header>

        <div className="grid sm:grid-cols-2 gap-5">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.to}
                to={c.to}
                {...(c.search ? { search: c.search } : {})}
                className="group relative overflow-hidden rounded-2xl bg-black p-5 transition-all hover:-translate-y-0.5"
                style={{
                  border: `1.5px solid ${NEON}`,
                  boxShadow: `0 0 0 1px ${NEON}40, 0 0 18px ${NEON}55, inset 0 0 18px ${NEON}15`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 0 1px ${NEON}, 0 0 28px ${NEON}, 0 0 60px ${NEON}80, inset 0 0 22px ${NEON}30`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 0 1px ${NEON}40, 0 0 18px ${NEON}55, inset 0 0 18px ${NEON}15`;
                }}
              >
                <div className="relative flex items-start gap-4">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center bg-black"
                    style={{ border: `1.5px solid ${NEON}`, boxShadow: `0 0 12px ${NEON}90, inset 0 0 8px ${NEON}40` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: NEON }} />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-bold text-lg text-white" style={{ textShadow: `0 0 6px ${NEON}80` }}>
                      {c.title}
                    </h2>
                    <p className="text-sm text-white/60 mt-0.5">{c.desc}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
