// Landing comercial — vende o Top Burguer System para outras hamburguerias.
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Mic,
  ImageIcon,
  Volume2,
  LineChart,
  Palette,
  Smartphone,
  QrCode,
  ChefHat,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Top Burguer System — Sistema de pedidos para sua hamburgueria" },
      {
        name: "description",
        content:
          "Cardápio digital, QR de mesa, KDS para a cozinha, painel de pedidos prontos com voz e IA. Tudo num só lugar — sem mensalidade abusiva.",
      },
      { property: "og:title", content: "Top Burguer System — Para sua hamburgueria" },
      {
        property: "og:description",
        content: "Diferenciais: IA para pedido por voz, fotos de pratos geradas por IA, painel de chamadas com voz, modo offline-ready.",
      },
    ],
  }),
  component: SobrePage,
});

const PLANS = [
  {
    key: "starter",
    name: "Starter",
    price: "R$ 49",
    period: "/mês",
    tagline: "Para começar com cardápio digital",
    features: [
      "Cardápio QR por mesa",
      "Pedidos via celular do cliente",
      "Pagamento PIX/Cartão",
      "Recibo digital",
      "Até 1 unidade",
    ],
    highlight: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: "R$ 149",
    period: "/mês",
    tagline: "Para quem quer girar a cozinha",
    features: [
      "Tudo do Starter, mais:",
      "KDS (Kitchen Display) com voz",
      "Painel de chamadas para retirada",
      "Resumo do dia por IA",
      "Financeiro + relatórios PDF",
      "Heatmap de mesas",
      "Programa de fidelidade",
    ],
    highlight: true,
  },
  {
    key: "premium",
    name: "Premium",
    price: "R$ 299",
    period: "/mês",
    tagline: "Para redes e operações sérias",
    features: [
      "Tudo do Pro, mais:",
      "🎙️ Garçom IA por voz (cliente fala)",
      "📸 Fotos de pratos geradas por IA",
      "Multi-loja / franquia",
      "Integração iFood / 99Food (em breve)",
      "White label completo",
      "Suporte prioritário",
    ],
    highlight: false,
  },
];


const DIFFERENCES = [
  {
    icon: QrCode,
    tag: "Operação",
    title: "Pedido direto da mesa",
    desc: "QR Code na mesa abre o cardápio no celular do cliente. Sem fila, sem app, sem cadastro — o pedido chega na cozinha em segundos.",
  },
  {
    icon: ChefHat,
    tag: "Cozinha",
    title: "KDS em tempo real",
    desc: "Painel da cozinha recebe cada pedido organizado por mesa e por status. Cronômetro, prioridade e baixa automática de estoque.",
  },
  {
    icon: Volume2,
    tag: "Atendimento",
    title: "Painel de chamada por voz",
    desc: "Quando o pedido fica pronto, o painel anuncia em voz alta a senha e a mesa. Ninguém precisa gritar do balcão.",
  },
  {
    icon: Mic,
    tag: "Acessibilidade",
    title: "Comanda por voz",
    desc: 'O cliente fala "dois X-Bacon e uma coca" e o pedido se monta sozinho. Pensado para idosos, pessoas com baixa visão e dias corridos.',
  },
  {
    icon: ImageIcon,
    tag: "Cardápio",
    title: "Fotos profissionais sob demanda",
    desc: "Sem precisar contratar fotógrafo: o sistema gera a foto do prato a partir do nome, no padrão visual da casa.",
  },
  {
    icon: LineChart,
    tag: "Gestão",
    title: "Resumo do dia automático",
    desc: "No fechamento, o sistema entrega o que vendeu mais, horário de pico, ticket médio e sugestão do que produzir amanhã.",
  },
  {
    icon: Palette,
    tag: "Marca",
    title: "Identidade da sua casa",
    desc: "Nome, logo, cores e tipografia mudam em 1 clique. Funciona no seu domínio — não fica com a cara de outra plataforma.",
  },
  {
    icon: Smartphone,
    tag: "Tecnologia",
    title: "Funciona como aplicativo",
    desc: "Cliente instala no celular, garçom usa no tablet. Tudo via navegador, sem passar pela Play Store ou App Store.",
  },
  {
    icon: ShieldCheck,
    tag: "Confiança",
    title: "Construído por estudantes",
    desc: "Projeto autoral dos alunos do Curso Técnico em Desenvolvimento de Sistemas — SENAI / CEPI Elberto Alves, turmas 2A e 2B (2025–2026).",
  },
];

const fade = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function SobrePage() {
  return (
    <main className="min-h-screen bg-gradient-night text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-grain pointer-events-none" />

      <nav className="relative z-10 mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-ember grid place-items-center font-black text-lg shadow-ember">🔥</div>
          <span className="font-black tracking-tight">Top Burguer System</span>
        </Link>
        <div className="flex items-center gap-3 text-xs">
          <Link to="/order" className="text-white/70 hover:text-amber-warm transition">Testar grátis →</Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-10 pb-20 text-center">
        <motion.div
          initial="hidden" animate="show" variants={fade}
          className="inline-flex items-center gap-2 rounded-full border border-amber-warm/30 bg-amber-warm/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-warm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-warm animate-live" />
          Para hamburguerias que querem girar mais
        </motion.div>

        <motion.h1
          initial="hidden" animate="show" variants={fade} custom={1}
          className="mt-6 font-black text-5xl md:text-7xl tracking-tight text-balance leading-[0.95]"
        >
          O sistema que faz sua{" "}
          <span className="bg-gradient-to-r from-amber-warm to-ember bg-clip-text text-transparent">
            cozinha voar
          </span>.
        </motion.h1>

        <motion.p
          initial="hidden" animate="show" variants={fade} custom={2}
          className="mt-6 text-lg md:text-xl text-white/70 max-w-2xl mx-auto text-balance"
        >
          QR de mesa, KDS na cozinha, painel de chamadas com voz, IA que entende
          o cliente e gera fotos dos pratos. Tudo numa plataforma só, sem
          mensalidade abusiva.
        </motion.p>

        <motion.div
          initial="hidden" animate="show" variants={fade} custom={3}
          className="mt-10 flex flex-wrap gap-3 justify-center"
        >
          <Link
            to="/order"
            className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-ember px-6 py-4 font-bold shadow-ember hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            Ver demo agora <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <a
            href="#planos"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-4 font-semibold hover:bg-white/10 transition"
          >
            Ver planos
          </a>
        </motion.div>
      </section>

      {/* Diferenciais */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-col items-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 mb-5">
            <Sparkles className="h-3 w-3 text-amber-warm" /> O que entregamos
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-center text-balance leading-[1.05]">
            Engenharia que se sente <span className="text-amber-warm">no salão</span>
          </h2>
          <p className="mt-4 text-center text-white/60 max-w-2xl text-balance">
            Uma plataforma completa de operação — projetada, programada e desenhada do zero
            pelos alunos do curso técnico, com foco em hamburguerias reais.
          </p>
        </div>

        <div className="grid gap-px bg-white/5 rounded-3xl overflow-hidden border border-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {DIFFERENCES.map((d, i) => {
            const Icon = d.icon;
            return (
              <motion.div
                key={d.title}
                initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
                variants={fade} custom={i}
                className="group relative bg-charcoal/60 backdrop-blur p-7 hover:bg-charcoal/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-amber-warm/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative h-11 w-11 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] grid place-items-center">
                      <Icon className="h-5 w-5 text-amber-warm" strokeWidth={1.75} />
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                    {String(i + 1).padStart(2, "0")} · {d.tag}
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-2 text-white">{d.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{d.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl md:text-4xl font-black text-center mb-3 text-balance">
          Planos que <span className="text-amber-warm">cabem no caixa</span>
        </h2>
        <p className="text-center text-white/60 mb-12">Sem fidelidade. Cancele quando quiser.</p>

        <div className="grid gap-5 lg:grid-cols-3">
          {PLANS.map((p, i) => (
            <motion.div
              key={p.key}
              initial="hidden" whileInView="show" viewport={{ once: true }}
              variants={fade} custom={i}
              className={`relative rounded-3xl p-6 ${
                p.highlight
                  ? "bg-gradient-to-br from-ember/20 via-amber-warm/10 to-ember/5 border-2 border-amber-warm shadow-ember scale-[1.02]"
                  : "bg-white/[0.03] border border-white/10"
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-warm text-charcoal text-[10px] font-black uppercase tracking-widest shadow-md">
                  ⭐ Mais escolhido
                </div>
              )}
              <div className="text-sm font-bold text-amber-warm uppercase tracking-wider">{p.name}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-5xl font-black">{p.price}</span>
                <span className="text-white/50 text-sm">{p.period}</span>
              </div>
              <p className="mt-2 text-sm text-white/65">{p.tagline}</p>

              <ul className="mt-6 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-amber-warm shrink-0">✓</span>
                    <span className="text-white/85">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/order"
                className={`mt-7 block text-center py-3 rounded-2xl font-bold transition-all ${
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

        <p className="text-center text-xs text-white/40 mt-8">
          Implantação personalizada: R$ 500 – R$ 1.500 (cardápio inicial, logo, treinamento).
        </p>
      </section>

      {/* Depoimentos */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={fade} custom={0}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-black text-balance">
            O que dizem <span className="text-amber-warm">nossos clientes</span>
          </h2>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { quote: "O sistema revolucionou nossa operação. Pedidos chegam organizados na cozinha e o painel de chamadas eliminou a confusão no balcão.", name: "Mariana L.", role: "Dona · Burguer Studio" },
            { quote: "Implantação em 1 dia. O cardápio QR já estava funcionando e os clientes adoraram fazer pedido pelo celular.", name: "Carlos R.", role: "Gerente · Fire Burguer" },
            { quote: "O resumo do dia por IA me ajuda a saber exatamente o que produzir amanhã. Reduzi o desperdício em 30%.", name: "Ana P.", role: "Sócia · Smash House" },
          ].map((t, i) => (
            <motion.div
              key={t.name}
              initial="hidden" whileInView="show" viewport={{ once: true }}
              variants={fade} custom={i}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:border-amber-warm/30 transition-colors"
            >
              <div className="text-2xl text-amber-warm mb-3">"</div>
              <p className="text-sm text-white/75 leading-relaxed">{t.quote}</p>
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="font-bold text-sm">{t.name}</div>
                <div className="text-xs text-white/50">{t.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Agradecimento ao Professor */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-20 text-center overflow-hidden">
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={fade} custom={0}
          className="relative rounded-3xl border border-amber-warm/20 bg-gradient-to-br from-amber-warm/10 via-ember/10 to-red-600/10 p-8 md:p-14 backdrop-blur-sm"
        >
          {/* Floating hearts */}
          {[...Array(12)].map((_, i) => {
            const positions = [
              { top: "8%", left: "5%" }, { top: "12%", right: "8%" },
              { top: "5%", left: "45%" }, { top: "25%", left: "2%" },
              { top: "20%", right: "3%" }, { top: "50%", left: "8%" },
              { top: "55%", right: "6%" }, { top: "75%", left: "4%" },
              { top: "80%", right: "10%" }, { bottom: "10%", left: "30%" },
              { bottom: "8%", right: "25%" }, { top: "40%", right: "2%" },
            ];
            const delays = [0, 0.5, 1, 1.5, 0.3, 0.8, 1.2, 0.2, 1.4, 0.6, 1.1, 0.9];
            const scales = [1, 0.8, 1.2, 0.9, 1.1, 0.7, 1.3, 0.85, 1.15, 0.75, 1.05, 0.95];
            return (
              <motion.span
                key={i}
                className="absolute text-2xl md:text-3xl select-none pointer-events-none"
                style={positions[i]}
                animate={{
                  y: [0, -12, 0, 8, 0],
                  opacity: [0.4, 0.9, 0.5, 0.8, 0.4],
                  scale: [scales[i], scales[i] * 1.15, scales[i] * 0.9, scales[i] * 1.05, scales[i]],
                }}
                transition={{
                  duration: 3 + (i % 3),
                  repeat: Infinity,
                  delay: delays[i],
                  ease: "easeInOut",
                }}
              >
                ❤️
              </motion.span>
            );
          })}

          <div className="relative z-10">
            <h3 className="text-2xl md:text-4xl font-black mb-6 text-balance">
              Obrigado, <span className="text-amber-warm">Huiatã Ribeiro</span>!
            </h3>
            <p className="text-base md:text-lg text-white/80 leading-relaxed text-balance max-w-2xl mx-auto">
              Agradecemos muito ao nosso querido professor, que teve paciência e dedicação com nossas turmas
              mesmo diante das dificuldades. Obrigada por todos os ensinamentos, puxões de orelhas e feedbacks.
              Você foi um pilar importantíssimo no nosso crescimento, tanto pessoal quanto profissional,
              e sabemos que sem sua ajuda não poderíamos conseguir metade das coisas que hoje conseguimos fazer,
              pois você sempre incentivou a sermos cada vez melhores. Obrigado por tudo!
            </p>
            <div className="mt-6 text-amber-warm font-bold tracking-wide text-sm uppercase">
              — Turmas 2A e 2B • CEPI Elberto Alves
            </div>
          </div>
        </motion.div>
      </section>

      {/* CTA final */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-3xl md:text-5xl font-black mb-4 text-balance">
          Pronto para ver sua hamburgueria <span className="text-amber-warm">em outro nível</span>?
        </h2>
        <p className="text-white/65 mb-8">Sem cartão. Sem instalação. Em 5 minutos está rodando.</p>
        <Link
          to="/order"
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-ember px-8 py-5 font-bold text-lg shadow-ember hover:scale-[1.02] transition-transform"
        >
          Começar agora 🔥
        </Link>
      </section>

      <footer className="relative z-10 border-t border-white/10 mt-12 py-8 text-center text-xs text-white/40">
        © Top Burguer System • Desenvolvido pelos alunos do CEPI Elberto Alves
      </footer>
    </main>
  );
}
