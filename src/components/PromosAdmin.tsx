// Painel de administração de cupons e happy hour.
import { useState } from "react";
import { toast } from "sonner";
import { usePromos } from "@/lib/promos";
import { useServerFn } from "@tanstack/react-start";
import { generateDishImage } from "@/lib/ai-image.functions";

export function PromosAdmin() {
  const { cfg, addCoupon, removeCoupon, setHappyHour, isHappyHourNow } = usePromos();
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(percent, 10);
    if (!code.trim()) return toast.error("Informe o código");
    if (!Number.isFinite(p) || p <= 0 || p > 100) return toast.error("Desconto 1–100%");
    addCoupon({ code: code.trim().toUpperCase(), percentOff: p });
    toast.success(`Cupom ${code.trim().toUpperCase()} salvo`);
    setCode("");
  };

  const hh = cfg.happyHour;

  return (
    <section className="rounded-3xl border-2 border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/10 via-card to-card p-5 shadow-card-soft space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-black text-lg flex items-center gap-2">
            <span className="text-2xl">🎟️</span> Cupons & Happy Hour
          </h2>
          <p className="text-xs text-muted-foreground">
            Promoções aplicadas automaticamente no carrinho.
          </p>
        </div>
        {isHappyHourNow && (
          <span className="px-3 py-1 rounded-full bg-fuchsia-600 text-white text-xs font-black animate-pulse">
            🔥 HAPPY HOUR AGORA
          </span>
        )}
      </div>

      {/* Cupons */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Cupons ativos
        </div>
        <form onSubmit={submit} className="flex gap-2 mb-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20))}
            placeholder="CÓDIGO"
            className="flex-1 px-3 py-2 rounded-xl border border-border bg-background font-mono uppercase text-sm"
          />
          <input
            value={percent}
            onChange={(e) => setPercent(e.target.value.replace(/\D/g, "").slice(0, 3))}
            inputMode="numeric"
            className="w-20 px-3 py-2 rounded-xl border border-border bg-background text-center"
          />
          <span className="grid place-items-center text-sm font-bold text-muted-foreground">%</span>
          <button className="px-4 py-2 rounded-xl bg-gradient-ember text-ember-foreground font-bold text-sm shadow-ember">
            + Adicionar
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {cfg.coupons.length === 0 && (
            <span className="text-xs text-muted-foreground italic">Nenhum cupom cadastrado.</span>
          )}
          {cfg.coupons.map((c) => (
            <span
              key={c.code}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-fuchsia-500/15 border border-fuchsia-400/30 text-fuchsia-700 dark:text-fuchsia-300 text-xs font-bold"
            >
              <span className="font-mono">{c.code}</span>
              <span className="opacity-70">−{c.percentOff}%</span>
              <button
                onClick={() => removeCoupon(c.code)}
                className="text-fuchsia-600 hover:text-red-500"
                title="Remover"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Happy hour */}
      <div className="rounded-2xl border border-border bg-background/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-bold flex items-center gap-2">
              <span className="text-lg">⏰</span> Happy Hour automático
            </div>
            <div className="text-[11px] text-muted-foreground">
              Desconto aplicado nos pedidos durante a janela configurada.
            </div>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={hh.enabled}
              onChange={(e) => setHappyHour({ ...hh, enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="font-semibold">{hh.enabled ? "Ativo" : "Inativo"}</span>
          </label>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <label className="text-muted-foreground">Início (h)</label>
            <input
              type="number"
              min={0}
              max={23}
              value={hh.startHour}
              onChange={(e) =>
                setHappyHour({ ...hh, startHour: Math.max(0, Math.min(23, parseInt(e.target.value || "0", 10))) })
              }
              className="w-full mt-1 px-2 py-1.5 rounded-lg border border-border bg-background text-center"
            />
          </div>
          <div>
            <label className="text-muted-foreground">Fim (h)</label>
            <input
              type="number"
              min={0}
              max={23}
              value={hh.endHour}
              onChange={(e) =>
                setHappyHour({ ...hh, endHour: Math.max(0, Math.min(23, parseInt(e.target.value || "0", 10))) })
              }
              className="w-full mt-1 px-2 py-1.5 rounded-lg border border-border bg-background text-center"
            />
          </div>
          <div>
            <label className="text-muted-foreground">Desconto (%)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={hh.percentOff}
              onChange={(e) =>
                setHappyHour({ ...hh, percentOff: Math.max(1, Math.min(100, parseInt(e.target.value || "0", 10))) })
              }
              className="w-full mt-1 px-2 py-1.5 rounded-lg border border-border bg-background text-center"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
