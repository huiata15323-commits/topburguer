import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MENU, type MenuItem } from "@/lib/menu";
import { useOrders, type OrderItem } from "@/lib/orders-store";

export const Route = createFileRoute("/order")({
  head: () => ({
    meta: [
      { title: "Pedido — Fast Order" },
      { name: "description", content: "Monte seu pedido na Top Burguer." },
    ],
  }),
  component: OrderPage,
});

const CATEGORIES: { key: MenuItem["category"]; label: string }[] = [
  { key: "burger", label: "🍔 Hambúrgueres" },
  { key: "side", label: "🍟 Acompanhamentos" },
  { key: "drink", label: "🥤 Bebidas" },
];

function OrderPage() {
  const { addOrder } = useOrders();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const items: OrderItem[] = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, q]) => q > 0)
        .map(([id, q]) => {
          const m = MENU.find((x) => x.id === id)!;
          return { menuId: m.id, name: m.name, emoji: m.emoji, price: m.price, quantity: q };
        }),
    [cart]
  );

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const inc = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const dec = (id: string) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) - 1) }));

  const submit = () => {
    // Validação simples client-side
    if (!customer.trim()) return toast.error("Informe seu nome");
    if (customer.length > 50) return toast.error("Nome muito longo");
    if (items.length === 0) return toast.error("Adicione ao menos um item");
    if (notes.length > 300) return toast.error("Observações muito longas");

    setSubmitting(true);
    const order = addOrder({
      customer: customer.trim().slice(0, 50),
      items,
      notes: notes.trim().slice(0, 300) || undefined,
      total,
    });
    toast.success(`Pedido #${order.number} enviado para a cozinha! 🔥`);
    setCart({});
    setCustomer("");
    setNotes("");
    setTimeout(() => setSubmitting(false), 400);
  };

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-red-700 to-red-600 text-white shadow-lg">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-2xl">🍔</Link>
            <div>
              <h1 className="font-black text-xl leading-none">Top Burguer</h1>
              <p className="text-xs text-yellow-200">Faça seu pedido</p>
            </div>
          </div>
          <Link to="/kitchen" className="text-xs underline opacity-80 hover:opacity-100">
            Painel cozinha
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-8">
          {CATEGORIES.map((cat) => (
            <div key={cat.key}>
              <h2 className="text-lg font-bold mb-3 text-neutral-800">{cat.label}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {MENU.filter((m) => m.category === cat.key).map((m) => {
                  const q = cart[m.id] || 0;
                  return (
                    <div
                      key={m.id}
                      className="group rounded-2xl bg-white p-4 border border-neutral-200 hover:border-red-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-4xl">{m.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-neutral-900">{m.name}</h3>
                          {m.description && (
                            <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{m.description}</p>
                          )}
                          <p className="text-red-600 font-bold mt-1">R$ {m.price.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-2">
                        {q > 0 && (
                          <>
                            <button
                              onClick={() => dec(m.id)}
                              className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 font-bold"
                              aria-label="Remover"
                            >
                              −
                            </button>
                            <span className="w-6 text-center font-bold">{q}</span>
                          </>
                        )}
                        <button
                          onClick={() => inc(m.id)}
                          className="w-8 h-8 rounded-full bg-red-600 text-white hover:bg-red-700 font-bold transition-transform active:scale-90"
                          aria-label="Adicionar"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
          <div className="rounded-2xl bg-white border border-neutral-200 p-5 shadow-sm">
            <h3 className="font-bold text-lg mb-3">Seu pedido</h3>

            <label className="block text-xs font-medium text-neutral-600 mb-1">Nome</label>
            <input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              maxLength={50}
              placeholder="Como te chamamos?"
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:border-red-500 focus:outline-none mb-3"
            />

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {items.length === 0 && (
                <p className="text-sm text-neutral-400 italic py-4 text-center">Carrinho vazio</p>
              )}
              {items.map((i) => (
                <div key={i.menuId} className="flex items-center justify-between text-sm animate-in fade-in slide-in-from-right-2">
                  <span>
                    <span className="font-semibold">{i.quantity}×</span> {i.emoji} {i.name}
                  </span>
                  <span className="font-medium">R$ {(i.price * i.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <label className="block text-xs font-medium text-neutral-600 mt-4 mb-1">Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="Ex: sem cebola, ponto da carne…"
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:border-red-500 focus:outline-none text-sm"
            />

            <div className="mt-4 pt-4 border-t border-neutral-200 flex items-center justify-between">
              <span className="text-neutral-600">Total</span>
              <span className="text-2xl font-black text-red-600">R$ {total.toFixed(2)}</span>
            </div>

            <button
              onClick={submit}
              disabled={submitting || items.length === 0}
              className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {submitting ? "Enviando…" : "🔥 Enviar para a cozinha"}
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
