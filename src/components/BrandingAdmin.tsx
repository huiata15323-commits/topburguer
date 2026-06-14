// Painel do admin: nome da hamburgueria, emoji do logo e tema visual.
import { useState } from "react";
import { useBranding, THEME_PRESETS } from "@/lib/branding";
import { toast } from "sonner";

const PREVIEW: Record<string, string[]> = {
  classic: ["#1a0e08", "#e85d3a", "#f4b860"],
  diner:   ["#b3001b", "#f4d35e", "#fff8e7"],
  street:  ["#0a0a14", "#ff2e8a", "#3ad6ff"],
  gourmet: ["#0f2a1f", "#0d7a5f", "#c9a84c"],
  boteco:  ["#1b3d0e", "#f4d35e", "#7a4a1e"],
};

const EMOJI_PICKER = [
  "🔥", "🍔", "🍟", "🌭", "🥪", "🌮", "🌯", "🥙",
  "🍕", "🥩", "🍗", "🥓", "🧀", "🥚", "🥞", "🧇",
  "🍳", "🥗", "🍜", "🍝", "🍤", "🍣", "🍱", "🍛",
  "🥤", "🍺", "🍻", "🍷", "🥂", "🍸", "☕", "🧋",
  "🍰", "🍩", "🍪", "🍦", "🍫", "🍿", "🥨", "🥐",
  "⭐", "💫", "✨", "👑", "🛵", "🏆", "💎", "🎯",
];

export function BrandingAdmin() {
  const { branding, save } = useBranding();
  const [showPicker, setShowPicker] = useState(false);

  return (
    <section className="rounded-3xl border-2 border-ember/30 bg-gradient-to-br from-ember/10 via-card to-card p-5 shadow-card-soft">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-black text-lg flex items-center gap-2">
          <span className="text-2xl">🎨</span> Identidade e tema
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <div className="relative">
          <label className="text-xs text-muted-foreground">Emoji do logo</label>
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className="w-full text-center text-4xl px-2 py-3 rounded-xl border-2 border-border bg-background hover:border-ember/60 hover:shadow-ember transition-all"
            title="Clique para escolher um emoji"
          >
            {branding.emoji}
          </button>
          <input
            value={branding.emoji}
            onChange={(e) => save({ emoji: e.target.value.slice(0, 4) })}
            placeholder="Ou digite"
            className="mt-2 w-full text-center text-sm px-2 py-1.5 rounded-lg border border-border bg-background/60"
          />
          {showPicker && (
            <div className="absolute z-20 mt-2 left-0 right-0 sm:w-72 rounded-2xl border-2 border-ember/40 bg-card shadow-2xl p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">Escolha um emoji</div>
              <div className="grid grid-cols-8 gap-1 max-h-60 overflow-y-auto">
                {EMOJI_PICKER.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      save({ emoji: e });
                      setShowPicker(false);
                      toast.success(`Emoji ${e} aplicado`);
                    }}
                    className={`text-2xl p-1.5 rounded-lg hover:bg-ember/20 transition ${
                      branding.emoji === e ? "bg-ember/30 ring-2 ring-ember" : ""
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Nome da hamburgueria</label>
          <input
            value={branding.name}
            onChange={(e) => save({ name: e.target.value.slice(0, 40) })}
            maxLength={40}
            placeholder="Ex: Top Burguer"
            className="w-full px-3 py-3 rounded-xl border border-border bg-background font-bold"
          />
          <div className="mt-3 rounded-xl border border-border/60 bg-background/40 p-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-ember grid place-items-center text-2xl shadow-ember">
              {branding.emoji}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Pré-visualização</div>
              <div className="font-black text-lg">{branding.name}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="text-xs text-muted-foreground mb-2">Tema visual</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {THEME_PRESETS.map((p) => {
            const active = branding.theme === p.key;
            const palette = PREVIEW[p.key] ?? [];
            return (
              <button
                key={p.key}
                onClick={() => {
                  save({ theme: p.key });
                  toast.success(`Tema "${p.label}" aplicado`);
                }}
                className={`text-left rounded-2xl border-2 p-3 transition-all ${
                  active
                    ? "border-ember shadow-ember bg-ember/5"
                    : "border-border hover:border-ember/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-sm flex items-center gap-1.5">
                    <span className="text-lg">{p.emoji}</span> {p.label}
                  </span>
                  {active && <span className="text-[10px] font-black text-ember">✓ ATIVO</span>}
                </div>
                <div className="flex gap-1 mb-1.5">
                  {palette.map((c) => (
                    <div key={c} className="w-6 h-6 rounded-md border border-white/10" style={{ background: c }} />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">{p.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
