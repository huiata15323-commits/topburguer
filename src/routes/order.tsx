import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { type MenuItem } from "@/lib/menu";
import { useMenu } from "@/lib/menu-store";
import { useOrders, estimateWaitMinutes, type OrderItem } from "@/lib/orders-store";
import { formatPhoneBR, normalizePhoneBR } from "@/lib/whatsapp";
import { PaymentModal } from "@/components/PaymentModal";
import { usePromos, findCoupon, type Coupon } from "@/lib/promos";
import { useLoyaltyStatus, REWARD_EVERY, REWARD_PERCENT } from "@/lib/loyalty";
import { useLang } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { VoiceOrderButton } from "@/components/VoiceOrderButton";
import { useComboSuggestions } from "@/lib/combos";
import { useBranding } from "@/lib/branding";

const search = z.object({
  mesa: z.coerce.number().int().positive().max(999).optional().catch(undefined),
});

export const Route = createFileRoute("/order")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Pedido — Top Burguer" },
      { name: "description", content: "Monte seu pedido na Top Burguer." },
    ],
  }),
  component: OrderPage,
});

const CATEGORIES: { key: MenuItem["category"]; tKey: string; emoji: string }[] = [
  { key: "burger", tKey: "menu.burger", emoji: "🍔" },
  { key: "side",   tKey: "menu.side",   emoji: "🍟" },
  { key: "drink",  tKey: "menu.drink",  emoji: "🥤" },
];

type CartEntry = { qty: number; notes?: string };

function OrderPage() {
  const { mesa } = useSearch({ from: "/order" });
  const { addOrder, orders } = useOrders();
  const waitMin = useMemo(() => estimateWaitMinutes(orders), [orders]);
  const { items: menu, isLoading: menuLoading, error: menuError, decrementStock } = useMenu();
  const navigate = useNavigate();
  const { t } = useLang();
  const { branding } = useBranding();
  const { cfg: promos, isHappyHourNow } = usePromos();
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeCat, setActiveCat] = useState<MenuItem["category"]>("burger");
  const [payOpen, setPayOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  const items: OrderItem[] = useMemo(() => {
    const out: OrderItem[] = [];
    for (const [id, e] of Object.entries(cart)) {
      if (!e || e.qty <= 0) continue;
      const m = menu.find((x) => x.id === id);
      if (!m) continue;
      out.push({ menuId: m.id, name: m.name, emoji: m.emoji, image: m.image, price: m.price, quantity: e.qty, notes: e.notes });
    }
    return out;
  }, [cart, menu]);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  // Fidelidade
  const loyalty = useLoyaltyStatus(phone);

  // Desconto efetivo: pega o maior entre cupom aplicado, happy hour ativo, fidelidade
  const discountSources: { label: string; percent: number }[] = useMemo(() => {
    const arr: { label: string; percent: number }[] = [];
    if (appliedCoupon) arr.push({ label: `🎟 ${appliedCoupon.code}`, percent: appliedCoupon.percentOff });
    if (isHappyHourNow) arr.push({ label: t("order.happyHour"), percent: promos.happyHour.percentOff });
    if (loyalty.eligible) arr.push({ label: `🏆 ${t("order.loyalty")}`, percent: REWARD_PERCENT });
    return arr;
  }, [appliedCoupon, isHappyHourNow, promos.happyHour.percentOff, loyalty.eligible, t]);

  const bestDiscount = discountSources.reduce(
    (best, cur) => (cur.percent > best.percent ? cur : best),
    { label: "", percent: 0 }
  );
  const discountAmount = Math.round(((subtotal * bestDiscount.percent) / 100) * 100) / 100;
  const total = Math.max(0, subtotal - discountAmount);

  // Sugestões de combo baseadas no histórico
  const cartIds = useMemo(() => items.map((i) => i.menuId), [items]);
  const combos = useComboSuggestions(cartIds, menu, 3);

  // Adiciona vários itens de uma vez (usado pelo VoiceOrderButton)
  const addMany = (toAdd: { menuId: string; quantity: number }[]) => {
    setCart((c) => {
      const next = { ...c };
      for (const a of toAdd) {
        next[a.menuId] = { ...next[a.menuId], qty: (next[a.menuId]?.qty || 0) + a.quantity };
      }
      return next;
    });
  };


  const inc = (id: string) => setCart((c) => ({ ...c, [id]: { ...c[id], qty: (c[id]?.qty || 0) + 1 } }));
  const dec = (id: string) =>
    setCart((c) => ({ ...c, [id]: { ...c[id], qty: Math.max(0, (c[id]?.qty || 0) - 1) } }));
  const setItemNotes = (id: string, v: string) =>
    setCart((c) => ({ ...c, [id]: { ...c[id], qty: c[id]?.qty || 0, notes: v.slice(0, 80) } }));

  const submit = () => {
    // Nome só é obrigatório quando o cliente NÃO está numa mesa
    if (!mesa && !customer.trim()) return toast.error("Informe seu nome");
    if (customer.length > 50) return toast.error("Nome muito longo");
    if (items.length === 0) return toast.error("Adicione ao menos um item");
    if (notes.length > 300) return toast.error("Observações muito longas");
    if (phone.trim() && !normalizePhoneBR(phone))
      return toast.error("Telefone inválido (use DDD + número)");
    setPayOpen(true);
  };

  const confirmPaymentAndSubmit = async () => {
    setPayOpen(false);
    setSubmitting(true);
    try {
      const normalized = phone.trim() ? normalizePhoneBR(phone) ?? undefined : undefined;
      const fallbackName = mesa ? `Mesa ${mesa}` : "Cliente";
      const order = await addOrder({
        customer: (customer.trim() || fallbackName).slice(0, 50),
        phone: normalized,
        tableNumber: mesa,
        items,
        notes: notes.trim().slice(0, 300) || undefined,
        total,
      });
      // Atualiza estoque (itens sem controle são ignorados internamente)
      decrementStock(items.map((i) => ({ menuId: i.menuId, quantity: i.quantity })));
      toast.success(`Pedido #${order.number} enviado! 🔥`);
      // 🎉 Confetti de batata frita / brasa
      try {
        const confetti = (await import("canvas-confetti")).default;
        const fire = (particleRatio: number, opts: import("canvas-confetti").Options) =>
          confetti({
            origin: { y: 0.7 },
            scalar: 1.2,
            ticks: 200,
            ...opts,
            particleCount: Math.floor(220 * particleRatio),
          });
        fire(0.25, { spread: 26, startVelocity: 55, colors: ["#ff6b1a", "#ffb800", "#ff3b00"] });
        fire(0.2, { spread: 60, colors: ["#ffd34d", "#ff8a3d", "#ffffff"] });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.9, colors: ["#ff6b1a", "#ffb800"] });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.4, colors: ["#ffd34d"] });
        fire(0.1, { spread: 120, startVelocity: 45, colors: ["#ff3b00", "#ffffff"] });
      } catch {}

      setCart({});
      setCustomer("");
      setPhone("");
      setNotes("");
      navigate({ to: "/status", search: { n: order.number } });
    } catch {
      toast.error("Falha ao enviar pedido. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background pb-32 lg:pb-0">
      <header className="sticky top-0 z-20 bg-gradient-night text-white shadow-lg">
        <div className="mx-auto max-w-6xl px-3 sm:px-4 py-3 sm:py-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:gap-4">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-ember grid place-items-center font-black shadow-ember">{branding.emoji}</div>
            <div className="min-w-0">
              <div className="font-black leading-none truncate">{branding.name}</div>
              <div className="text-[10px] text-amber-warm uppercase tracking-widest truncate">
                {mesa ? `Mesa ${mesa} · Faça seu pedido` : "Faça seu pedido"}
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2 text-xs shrink-0 flex-wrap justify-end">
            {mesa && (
              <Link
                to="/mesa"
                search={{ n: mesa }}
                className="px-2.5 py-1 rounded-full bg-amber-warm text-charcoal font-black text-[10px] sm:text-[11px] hover:scale-105 transition"
                title="Ver comanda completa da mesa"
              >
                🪑 {t("order.table")} {mesa}<span className="hidden sm:inline"> · comanda</span>
              </Link>
            )}
            <LanguageToggle compact />
            <Link to="/status" className="text-white/70 hover:text-amber-warm hidden md:inline">Status</Link>
          </div>
        </div>
        {/* Category tabs */}
        <div className="mx-auto max-w-6xl px-3 sm:px-4 pb-3 flex gap-2 overflow-x-auto">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => {
                setActiveCat(c.key);
                document.getElementById(`cat-${c.key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                activeCat === c.key
                  ? "bg-amber-warm text-charcoal shadow-tv-glow"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {c.emoji} {t(c.tKey)}
            </button>
          ))}
        </div>
      </header>

      {menuLoading && (
        <section className="mx-auto max-w-6xl px-3 sm:px-4 py-6" aria-live="polite">
          <div className="rounded-3xl border border-amber-warm/30 bg-card p-5 shadow-card-soft">
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 shrink-0 rounded-2xl bg-gradient-ember grid place-items-center shadow-ember">🍔</span>
              <div>
                <h2 className="font-black text-lg">Carregando cardápio atualizado</h2>
                <p className="text-sm text-muted-foreground">Aguarde só um instante.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-3xl border border-border bg-background overflow-hidden">
                  <div className="aspect-[4/3] bg-muted animate-pulse" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 w-3/4 rounded-full bg-muted animate-pulse" />
                    <div className="h-3 w-full rounded-full bg-muted animate-pulse" />
                    <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {!menuLoading && menuError && menu.length === 0 && (
        <section className="mx-auto max-w-6xl px-3 sm:px-4 py-6">
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm">
            <div className="font-black text-red-600 dark:text-red-300">Cardápio indisponível no momento</div>
            <p className="mt-1 text-muted-foreground">Recarregue a página para tentar novamente.</p>
          </div>
        </section>
      )}

      {!menuLoading && menu.length > 0 && (
      <>
      {/* Estimativa de tempo de espera */}
      <div className="mx-auto max-w-6xl px-3 sm:px-4 pt-4 space-y-3">
        <div className="rounded-2xl border border-amber-warm/30 bg-gradient-to-r from-amber-warm/10 via-ember/5 to-transparent px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">⏱️</span>
          <div className="flex-1 text-sm">
            <span className="font-bold">{t("order.wait")}: </span>
            <span className="text-ember font-black">~20 min</span>
          </div>
        </div>
        {isHappyHourNow && (
          <div className="rounded-2xl border-2 border-fuchsia-400/50 bg-gradient-to-r from-fuchsia-500/20 via-purple-500/10 to-transparent px-4 py-3 flex items-center gap-3 animate-pulse">
            <span className="text-2xl">🎉</span>
            <div className="flex-1 text-sm">
              <span className="font-black text-fuchsia-600 dark:text-fuchsia-300">
                {t("order.happyHour")}
              </span>
              <span className="ml-2 text-muted-foreground">
                −{promos.happyHour.percentOff}% automático no total
              </span>
            </div>
          </div>
        )}

        {/* Pedir por voz */}
        <div className="rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/5 via-card to-card p-3">
          <VoiceOrderButton menu={menu} onAdd={addMany} />
        </div>

        {/* Combos sugeridos baseados no histórico */}
        {combos.length > 0 && (
          <div className="rounded-2xl border border-amber-warm/30 bg-amber-warm/5 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-amber-warm mb-2 flex items-center gap-1">
              ✨ Quem pediu isso também levou
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {combos.map((c) => (
                <button
                  key={c.menuId}
                  onClick={() => addMany([{ menuId: c.menuId, quantity: 1 }])}
                  className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border hover:border-ember/40 hover:shadow-card-soft transition-all text-sm font-semibold"
                >
                  <span className="text-lg">{c.emoji}</span>
                  <span>{c.name}</span>
                  <span className="ml-1 text-[10px] font-black text-ember">+</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>


      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">

        <section className="space-y-10 min-w-0">
          {CATEGORIES.map((cat) => (
            <div key={cat.key} id={`cat-${cat.key}`} className="scroll-mt-32">
              <h2 className="text-lg sm:text-xl font-black mb-4 flex items-center gap-2">
                <span className="text-2xl">{cat.emoji}</span> {t(cat.tKey)}
              </h2>
              <div className="grid gap-3 grid-cols-2 xl:grid-cols-3">
                {menu.filter((m) => m.category === cat.key).map((m, i) => {
                  const entry = cart[m.id];
                  const q = entry?.qty || 0;
                  const soldOut = m.soldOut;
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      className={`group rounded-3xl bg-card border transition-all overflow-hidden flex flex-col ${
                        soldOut
                          ? "border-border opacity-60"
                          : q > 0
                          ? "border-ember shadow-ember"
                          : "border-border hover:border-ember/40 hover:shadow-card-soft"
                      }`}
                    >
                      <div className="aspect-[4/3] bg-muted overflow-hidden relative">
                        <img
                          src={m.image}
                          alt={m.name}
                          loading="lazy"
                          width={512}
                          height={384}
                          className={`w-full h-full object-cover transition-transform duration-500 ${
                            soldOut ? "grayscale" : "group-hover:scale-105"
                          }`}
                        />
                        {soldOut && (
                          <div className="absolute inset-0 bg-black/55 grid place-items-center">
                            <span className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-black uppercase tracking-widest">
                              {t("menu.soldout")}
                            </span>
                          </div>
                        )}
                        {!soldOut && q > 0 && (
                          <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-ember text-ember-foreground grid place-items-center font-black shadow-ember"
                          >
                            {q}
                          </motion.div>
                        )}
                      </div>
                      <div className="p-3 sm:p-4 flex-1 flex flex-col">
                        <h3 className="font-bold text-card-foreground text-sm sm:text-base leading-tight">{m.name}</h3>
                        {(m.badges?.length || m.prepMinutes) && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {m.badges?.map((b) => (
                              <span key={b} className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-ember/10 text-ember border border-ember/30">
                                {b}
                              </span>
                            ))}
                            {m.prepMinutes && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                ⏱ {m.prepMinutes}min
                              </span>
                            )}
                          </div>
                        )}
                        {m.description && (
                          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">{m.description}</p>
                        )}
                        <div className="mt-3 flex items-end justify-between gap-2 flex-wrap">
                          <p className="text-ember font-black text-base sm:text-lg">R$ {m.price.toFixed(2)}</p>
                          <div className="flex items-center gap-1.5">
                            <AnimatePresence>
                              {q > 0 && !soldOut && (
                                <motion.button
                                  key="dec"
                                  initial={{ opacity: 0, scale: 0.5 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.5 }}
                                  onClick={() => dec(m.id)}
                                  className="w-9 h-9 rounded-full bg-muted hover:bg-secondary font-bold text-lg"
                                  aria-label="Remover"
                                >
                                  −
                                </motion.button>
                              )}
                            </AnimatePresence>
                            {q > 0 && !soldOut && <span className="w-6 text-center font-bold">{q}</span>}
                            <button
                              onClick={() => !soldOut && inc(m.id)}
                              disabled={soldOut}
                              className="w-9 h-9 rounded-full bg-gradient-ember text-ember-foreground hover:scale-110 font-bold transition-transform active:scale-90 shadow-ember disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                              aria-label="Adicionar"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        {q > 0 && (
                          <motion.input
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            value={entry?.notes || ""}
                            onChange={(e) => setItemNotes(m.id, e.target.value)}
                            maxLength={80}
                            placeholder="Obs: sem cebola, ponto…"
                            className="mt-3 w-full px-3 py-1.5 text-xs rounded-lg border border-border focus:border-ember focus:outline-none bg-background"
                          />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* Sidebar cart (desktop) */}
        <aside className="hidden lg:block lg:sticky lg:top-32 lg:self-start">
          <CartCard
            customer={customer} setCustomer={setCustomer}
            phone={phone} setPhone={setPhone}
            notes={notes} setNotes={setNotes}
            items={items}
            subtotal={subtotal}
            total={total}
            discountAmount={discountAmount}
            discountLabel={bestDiscount.label}
            submitting={submitting} onSubmit={submit}
            couponInput={couponInput} setCouponInput={setCouponInput}
            appliedCoupon={appliedCoupon}
            onApplyCoupon={() => {
              const c = findCoupon(promos.coupons, couponInput);
              if (!c) { setAppliedCoupon(null); toast.error(t("order.couponInvalid")); return; }
              setAppliedCoupon(c);
              toast.success(`${t("order.couponOk")} (−${c.percentOff}%)`);
            }}
            onClearCoupon={() => { setAppliedCoupon(null); setCouponInput(""); }}
            loyalty={loyalty}
            t={t}
          />
        </aside>
      </div>

      {/* Floating cart bar (mobile) */}
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.div
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            className="lg:hidden fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-30 max-w-2xl sm:mx-auto"
          >
            <details className="rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
              <summary className="list-none cursor-pointer p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl bg-gradient-ember grid place-items-center text-ember-foreground font-black shadow-ember">
                    🛒
                    <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-warm text-charcoal text-xs grid place-items-center font-black">
                      {itemCount}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("order.total")}</div>
                    <div className="font-black text-ember text-lg">R$ {total.toFixed(2)}</div>
                  </div>
                </div>
                <span className="px-4 py-2 rounded-xl bg-gradient-ember text-ember-foreground font-bold text-sm">Ver pedido</span>
              </summary>
              <div className="p-4 pt-0 max-h-[60vh] overflow-y-auto">
                <CartCard
                  customer={customer} setCustomer={setCustomer}
                  phone={phone} setPhone={setPhone}
                  notes={notes} setNotes={setNotes}
                  items={items}
                  subtotal={subtotal}
                  total={total}
                  discountAmount={discountAmount}
                  discountLabel={bestDiscount.label}
                  submitting={submitting} onSubmit={submit}
                  couponInput={couponInput} setCouponInput={setCouponInput}
                  appliedCoupon={appliedCoupon}
                  onApplyCoupon={() => {
                    const c = findCoupon(promos.coupons, couponInput);
                    if (!c) { setAppliedCoupon(null); toast.error(t("order.couponInvalid")); return; }
                    setAppliedCoupon(c);
                    toast.success(`${t("order.couponOk")} (−${c.percentOff}%)`);
                  }}
                  onClearCoupon={() => { setAppliedCoupon(null); setCouponInput(""); }}
                  loyalty={loyalty}
                  t={t}
                  embedded
                />
              </div>
            </details>
          </motion.div>
        )}
      </AnimatePresence>
      <PaymentModal
        open={payOpen}
        amount={total}
        customer={customer || "Cliente"}
        onClose={() => setPayOpen(false)}
        onConfirmed={confirmPaymentAndSubmit}
      />
      </>
      )}
    </main>
  );
}


type LoyaltyInfo = { count: number; toNext: number; eligible: boolean; e164: string | null };

function CartCard({
  customer, setCustomer, phone, setPhone, notes, setNotes,
  items, subtotal, total, discountAmount, discountLabel,
  submitting, onSubmit, embedded,
  couponInput, setCouponInput, appliedCoupon, onApplyCoupon, onClearCoupon,
  loyalty, t,
}: {
  customer: string; setCustomer: (s: string) => void;
  phone: string; setPhone: (s: string) => void;
  notes: string; setNotes: (s: string) => void;
  items: OrderItem[];
  subtotal: number; total: number;
  discountAmount: number; discountLabel: string;
  submitting: boolean; onSubmit: () => void;
  couponInput: string; setCouponInput: (s: string) => void;
  appliedCoupon: Coupon | null;
  onApplyCoupon: () => void; onClearCoupon: () => void;
  loyalty: LoyaltyInfo;
  t: (key: string) => string;
  embedded?: boolean;
}) {
  return (
    <div className={embedded ? "" : "rounded-3xl bg-card border border-border p-5 shadow-card-soft"}>
      {!embedded && <h3 className="font-black text-lg mb-4">{t("order.your")}</h3>}

      <label className="block text-xs font-medium text-muted-foreground mb-1">{t("order.name")}</label>
      <input
        value={customer}
        onChange={(e) => setCustomer(e.target.value)}
        maxLength={50}
        placeholder={t("order.namePh")}
        className="w-full px-3 py-2.5 rounded-xl border border-border focus:border-ember focus:outline-none mb-3 bg-background"
      />

      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {t("order.phone")} <span className="text-muted-foreground/60">{t("order.phoneHelp")}</span>
      </label>
      <input
        value={phone}
        onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
        inputMode="tel"
        maxLength={16}
        placeholder="(11) 91234-5678"
        className="w-full px-3 py-2.5 rounded-xl border border-border focus:border-ember focus:outline-none mb-3 bg-background"
      />

      {/* Fidelidade */}
      {loyalty.e164 && (
        <div className={`mb-3 rounded-xl p-3 text-xs border ${
          loyalty.eligible
            ? "border-emerald-400/40 bg-emerald-500/10"
            : "border-amber-warm/30 bg-amber-warm/5"
        }`}>
          <div className="flex items-center gap-2 font-bold">
            <span>🏆</span>
            <span>{t("order.loyalty")}: {loyalty.count}/{REWARD_EVERY}</span>
          </div>
          <div className="mt-1 text-muted-foreground">
            {loyalty.eligible
              ? t("order.loyaltyReward")
              : `${loyalty.toNext} ${t("order.loyaltyProgress")}`}
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-background overflow-hidden">
            <div
              className="h-full bg-gradient-ember transition-all"
              style={{ width: `${((loyalty.count % REWARD_EVERY) / REWARD_EVERY) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground italic py-4 text-center">{t("order.empty")}</p>
        )}
        <AnimatePresence initial={false}>
          {items.map((i) => (
            <motion.div
              key={i.menuId}
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-2 text-sm"
            >
              <img src={i.image} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="truncate"><span className="font-bold text-ember">{i.quantity}×</span> {i.name}</div>
                {i.notes && <div className="text-[10px] text-amber-warm truncate">📝 {i.notes}</div>}
              </div>
              <span className="font-semibold">R$ {(i.price * i.quantity).toFixed(2)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Cupom */}
      <div className="mt-4">
        <label className="block text-xs font-medium text-muted-foreground mb-1">{t("order.coupon")}</label>
        {appliedCoupon ? (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-fuchsia-500/15 border border-fuchsia-400/40">
            <span className="font-bold text-sm font-mono">🎟 {appliedCoupon.code} <span className="opacity-70">−{appliedCoupon.percentOff}%</span></span>
            <button onClick={onClearCoupon} className="text-xs text-fuchsia-600 hover:text-red-500 font-bold">×</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20))}
              placeholder={t("order.couponPh")}
              className="flex-1 px-3 py-2 rounded-xl border border-border bg-background font-mono uppercase text-sm"
            />
            <button
              type="button"
              onClick={onApplyCoupon}
              className="px-3 py-2 rounded-xl bg-muted hover:bg-secondary font-bold text-xs"
            >
              {t("order.couponApply")}
            </button>
          </div>
        )}
      </div>

      <label className="block text-xs font-medium text-muted-foreground mt-4 mb-1">{t("order.notes")}</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={300}
        rows={2}
        className="w-full px-3 py-2 rounded-xl border border-border focus:border-ember focus:outline-none text-sm bg-background"
      />

      <div className="mt-4 pt-4 border-t border-border space-y-1">
        {discountAmount > 0 && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("order.subtotal")}</span>
              <span className="font-semibold tabular-nums">R$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-emerald-600 dark:text-emerald-400">
              <span className="font-bold">{t("order.discount")} {discountLabel}</span>
              <span className="font-bold tabular-nums">−R$ {discountAmount.toFixed(2)}</span>
            </div>
          </>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-muted-foreground">{t("order.total")}</span>
          <span className="text-2xl font-black text-ember">R$ {total.toFixed(2)}</span>
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={submitting || items.length === 0}
        className="mt-4 w-full py-3.5 rounded-2xl bg-gradient-ember text-ember-foreground font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-ember"
      >
        {submitting ? t("order.sending") : t("order.send")}
      </button>
    </div>
  );
}

