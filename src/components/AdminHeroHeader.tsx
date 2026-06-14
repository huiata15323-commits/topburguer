// Cabeçalho premium do painel admin: branding, saudação, relógio ao vivo,
// status de operação e KPIs de hoje. Visual rico com aurora + grid técnica.
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useBranding } from "@/lib/branding";
import { useOrders } from "@/lib/orders-store";

function startOfDay(d = new Date()) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}
function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function greeting(h: number) {
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function AdminHeroHeader({
  title = "Administração",
  subtitle = "Gerencie cardápio, identidade e operações",
}: {
  title?: string;
  subtitle?: string;
}) {
  const { branding } = useBranding();
  const { orders } = useOrders();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const today = useMemo(() => {
    const from = startOfDay();
    const list = orders.filter((o) => o.createdAt >= from);
    const revenue = list.reduce((a, o) => a + o.total, 0);
    const pending = list.filter((o) => o.status !== "done").length;
    const done = list.filter((o) => o.status === "done").length;
    return { count: list.length, revenue, pending, done };
  }, [orders]);

  const h = now.getHours();
  const isOpen = h >= 11 && h < 23;
  const clock = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  });

  const kpis = [
    { label: "Pedidos hoje", value: String(today.count), accent: "from-ember/40 via-ember/10" },
    { label: "Faturamento", value: fmtBRL(today.revenue), accent: "from-emerald-500/40 via-emerald-500/10" },
    { label: "Em andamento", value: String(today.pending), accent: "from-amber-warm/40 via-amber-warm/10" },
    { label: "Concluídos", value: String(today.done), accent: "from-violet-500/40 via-violet-500/10" },
  ];

  return (
    <header className="relative overflow-hidden rounded-3xl bg-gradient-night text-white shadow-ember">
      <div className="kitchen-aurora opacity-70" aria-hidden />
      <div className="kitchen-grid" aria-hidden />

      <div className="relative px-5 sm:px-8 py-6 sm:py-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Branding + greeting */}
          <div className="flex items-center gap-4 min-w-0">
            <motion.div
              initial={{ scale: 0.6, rotate: -15, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 180, damping: 14 }}
              className="w-16 h-16 rounded-2xl bg-gradient-ember grid place-items-center text-3xl shadow-ember ring-2 ring-white/10"
            >
              <span className="drop-shadow-lg">{branding.emoji}</span>
            </motion.div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">{title}</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    isOpen
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
                      : "bg-red-500/15 text-red-300 border-red-400/30"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? "bg-emerald-400" : "bg-red-400"} animate-live`} />
                  {isOpen ? "Aberto" : "Fechado"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight truncate">
                {greeting(h)}, <span className="text-amber-warm">{branding.name}</span>
              </h1>
              <p className="text-xs text-white/60 mt-0.5 capitalize">{subtitle} · {dateStr}</p>
            </div>
          </div>

          {/* Relógio + ações */}
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <div className="font-mono text-3xl sm:text-4xl font-black tabular-nums bg-gradient-amber bg-clip-text text-transparent">
                {clock}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">Horário local</div>
            </div>
            <nav className="flex gap-1.5 text-[11px] font-bold">
              <Link to="/order" className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 transition">🛒 Pedido</Link>
              <Link to="/kitchen" className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 transition">👨‍🍳 Cozinha</Link>
              <Link to="/dashboard" className="px-2.5 py-1 rounded-md bg-amber-warm/20 text-amber-warm hover:bg-amber-warm/30 transition">📊 Dashboard</Link>
            </nav>
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {kpis.map((k, i) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur p-3"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${k.accent} to-transparent opacity-80 pointer-events-none`} />
              <div className="relative">
                <div className="text-[9px] uppercase tracking-[0.18em] text-white/60">{k.label}</div>
                <div className="text-xl sm:text-2xl font-black mt-1 tabular-nums">{k.value}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </header>
  );
}
