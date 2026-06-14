// Landing institucional — apresenta o Top Burguer System ao colégio.
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useBranding } from "@/lib/branding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Top Burguer System — Projeto SENAI / CEPI Elberto Alves" },
      {
        name: "description",
        content:
          "Sistema completo de pedidos para hamburgueria: cardápio QR, KDS na cozinha, painel com voz e IA. Projeto dos alunos do Curso Técnico em Desenvolvimento de Sistemas.",
      },
      { property: "og:title", content: "Top Burguer System — Projeto Escolar" },
      {
        property: "og:description",
        content: "Garçom IA por voz, fotos geradas por IA, painel de chamadas. Feito pelos alunos do SENAI / CEPI Elberto Alves.",
      },
    ],
  }),
  component: Landing,
});

const DIFFERENCES = [
  { emoji: "🎙️", title: "Garçom IA por voz", desc: 'Cliente fala "dois X-Bacon e uma coca" — o pedido monta sozinho.' },
  { emoji: "📸", title: "Fotos geradas por IA", desc: "Digite o nome do prato — a IA cria a foto profissional em segundos." },
  { emoji: "🔊", title: "Chamada por voz", desc: "Painel anuncia: 'Mesa 5, pedido pronto!' — chega de gritar." },
  { emoji: "🧠", title: "Resumo IA diário", desc: "Toda noite a IA te conta o que vendeu e o que melhorar amanhã." },
  { emoji: "🎨", title: "Identidade própria", desc: "Mude nome, emoji e tema em 1 clique. Use seu domínio." },
  { emoji: "📱", title: "Funciona como app", desc: "Cliente instala no celular. Sem download da Play Store." },
];

const fade = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } }),
};

function Landing() {
  const { branding } = useBranding();
  return (
    <main className="min-h-screen bg-gradient-night text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-grain pointer-events-none" />

      <nav className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-ember grid place-items-center font-black text-lg shadow-ember">{branding.emoji}</div>
          <span className="font-black tracking-tight truncate text-sm sm:text-base">Top Burguer System</span>
        </Link>
        <div className="flex items-center gap-2 text-xs shrink-0">
          <Link to="/app" className="hidden sm:inline px-3 py-1.5 rounded-full border border-white/15 hover:bg-white/10 transition">Acessar painel</Link>
          <Link to="/order" className="px-3 py-1.5 rounded-full bg-amber-warm/15 border border-amber-warm/40 text-amber-warm font-bold hover:bg-amber-warm/25 transition">Demo grátis →</Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 pt-8 pb-14 sm:pt-14 sm:pb-20 text-center">
        <motion.div
          initial="hidden" animate="show" variants={fade}
          className="inline-flex items-center gap-2 rounded-full border border-amber-warm/30 bg-amber-warm/10 px-3 py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-amber-warm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-warm animate-live" />
          Para hamburguerias que querem girar mais
        </motion.div>

        <motion.h1
          initial="hidden" animate="show" variants={fade} custom={1}
          className="mt-5 font-black text-4xl sm:text-6xl md:text-7xl tracking-tight text-balance leading-[0.95]"
        >
          O sistema que faz sua{" "}
          <span className="bg-gradient-to-r from-amber-warm to-ember bg-clip-text text-transparent">cozinha voar</span>.
        </motion.h1>

        <motion.p
          initial="hidden" animate="show" variants={fade} custom={2}
          className="mt-5 text-base sm:text-lg md:text-xl text-white/70 max-w-2xl mx-auto text-balance"
        >
          QR de mesa, KDS na cozinha, painel de chamadas com voz, IA que entende o cliente
          e gera fotos dos pratos. Tudo numa plataforma só.
        </motion.p>

        <motion.div
          initial="hidden" animate="show" variants={fade} custom={3}
          className="mt-8 flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto sm:max-w-none"
        >
          <Link to="/order" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-ember px-6 py-4 font-bold shadow-ember hover:scale-[1.02] active:scale-[0.98] transition-transform">
            Testar como cliente →
          </Link>
          <Link to="/app" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-4 font-semibold hover:bg-white/10 transition">
            Ver painel do restaurante
          </Link>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-center mb-2 text-balance">
          O que torna o Top Burguer <span className="text-amber-warm">diferente</span>
        </h2>
        <p className="text-center text-sm sm:text-base text-white/60 max-w-2xl mx-auto mb-10">
          Outros sistemas digitalizam o cardápio. O nosso usa IA pra vender mais.
        </p>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DIFFERENCES.map((d, i) => (
            <motion.div
              key={d.title}
              initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}
              variants={fade} custom={i}
              className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur p-5 sm:p-6 hover:border-amber-warm/40 hover:bg-white/[0.06] transition-all"
            >
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">{d.emoji}</div>
              <h3 className="font-black text-base sm:text-lg mb-1">{d.title}</h3>
              <p className="text-xs sm:text-sm text-white/65 leading-relaxed">{d.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="planos" className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-center mb-2 text-balance">
          Planos que <span className="text-amber-warm">cabem no caixa</span>
        </h2>
        <p className="text-center text-sm text-white/60 mb-10">Sem fidelidade. Cancele quando quiser.</p>

        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          {PLANS.map((p, i) => (
            <motion.div
              key={p.key}
              initial="hidden" whileInView="show" viewport={{ once: true }}
              variants={fade} custom={i}
              className={`relative rounded-2xl sm:rounded-3xl p-5 sm:p-6 ${
                p.highlight
                  ? "bg-gradient-to-br from-ember/20 via-amber-warm/10 to-ember/5 border-2 border-amber-warm shadow-ember md:scale-[1.02]"
                  : "bg-white/[0.03] border border-white/10"
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-warm text-charcoal text-[10px] font-black uppercase tracking-widest shadow-md whitespace-nowrap">
                  ⭐ Mais escolhido
                </div>
              )}
              <div className="text-xs sm:text-sm font-bold text-amber-warm uppercase tracking-wider">{p.name}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-black">{p.price}</span>
                <span className="text-white/50 text-sm">{p.period}</span>
              </div>
              <p className="mt-2 text-sm text-white/65">{p.tagline}</p>

              <ul className="mt-5 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-amber-warm shrink-0">✓</span>
                    <span className="text-white/85">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/order"
                className={`mt-6 block text-center py-3 rounded-2xl font-bold transition-all ${
                  p.highlight
                    ? "bg-gradient-ember text-ember-foreground shadow-ember hover:scale-[1.02]"
                    : "border border-white/20 bg-white/5 hover:bg-white/10"
                }`}
              >
                Testar grátis
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-white/40 mt-8 px-4">
          Implantação personalizada: R$ 500 – R$ 1.500 (cardápio inicial, logo, treinamento).
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-20 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-black mb-4 text-balance">
          Pronto pra ver sua hamburgueria <span className="text-amber-warm">no nível</span>?
        </h2>
        <p className="text-white/65 mb-6 sm:mb-8 text-sm sm:text-base">Sem cartão. Sem instalação. Em 5 minutos tá rodando.</p>
        <Link
          to="/order"
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-ember px-6 sm:px-8 py-4 sm:py-5 font-bold text-base sm:text-lg shadow-ember hover:scale-[1.02] transition-transform"
        >
          Começar agora 🔥
        </Link>
      </section>

      <footer className="relative z-10 border-t border-white/10 mt-8 py-8 px-4 text-center text-xs text-white/40">
        © Top Burguer System • Feito com IA pelos alunos do CEPI Elberto Alves
      </footer>
    </main>
  );
}
