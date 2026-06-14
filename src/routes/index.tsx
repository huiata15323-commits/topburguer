// Landing institucional — apresenta o Top Burguer System ao colégio.
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useBranding } from "@/lib/branding";
import turma2a from "@/assets/turma-2a.jpg.asset.json";
import turma2b from "@/assets/turma-2b.jpg.asset.json";
import qrMesa from "@/assets/qr-mesa.png.asset.json";
import qrPrintPdf from "@/assets/qr-print.pdf.asset.json";


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
          <Link to="/app" className="hidden sm:inline px-3 py-1.5 rounded-full border border-white/15 hover:bg-white/10 transition">Painel</Link>
          <Link to="/order" className="px-3 py-1.5 rounded-full bg-amber-warm/15 border border-amber-warm/40 text-amber-warm font-bold hover:bg-amber-warm/25 transition">Demonstração →</Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 pt-8 pb-14 sm:pt-14 sm:pb-20 text-center">
        <motion.div
          initial="hidden" animate="show" variants={fade}
          className="inline-flex items-center gap-2 rounded-full border border-amber-warm/30 bg-amber-warm/10 px-3 py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-amber-warm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-warm animate-live" />
          Projeto SENAI · CEPI Elberto Alves
        </motion.div>

        <motion.h1
          initial="hidden" animate="show" variants={fade} custom={1}
          className="mt-5 font-black text-4xl sm:text-6xl md:text-7xl tracking-tight text-balance leading-[0.95]"
        >
          Um sistema completo pra{" "}
          <span className="bg-gradient-to-r from-amber-warm to-ember bg-clip-text text-transparent">hamburgueria</span>.
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

      {/* Acessos rápidos da demo */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-center mb-2 text-balance">
          Demonstração <span className="text-amber-warm">ao vivo</span>
        </h2>
        <p className="text-center text-sm text-white/60 mb-10 max-w-xl mx-auto">
          Explore cada parte do sistema. Tudo conectado em tempo real — pediu, foi pra cozinha.
        </p>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { to: "/order" as const,   emoji: "📱", title: "Cliente pede",     desc: "Cardápio digital pelo celular.", accent: true },
            { to: "/kitchen" as const, emoji: "🔥", title: "Cozinha recebe",   desc: "KDS com timer e voz." },
            { to: "/painel" as const,  emoji: "📺", title: "Painel chama",     desc: "Anuncia pedidos prontos em voz alta." },
            { to: "/admin" as const,   emoji: "⚙️", title: "Admin do menu",   desc: "Cardápio + fotos por IA." },
            { to: "/dashboard" as const, emoji: "📊", title: "Dashboard",      desc: "Vendas, heatmap, picos." },
            { to: "/app" as const,     emoji: "🏠", title: "Hub completo",    desc: "Todas as telas do projeto." },
          ].map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className={`group block rounded-2xl sm:rounded-3xl p-5 border transition-all active:scale-[0.98] ${
                t.accent
                  ? "border-amber-warm/40 bg-gradient-to-br from-amber-warm/15 to-ember/10 hover:border-amber-warm/70 shadow-ember/30 shadow-lg"
                  : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20"
              }`}
            >
              <div className="text-3xl sm:text-4xl">{t.emoji}</div>
              <div className="mt-2 font-black text-base sm:text-lg">{t.title}</div>
              <div className="mt-1 text-xs sm:text-sm text-white/60">{t.desc}</div>
              <div className={`mt-3 text-xs font-bold ${t.accent ? "text-amber-warm" : "text-white/70"} group-hover:translate-x-1 transition-transform`}>
                Abrir →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Sobre o projeto escolar */}
      <section className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="rounded-3xl border border-amber-warm/20 bg-gradient-to-br from-amber-warm/10 via-white/[0.03] to-ember/5 p-6 sm:p-10 text-center">
          <div className="text-[10px] uppercase tracking-widest text-amber-warm font-bold">Projeto Escolar</div>
          <h3 className="mt-2 text-2xl sm:text-3xl font-black text-balance">
            Feito pelos alunos do <span className="text-amber-warm">SENAI / CEPI Elberto Alves</span>
          </h3>
          <p className="mt-4 text-sm sm:text-base text-white/70 leading-relaxed">
            Turmas <strong>2º Ano A e B</strong> do Curso Técnico em Desenvolvimento de Sistemas,
            sob orientação do professor <strong className="text-amber-warm">Huiatã Ribeiro</strong>.
            Sem laboratório, sem computadores em sala — só vontade de aprender e fazer acontecer. 💛
          </p>
        </div>
      </section>


      <section className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-20 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-black mb-4 text-balance">
          Quer ver o sistema <span className="text-amber-warm">funcionando</span>?
        </h2>
        <p className="text-white/65 mb-6 sm:mb-8 text-sm sm:text-base">Toque abaixo e experimente fazer um pedido.</p>
        <Link
          to="/order"
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-ember px-6 sm:px-8 py-4 sm:py-5 font-bold text-base sm:text-lg shadow-ember hover:scale-[1.02] transition-transform"
        >
          Iniciar demonstração 🔥
        </Link>
      </section>


      <footer className="relative z-10 border-t border-white/10 mt-8 py-8 px-4 text-center text-xs text-white/40">
        © Top Burguer System • Feito com IA pelos alunos do CEPI Elberto Alves
      </footer>
    </main>
  );
}
