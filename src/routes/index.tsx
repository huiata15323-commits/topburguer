import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import QRCode from "react-qr-code";
import topBacon from "@/assets/menu/top-bacon.jpg";
import topCheddar from "@/assets/menu/top-cheddar.jpg";
import topClassic from "@/assets/menu/top-classic.jpg";
import turma2a from "@/assets/turma-2a.jpg.asset.json";
import turma2b from "@/assets/turma-2b.jpg.asset.json";
import { useBranding } from "@/lib/branding";

const DRIVE_ACERVO_URL = "https://drive.google.com/drive/folders/1Wv8JwaqaLX1Awhp_HPAC_hjb1Pz1YBPu?usp=drive_link";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Top Burguer" },
      { name: "description", content: "Sistema inteligente de pedidos da Top Burguer: cliente, status e cozinha conectados em tempo real." },
    ],
  }),
  component: Landing,
});

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } }),
};

function Landing() {
  const { branding } = useBranding();
  return (
    <main className="min-h-screen bg-gradient-night text-white overflow-hidden relative">
      {/* Decorative grain layer */}
      <div className="absolute inset-0 bg-grain pointer-events-none" />

      {/* Meteoros — faíscas caindo no hero */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="meteor"
            style={{
              left: `${(i * 7.3) % 100}%`,
              animationDelay: `${(i * 0.7) % 8}s`,
              animationDuration: `${4 + ((i * 1.3) % 6)}s`,
            }}
          />
        ))}
      </div>


      {/* Top bar */}
      <nav className="relative z-10 mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-ember grid place-items-center font-black text-lg shadow-ember">{branding.emoji}</div>
          <span className="font-black tracking-tight">{branding.name}</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link to="/sobre" className="text-amber-warm/90 hover:text-amber-warm font-bold transition">💼 Para sua hamburgueria</Link>
          <Link to="/admin" className="hidden sm:inline text-white/60 hover:text-amber-warm transition">⚙️ Admin</Link>
          <Link to="/painel" className="hidden sm:inline text-white/60 hover:text-amber-warm transition">📺 Painel</Link>
          <Link to="/dashboard" className="hidden sm:inline text-white/60 hover:text-amber-warm transition">📊 Dashboard</Link>
          <Link to="/finance" className="hidden sm:inline text-white/60 hover:text-amber-warm transition">💰 Financeiro</Link>
          <div className="hidden md:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live" />
            <span className="text-white/60 uppercase tracking-widest">Sistema online</span>
          </div>
        </div>
      </nav>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-10 pb-20 md:pt-20 md:pb-28">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <motion.div
              initial="hidden" animate="show" variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-amber-warm/30 bg-amber-warm/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-warm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-warm animate-live" />
              Pedidos em tempo real
            </motion.div>

            <motion.h1
              initial="hidden" animate="show" variants={fadeUp} custom={1}
              className="mt-6 text-display text-balance text-[clamp(3.5rem,9vw,7.5rem)]"
            >
              <span className="block">DO TOQUE</span>
              <span className="block">
                <span className="text-outline">À</span>{" "}
                <span className="bg-gradient-to-br from-amber-warm via-gold to-ember bg-clip-text text-transparent">CHAPA</span>
              </span>
              <span className="block text-[0.55em] font-medium tracking-tight text-white/70 mt-2">em segundos.</span>
            </motion.h1>


            <motion.p
              initial="hidden" animate="show" variants={fadeUp} custom={2}
              className="mt-6 text-lg md:text-xl text-white/70 max-w-xl text-balance"
            >
              O Top Burguer conecta o cliente, o painel de status e a cozinha
              numa única experiência. Pediu, fritou, entregou.
            </motion.p>

            <motion.div
              initial="hidden" animate="show" variants={fadeUp} custom={3}
              className="mt-10 flex flex-wrap gap-3"
            >
              <Link
                to="/order"
                className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-ember px-6 py-4 font-bold shadow-ember hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                Fazer pedido <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                to="/status"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-4 font-semibold hover:bg-white/10 transition"
              >
                Acompanhar pedido
              </Link>
              <Link
                to="/kitchen"
                className="inline-flex items-center gap-2 rounded-2xl border border-amber-warm/30 bg-amber-warm/10 px-6 py-4 font-semibold text-amber-warm hover:bg-amber-warm/20 transition"
              >
                📺 Painel cozinha
              </Link>
            </motion.div>

            <motion.div
              initial="hidden" animate="show" variants={fadeUp} custom={4}
              className="mt-12 grid grid-cols-3 gap-6 max-w-md"
            >
              {[
                { k: "<3s", v: "Sincronização" },
                { k: "10+", v: "Itens no cardápio" },
                { k: "TV", v: "Display cozinha" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="text-3xl font-black text-amber-warm">{s.k}</div>
                  <div className="text-[11px] uppercase tracking-widest text-white/50">{s.v}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Burger composition */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative aspect-square max-w-md mx-auto"
          >
            <div className="absolute -inset-10 bg-gradient-ember blur-3xl opacity-30 rounded-full" />
            <motion.img
              src={topBacon}
              alt="Top Bacon"
              className="absolute inset-0 w-full h-full object-cover rounded-[2.5rem] shadow-2xl border border-white/10"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -bottom-4 -left-4 w-28 h-28 rounded-2xl overflow-hidden border-4 border-background shadow-xl"
              animate={{ rotate: [-3, 3, -3] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <img src={topClassic} alt="" className="w-full h-full object-cover" />
            </motion.div>
            <motion.div
              className="absolute -top-4 -right-4 w-24 h-24 rounded-2xl overflow-hidden border-4 border-background shadow-xl"
              animate={{ rotate: [4, -4, 4] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <img src={topCheddar} alt="" className="w-full h-full object-cover" />
            </motion.div>

            {/* Live order ticker */}
            <motion.div
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="absolute -bottom-6 right-2 sm:right-6 bg-white/95 text-charcoal rounded-2xl shadow-2xl px-4 py-3 backdrop-blur"
            >
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-ember font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-ember animate-live" /> Pedido #42
              </div>
              <div className="text-sm font-bold mt-0.5">2× Top Bacon + Batata</div>
              <div className="text-[10px] text-muted-foreground">Pronto em ~6 min</div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Three pillars */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { tag: "01 · Cliente", title: "Faz o pedido", desc: "Cardápio visual, carrinho com observações por item e envio instantâneo.", to: "/order", emoji: "📱" },
            { tag: "02 · Painel", title: "Acompanha em tempo real", desc: "Status do pedido visível no balcão e no celular do cliente.", to: "/status", emoji: "⏱️" },
            { tag: "03 · Cozinha", title: "Prepara e entrega", desc: "TV otimizada com fila, timer de urgência e som de notificação.", to: "/kitchen", emoji: "🔥" },
          ].map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              onMouseMove={(e) => {
                const el = e.currentTarget;
                const r = el.getBoundingClientRect();
                el.style.setProperty("--mx", `${e.clientX - r.left}px`);
                el.style.setProperty("--my", `${e.clientY - r.top}px`);
              }}
              className="card-tilt rounded-3xl"
            >
              <Link
                to={c.to}
                className="group block h-full rounded-3xl border border-white/10 bg-white/[0.03] p-6 hover:bg-white/[0.06] hover:border-gold/50 transition-colors"
              >
                <div className="text-5xl drop-shadow-[0_0_20px_rgba(255,180,80,0.4)]">{c.emoji}</div>
                <div className="mt-4 text-[10px] uppercase tracking-[0.3em] text-gold font-black">{c.tag}</div>
                <h3 className="mt-2 text-2xl font-black tracking-tight">{c.title}</h3>
                <p className="mt-2 text-sm text-white/60">{c.desc}</p>
                <div className="mt-5 text-sm font-bold text-amber-warm group-hover:translate-x-1 transition-transform inline-block">
                  Abrir →
                </div>
              </Link>
            </motion.div>

          ))}
        </div>
      </section>

      {/* Sobre / Conhecendo os autores */}
      <section id="sobre" className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 items-start">
          {/* QR Code card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl border border-amber-warm/30 bg-gradient-to-br from-amber-warm/10 via-white/[0.03] to-ember/10 p-8 shadow-ember"
          >
            <div className="text-[10px] uppercase tracking-widest text-amber-warm font-bold">Acervo da turma</div>
            <h3 className="mt-2 text-2xl font-black">Nossa jornada na nuvem</h3>
            <p className="mt-2 text-sm text-white/60">
              Aponte a câmera e acesse a pasta com todas as aulas, projetos, momentos e visitas técnicas do Curso Técnico em Desenvolvimento de Sistemas — 2025/2026.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="rounded-2xl bg-cream p-3 shadow-lg">
                <QRCode value={DRIVE_ACERVO_URL} size={160} level="M" />
              </div>
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div className="text-xs uppercase tracking-widest text-amber-warm font-bold">2º Ano A & B · SENAI</div>
                <div className="text-sm text-white/70">Aulas, projetos, visitas técnicas e os momentos que marcaram a turma — tudo num só lugar.</div>
                <a
                  href={DRIVE_ACERVO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-ember px-5 py-2.5 text-sm font-bold shadow-ember hover:scale-105 transition-transform"
                >
                  ☁️ Abrir acervo no Drive
                </a>
              </div>
            </div>
          </motion.div>

          {/* Conhecendo os autores */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-8"
          >
            <div className="text-[10px] uppercase tracking-widest text-amber-warm font-bold">Sobre o projeto</div>
            <h3 className="mt-2 text-2xl md:text-3xl font-black">Conhecendo os autores</h3>
            <p className="mt-3 text-white/70 leading-relaxed">
              Somos alunos do <strong className="text-amber-warm">Curso Técnico em Desenvolvimento de Sistemas — SENAI</strong>, do <strong>CEPI Elberto Alves</strong>. Mesmo sem a infraestrutura adequada, mesmo sem computadores em sala, nunca nos faltou o que mais importa: <em className="text-white/90">vontade de aprender</em>.
            </p>
            <p className="mt-3 text-white/70 leading-relaxed">
              Junto com o professor <strong className="text-amber-warm">Huiatã Ribeiro</strong>, formamos uma equipe que, aula após aula, foi virando muito mais do que uma turma — virou uma <strong>identidade de família</strong>. Do ano passado até agora, foram momentos intensos de aprendizagem para a vida: erros, acertos, risadas, descobertas e a certeza de que, juntos, a gente vai longe. 💛
            </p>
            <p className="mt-3 text-white/70 leading-relaxed">
              Este projeto é parte desse caminho — código, sonho e gratidão impressos em cada tela. As turmas <strong>2º Ano A e B</strong> assinam, com orgulho, este projeto.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {[
                { src: turma2b.url, label: "2º Ano A — Técnico" },
                { src: turma2a.url, label: "2º Ano B — Técnico" },
              ].map((t) => (
                <figure key={t.label} className="group relative overflow-hidden rounded-2xl border border-white/10">
                  <img src={t.src} alt={`Turma ${t.label}`} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-700" />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 text-xs font-bold text-white">
                    {t.label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Momentos — emocional e marcante */}
      <section id="momentos" className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-[2.5rem] border border-amber-warm/20 bg-gradient-to-br from-ember/20 via-black/40 to-amber-warm/10 p-10 md:p-14"
        >
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-ember blur-3xl opacity-30 rounded-full pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-amber-warm/20 blur-3xl rounded-full pointer-events-none" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-warm/40 bg-amber-warm/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-warm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-warm animate-live" />
              Momentos
            </div>
            <h2 className="mt-5 text-display text-balance text-[clamp(2.5rem,6vw,5rem)] leading-[0.95]">
              <span className="block">CADA AULA,</span>
              <span className="block bg-gradient-to-br from-amber-warm via-gold to-ember bg-clip-text text-transparent">
                UMA MEMÓRIA.
              </span>
            </h2>
            <p className="mt-6 max-w-2xl text-lg text-white/75 leading-relaxed">
              Sem laboratório, sem computador na sala — mas com o que ninguém pode tirar da gente:
              <strong className="text-amber-warm"> vontade, união e código pulsando no coração.</strong>
              Aqui estão os momentos que viraram história da nossa turma.
            </p>

            <div className="mt-10 grid md:grid-cols-3 gap-5">
              {[
                {
                  emoji: "🎓",
                  tag: "Sala de aula",
                  title: "Onde tudo começou",
                  desc: "Quadro, caderno e o brilho nos olhos. Foi assim que aprendemos a programar antes de tocar num teclado.",
                },
                {
                  emoji: "🚀",
                  tag: "Visitas técnicas",
                  title: "O mundo lá fora",
                  desc: "Saímos da escola, entramos em empresas, vimos de perto o futuro que estamos construindo.",
                },
                {
                  emoji: "💛",
                  tag: "Família 2A & 2B",
                  title: "Mais que uma turma",
                  desc: "Risos, choros, abraços e madrugadas de código. A gente virou família — e família a gente não esquece.",
                },
              ].map((m, i) => (
                <motion.div
                  key={m.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.5 }}
                  className="group rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6 hover:border-amber-warm/40 hover:bg-black/50 transition"
                >
                  <div className="text-4xl drop-shadow-[0_0_20px_rgba(255,180,80,0.4)]">{m.emoji}</div>
                  <div className="mt-4 text-[10px] uppercase tracking-[0.3em] text-gold font-black">{m.tag}</div>
                  <h3 className="mt-2 text-xl font-black tracking-tight">{m.title}</h3>
                  <p className="mt-2 text-sm text-white/65 leading-relaxed">{m.desc}</p>
                </motion.div>
              ))}
            </div>

            <motion.blockquote
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mt-12 border-l-4 border-amber-warm pl-6 max-w-3xl"
            >
              <p className="text-xl md:text-2xl font-bold italic text-white/90 leading-snug">
                "Não tínhamos os melhores recursos. Tínhamos algo maior: <span className="text-amber-warm">uns aos outros</span>."
              </p>
              <footer className="mt-3 text-xs uppercase tracking-widest text-white/50">
                — Turmas 2A & 2B · Curso Técnico em Desenvolvimento de Sistemas · 2025–2026
              </footer>
            </motion.blockquote>

            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href={DRIVE_ACERVO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-ember px-6 py-4 font-bold shadow-ember hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                ☁️ Ver todos os momentos no Drive
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </a>
            </div>
          </div>
        </motion.div>
      </section>
        <div>Top Burguer — feito pra hamburgueria que voa.</div>
        <div className="mt-1 text-white/25">Criado pelos alunos do Curso Técnico em Desenvolvimento de Sistemas — SENAI, CEPI Elberto Alves · 2º Ano A e B</div>
      </footer>
    </main>
  );
}
