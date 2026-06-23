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

const cards = [
  {
    to: "/kitchen",
    title: "Painel da Cozinha",
    desc: "Pedidos chegando em tempo real",
    icon: ChefHat,
    color: "from-orange-500/20 to-red-500/10",
  },
  {
    to: "/painel",
    title: "Painel de Entrega",
    desc: "Senhas prontas para o cliente",
    icon: MonitorPlay,
    color: "from-blue-500/20 to-cyan-500/10",
    search: { view: "ready" as const },
  },
  {
    to: "/finance",
    title: "Financeiro / Caixa",
    desc: "Fechamento e relatórios",
    icon: DollarSign,
    color: "from-emerald-500/20 to-green-500/10",
  },
  {
    to: "/admin",
    title: "Admin Geral",
    desc: "Cardápio, mesas, QR Codes, configurações",
    icon: Settings,
    color: "from-purple-500/20 to-pink-500/10",
  },
  {
    to: "/dashboard",
    title: "Dashboard Completo",
    desc: "Métricas, vendas e desempenho",
    icon: BarChart3,
    color: "from-amber-500/20 to-yellow-500/10",
  },
];

function AcessoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 px-4 py-10" lang="pt-BR" translate="no">
      <div className="mx-auto max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar para o site
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Acesso restrito</h1>
          <p className="text-muted-foreground mt-2">
            Escolha um painel. Cada área pede o PIN da equipe responsável.
          </p>
        </header>

        <div className="grid sm:grid-cols-2 gap-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.to}
                to={c.to}
                {...(c.search ? { search: c.search } : {})}
                className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${c.color} opacity-60 group-hover:opacity-100 transition`} />
                <div className="relative flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-background/80 backdrop-blur flex items-center justify-center border border-border">
                    <Icon className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold text-lg text-foreground">{c.title}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{c.desc}</p>
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
