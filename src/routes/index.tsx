import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fast Order — Top Burguer" },
      { name: "description", content: "Sistema inteligente de pedidos da Top Burguer: cliente e cozinha conectados em tempo real." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1a0a0a] via-[#2a0d0d] to-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <header className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-yellow-300">
            🔥 Top Burguer
          </div>
          <h1 className="mt-6 font-black text-5xl md:text-7xl tracking-tight">
            Fast <span className="text-yellow-400">Order</span>
          </h1>
          <p className="mt-4 text-lg md:text-xl text-white/70 max-w-2xl mx-auto">
            Do pedido à cozinha em segundos. Sistema inteligente de gestão para hamburguerias que valorizam velocidade e qualidade.
          </p>
        </header>

        <section className="mt-16 grid gap-6 md:grid-cols-2">
          <Link
            to="/order"
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-red-600 to-red-800 p-8 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-red-500/30"
          >
            <div className="text-6xl">🍔</div>
            <h2 className="mt-6 text-3xl font-bold">Fazer Pedido</h2>
            <p className="mt-2 text-white/80">Interface do cliente — monte seu lanche e envie para a cozinha.</p>
            <span className="mt-6 inline-flex items-center gap-2 font-semibold group-hover:gap-3 transition-all">
              Começar pedido →
            </span>
          </Link>

          <Link
            to="/kitchen"
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-yellow-500 to-orange-600 p-8 text-black transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-yellow-500/30"
          >
            <div className="text-6xl">📺</div>
            <h2 className="mt-6 text-3xl font-bold">Painel da Cozinha</h2>
            <p className="mt-2 text-black/80">Kitchen Display — otimizado para a TV. Visualize e gerencie pedidos em tempo real.</p>
            <span className="mt-6 inline-flex items-center gap-2 font-semibold group-hover:gap-3 transition-all">
              Abrir painel →
            </span>
          </Link>
        </section>

        <section className="mt-20 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          <h3 className="font-bold text-white mb-3">Como usar</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Abra <code className="text-yellow-300">/order</code> no tablet/celular do cliente.</li>
            <li>Abra <code className="text-yellow-300">/kitchen</code> em outra aba ou na TV da cozinha.</li>
            <li>Pedidos confirmados aparecem instantaneamente no painel (sincronização entre abas via BroadcastChannel).</li>
          </ol>
        </section>
      </div>
    </main>
  );
}
