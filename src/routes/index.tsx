import fryingPanQ from "@/assets/frying-pan-q.png";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import QRCode from "react-qr-code";
import topBacon from "@/assets/menu/top-bacon.jpg";
import topCheddar from "@/assets/menu/top-cheddar.jpg";
import topClassic from "@/assets/menu/top-classic.jpg";
import turmaFull from "@/assets/turma-2a-new.jpg.asset.json";
import visitaTecnica from "@/assets/turma-2b-new.jpg.asset.json";
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
          <Link
            to="/acesso"
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-warm px-3 py-1.5 font-bold text-zinc-900 shadow-ember hover:brightness-110 transition"
          >
            <Lock className="h-3 w-3" /> Acesso equipe
          </Link>
          <div className="hidden md:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live" />
            <span className="text-white/60 uppercase tracking-widest">Sistema online</span>
          </div>
        </div>
      </nav>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-10 pb-20 md:pt-20 md:pb-28">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div className="text-center">
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
              <span className="block">
                DO TO
                <img
                  src={fryingPanQ}
                  alt="Q"
                  className="inline-block align-middle h-[0.85em] w-[0.85em] mx-[0.02em] -mt-[0.08em]"
                />
                UE
              </span>
              <span className="block">
                <span className="text-outline">À</span>{" "}
                <span className="bg-gradient-to-br from-amber-warm via-gold to-ember bg-clip-text text-transparent">CHAPA</span>
              </span>
              <span className="block text-[0.55em] font-medium tracking-tight text-white/70 mt-2">em segundos.</span>
            </motion.h1>


            <motion.p
              initial="hidden" animate="show" variants={fadeUp} custom={2}
              className="mt-6 text-lg md:text-xl text-white/70 max-w-xl text-balance mx-auto"
            >
              O Top Burguer conecta o cliente, o painel de status e a cozinha
              numa única experiência. Pediu, fritou, entregou.
            </motion.p>

            <motion.div
              initial="hidden" animate="show" variants={fadeUp} custom={3}
              className="mt-10 flex flex-wrap gap-3 justify-center"
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
                to="/painel"
                className="inline-flex items-center gap-2 rounded-2xl border border-amber-warm/30 bg-amber-warm/10 px-6 py-4 font-semibold text-amber-warm hover:bg-amber-warm/20 transition"
              >
                📺 Painel ao vivo
              </Link>
            </motion.div>

            <motion.div
              initial="hidden" animate="show" variants={fadeUp} custom={4}
              className="mt-12 grid grid-cols-3 gap-6 max-w-md mx-auto text-center"
            >
              {[
                { k: "<3s", v: "Sincronização" },
                { k: "5+", v: "Itens no cardápio" },
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
            className="relative aspect-square max-w-md mx-auto mt-16 lg:mt-0 order-last lg:order-none"
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
              className="absolute -bottom-4 right-2 sm:right-6 bg-white/95 text-charcoal rounded-xl shadow-2xl px-2.5 py-1.5 backdrop-blur max-w-[150px]"
            >
              <div className="flex items-center gap-1 text-[8px] uppercase tracking-widest text-ember font-bold">
                <span className="w-1 h-1 rounded-full bg-ember animate-live" /> Pedido #42
              </div>
              <div className="text-[11px] font-bold mt-0.5 leading-tight whitespace-nowrap">2× Top Bacon + Batata</div>
              <div className="text-[9px] text-muted-foreground">Pronto em ~6 min</div>
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
            { tag: "03 · Cliente", title: "Retira ou recebe", desc: "Quando o pedido fica pronto, o cliente acompanha pelo status do próprio pedido.", to: "/status", emoji: "🔥" },
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
            <div className="mt-6 grid grid-cols-1 gap-4">
              {[
                { src: turmaFull.url, label: "Turma 2º Ano A — Técnico em Desenvolvimento de Sistemas" },
                { src: visitaTecnica.url, label: "Turma 2º Ano B — Técnico em Desenvolvimento de Sistemas" },
              ].map((t) => (
                <figure key={t.label} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                  <img
                    src={t.src}
                    alt={t.label}
                    className="w-full h-auto object-contain group-hover:scale-[1.02] transition-transform duration-700"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 text-xs font-bold text-white">
                    {t.label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Momentos — memorial aberto para depoimentos */}
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
              Memorial · Momentos
            </div>
            <h2 className="mt-5 text-display text-balance text-[clamp(2.5rem,6vw,5rem)] leading-[0.95]">
              <span className="block">CADA AULA,</span>
              <span className="block bg-gradient-to-br from-amber-warm via-gold to-ember bg-clip-text text-transparent">
                UMA MEMÓRIA.
              </span>
            </h2>
            <p className="mt-6 max-w-2xl text-lg text-white/75 leading-relaxed">
              Este é o nosso <strong className="text-amber-warm">memorial vivo</strong> — um espaço reservado para guardar
              os depoimentos dos alunos do 2º Ano A & B. Em breve, cada voz da turma terá seu lugar aqui.
            </p>

            {/* Cards de depoimento */}
            <div className="mt-10 grid md:grid-cols-3 gap-5">
              {[
                {
                  quote: "Fazer o curso de Desenvolvimento de Sistemas tem sido uma experiência muito boa. Mesmo sem toda a estrutura que o curso precisa, a gente consegue aprender bastante. O professor Huiatã Ribeiro sempre prepara as aulas e ajuda a gente a desenvolver novas habilidades. Nesse tempo de curso, aprendi muitas coisas que vão me ajudar no futuro e na minha entrada no mercado de trabalho.",
                  name: "Nivia Vitória",
                  info: '2º Ano "A" TDS · SENAI',
                  real: true,
                },
                {
                  quote: "Durante o curso aprendi várias coisas que não fazia ideia que conseguia, com o auxílio do professor Huiatã Ribeiro aprendemos não só a lidar com os desafios dentro de sala de aula, mais também com os desafios da vida, vou sempre levar comigo a certeza de que fazer o curso foi a minha melhor escolha.",
                  name: "Izabelly Ramos",
                  info: '2º Ano "A" TDS · SENAI',
                  real: true,
                },
                {
                  quote: "Ter a oportunidade de fazer o curso de Desenvolvimento de Sistemas juntamente ao professor Huiatã Ribeiro não foi somente um aprendizado escolar, mas são lições que eu vou levar para vida, ele não é apenas um professor para nossa turma, mas também é um pai. Ele ensina, educa, pega no pé sempre que necessário e é nosso amigo que sempre estará ali caso a gente precise de apoio ou qualquer ajuda. Ter a oportunidade de ter um professor igual a ele foi a melhor coisa que me aconteceu, sou muito grata por tudo.",
                  name: "Isadora Gomes Lima",
                  info: '2º Ano "A" TDS · SENAI',
                  real: true,
                },
                {
                  quote: "Fazer parte do curso de Desenvolvimento de Sistemas está sendo uma experiência muito especial para mim. Além dos conhecimentos que estou aprendendo, também estou aprendendo lições que vou levar para a vida. O professor Huiatã não ensina apenas a matéria, ele se preocupa com cada aluno, incentiva, orienta e sempre procura o melhor para todos nós. Quando precisamos de ajuda, ele está disposto a ouvir e apoiar, e quando é necessário, também nos corrige para que possamos crescer e evoluir. Sua dedicação, paciência e carinho com a turma faz toda a diferença. Sou muito grata pela oportunidade de aprender com um professor tão especial e por tudo o que esse curso está me ensinando.",
                  name: "Thárcila da Silva Dias",
                  info: '2º Ano "A" TDS · SENAI',
                  real: true,
                },
                {
                  quote: "quando comecei o curso Técnico em Desenvolvimento de Sistemas, não imaginava o quanto essa experiência iria contribuir para o meu crescimento. Ao longo dessa jornada, aprendi muito sobre tecnologia, programação e trabalho em equipe, desenvolvendo habilidades que levarei para a vida toda. Além das aulas, tivemos experiências incríveis, como as visitas técnicas aos data centers, que nos permitiram conhecer na prática como funciona a área de tecnologia e ampliar nossa visão sobre o mercado de trabalho. Também gostaria de agradecer ao professor Huiatá Ribeiro, que sempre nos incentivou a buscar mais conhecimento, enfrentar desafios e acreditar no nosso potencial. Sua dedicação fez toda a diferença na nossa formação. Hoje tenho a certeza de que escolher esse curso foi uma decisão muito importante para o meu futuro, e sou grata por todas as oportunidades, aprendizados e experiências que vivi durante essa trajetória.",
                  name: "Ana Beatriz dos Santos Filgueiras",
                  info: '2º Ano "B" TDS · SENAI',
                  real: true,
                },
                {
                  quote: "quando comecei o curso Técnico em Desenvolvimento de Sistemas, não imaginava o quanto essa experiência iria contribuir para o meu crescimento. Ao longo dessa jornada, aprendi muito sobre tecnologia, programação e trabalho em equipe, desenvolvendo habilidades que levarei para a vida toda. Além das aulas, tivemos experiências incríveis, como as visitas técnicas aos data centers, que nos permitiram conhecer na prática como funciona a área de tecnologia e ampliar nossa visão sobre o mercado de trabalho. Também gostaria de agradecer ao professor Huiatá Ribeiro, que sempre nos incentivou a buscar mais conhecimento, enfrentar desafios e acreditar no nosso potencial. Sua dedicação fez toda a diferença na nossa formação. Hoje tenho a certeza de que escolher esse curso foi uma decisão muito importante para o meu futuro, e sou grata por todas as oportunidades, aprendizados e experiências que vivi durante essa trajetória.",
                  name: "Samuel Vitor Alves Silva",
                  info: '2º Ano "B" TDS · SENAI',
                  real: true,
                },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.08, duration: 0.5 }}
                  className={`group rounded-2xl border p-6 transition min-h-[200px] flex flex-col ${
                    item.real
                      ? "border-amber-warm/30 bg-black/50 backdrop-blur hover:border-amber-warm/60 hover:bg-black/60"
                      : "border-dashed border-white/15 bg-black/30 backdrop-blur hover:border-amber-warm/40 hover:bg-black/50"
                  }`}
                >
                  <div className={`text-3xl ${item.real ? "text-amber-warm" : "text-amber-warm/60"}`}>“ ”</div>
                  <div className="mt-3 text-[10px] uppercase tracking-[0.3em] text-gold/70 font-black">
                    {item.real ? "Depoimento" : `Depoimento #${String((item as any).num).padStart(2, "0")}`}
                  </div>
                  <p className={`mt-3 text-sm leading-relaxed flex-1 ${item.real ? "text-white/80" : "text-white/40 italic"}`}>
                    {item.quote}
                  </p>
                  <div className="mt-4 pt-3 border-t border-white/10 text-xs text-white/50">
                    — {item.name} · {item.info}
                  </div>
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
                "Cada aula virou memória. Cada memória, parte de quem a gente é hoje."
              </p>
              <footer className="mt-3 text-xs uppercase tracking-widest text-white/50">
                — Turmas 2A & 2B · Curso Técnico em Desenvolvimento de Sistemas · 2025–2026
              </footer>
            </motion.blockquote>
          </div>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-6 text-center text-xs text-white/40">
        <div>Top Burguer — feito pra hamburgueria que voa.</div>
        <div className="mt-1 text-white/25">Criado pelos alunos do Curso Técnico em Desenvolvimento de Sistemas — SENAI, CEPI Elberto Alves · 2º Ano A e B</div>
        <div className="mt-3">
          <Link to="/acesso" className="text-white/40 hover:text-amber-warm underline-offset-4 hover:underline transition">
            Acesso restrito (equipe)
          </Link>
        </div>
      </footer>
    </main>
  );
}
