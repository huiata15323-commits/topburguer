// Painel admin white-label: identidade, cores, tema por segmento, domínio, exportar/importar.
import { useRef, useState } from "react";
import { useBranding, THEME_PRESETS, exportBrandingBundle, importBrandingBundle } from "@/lib/branding";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateDishImage } from "@/lib/ai-image.functions";

const PREVIEW: Record<string, string[]> = {
  classic:   ["#1a0e08", "#e85d3a", "#f4b860"],
  diner:     ["#b3001b", "#f4d35e", "#fff8e7"],
  street:    ["#0a0a14", "#ff2e8a", "#3ad6ff"],
  gourmet:   ["#0f2a1f", "#0d7a5f", "#c9a84c"],
  boteco:    ["#1b3d0e", "#f4d35e", "#7a4a1e"],
  pizzaria:  ["#7a1d10", "#e54b2a", "#5fa14a"],
  acai:      ["#1e0f3a", "#6b1fb0", "#c4f04a"],
  cafeteria: ["#3a2418", "#a3754a", "#e8c89a"],
  sushi:     ["#0c0c0c", "#d62828", "#a3c44a"],
  mexicana:  ["#7a2a10", "#e85d2a", "#4ea84a"],
};

const EMOJI_PICKER = [
  "🔥", "🍔", "🍟", "🌭", "🥪", "🌮", "🌯", "🥙",
  "🍕", "🥩", "🍗", "🥓", "🧀", "🍣", "🍱", "🍛",
  "🥗", "🍜", "🍝", "🍤", "🍇", "🍦", "🍰", "🍩",
  "🥤", "🍺", "🍻", "🍷", "🥂", "🍸", "☕", "🧋",
  "⭐", "💫", "✨", "👑", "🛵", "🏆", "💎", "🎯",
];

// Domínio do projeto para instruções de DNS
const PROJECT_HOST = "topburguer.lovable.app";

export function BrandingAdmin() {
  const { branding, save } = useBranding();
  const [showPicker, setShowPicker] = useState(false);
  const [showDomain, setShowDomain] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);

  // Agrupa temas por segmento para UI mais clara
  const bySegment = THEME_PRESETS.reduce<Record<string, typeof THEME_PRESETS>>((acc, p) => {
    (acc[p.segment] ||= []).push(p);
    return acc;
  }, {});

  function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 500_000) { toast.error("Logo muito grande (máx 500KB)"); return; }
    const r = new FileReader();
    r.onload = () => {
      save({ logoUrl: String(r.result || "") });
      toast.success("Logo aplicado");
    };
    r.readAsDataURL(f);
  }

  function onExport() {
    const data = exportBrandingBundle();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(branding.name || "loja").toLowerCase().replace(/\s+/g, "-")}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Configuração exportada");
  }

  function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(String(r.result));
        const { ok } = importBrandingBundle(data);
        toast.success(`Importado: ${ok} seções. Recarregando…`);
        setTimeout(() => window.location.reload(), 800);
      } catch {
        toast.error("Arquivo inválido");
      }
    };
    r.readAsText(f);
  }

  return (
    <section className="rounded-3xl border-2 border-ember/30 bg-gradient-to-br from-ember/10 via-card to-card p-5 shadow-card-soft">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-black text-lg flex items-center gap-2">
          <span className="text-2xl">🎨</span> Identidade e white-label
        </h2>
      </div>

      {/* Identidade básica */}
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <div className="relative">
          <label className="text-xs text-muted-foreground">Emoji do logo</label>
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="logo" className="w-full h-20 object-contain rounded-xl border-2 border-border bg-background p-1" />
          ) : (
            <button
              type="button"
              onClick={() => setShowPicker((v) => !v)}
              className="w-full text-center text-4xl px-2 py-3 rounded-xl border-2 border-border bg-background hover:border-ember/60 hover:shadow-ember transition-all"
            >
              {branding.emoji}
            </button>
          )}
          <div className="flex gap-1 mt-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg border border-border bg-background/60 hover:border-ember/40"
            >
              📷 Logo
            </button>
            {branding.logoUrl && (
              <button
                type="button"
                onClick={() => { save({ logoUrl: "" }); toast.success("Logo removido"); }}
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg border border-border bg-background/60 hover:border-destructive/40"
              >
                ✕
              </button>
            )}
          </div>
          <input ref={fileInput} type="file" accept="image/*" onChange={onLogoFile} className="hidden" />
          {showPicker && !branding.logoUrl && (
            <div className="absolute z-20 mt-2 left-0 right-0 sm:w-72 rounded-2xl border-2 border-ember/40 bg-card shadow-2xl p-3">
              <div className="grid grid-cols-8 gap-1 max-h-60 overflow-y-auto">
                {EMOJI_PICKER.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => { save({ emoji: e }); setShowPicker(false); toast.success(`Emoji ${e} aplicado`); }}
                    className={`text-2xl p-1.5 rounded-lg hover:bg-ember/20 transition ${branding.emoji === e ? "bg-ember/30 ring-2 ring-ember" : ""}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground">Nome da loja</label>
            <input
              value={branding.name}
              onChange={(e) => save({ name: e.target.value.slice(0, 40) })}
              maxLength={40}
              placeholder="Ex: Top Burguer"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background font-bold"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Slogan (aparece na home)</label>
            <input
              value={branding.slogan}
              onChange={(e) => save({ slogan: e.target.value.slice(0, 80) })}
              maxLength={80}
              placeholder="Ex: Do toque à chapa"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">URL do favicon (opcional)</label>
            <input
              value={branding.faviconUrl}
              onChange={(e) => save({ faviconUrl: e.target.value })}
              placeholder="https://…/favicon.png"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
            />
          </div>
          <div className="rounded-xl border border-border/60 bg-background/40 p-3 flex items-center gap-3">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="" className="w-12 h-12 object-contain rounded-xl bg-gradient-ember p-1" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-ember grid place-items-center text-2xl shadow-ember">
                {branding.emoji}
              </div>
            )}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Pré-visualização</div>
              <div className="font-black text-lg leading-tight">{branding.name}</div>
              {branding.slogan && <div className="text-[11px] text-muted-foreground italic">{branding.slogan}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Cor primária custom */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-muted-foreground">Cor primária custom (sobrescreve tema)</div>
          {branding.brandHue != null && (
            <button
              onClick={() => save({ brandHue: null })}
              className="text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground"
            >
              Limpar
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0} max={360} step={1}
            value={branding.brandHue ?? 25}
            onChange={(e) => save({ brandHue: Number(e.target.value) })}
            className="flex-1 accent-ember"
            style={{ background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }}
          />
          <div
            className="w-12 h-10 rounded-xl border-2 border-border shadow-ember"
            style={{ background: `oklch(0.62 0.22 ${branding.brandHue ?? 25})` }}
          />
          <div className="font-mono text-xs w-10 text-right">{branding.brandHue ?? "—"}°</div>
        </div>
      </div>

      {/* Tema por segmento */}
      <div className="mt-5">
        <div className="text-xs text-muted-foreground mb-2">Tema visual por segmento</div>
        <div className="space-y-3">
          {Object.entries(bySegment).map(([seg, list]) => (
            <div key={seg}>
              <div className="text-[10px] font-black uppercase tracking-widest text-ember/80 mb-1.5">{seg}</div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((p) => {
                  const active = branding.theme === p.key;
                  const palette = PREVIEW[p.key] ?? [];
                  return (
                    <button
                      key={p.key}
                      onClick={() => { save({ theme: p.key }); toast.success(`Tema "${p.label}" aplicado`); }}
                      className={`text-left rounded-2xl border-2 p-3 transition-all ${active ? "border-ember shadow-ember bg-ember/5" : "border-border hover:border-ember/40"}`}
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
          ))}
        </div>
      </div>

      {/* Domínio próprio & remoção de marca Lovable */}
      <div className="mt-5 rounded-2xl border-2 border-border bg-background/40 p-4">
        <button
          onClick={() => setShowDomain((v) => !v)}
          className="w-full flex items-center justify-between font-black text-sm"
        >
          <span className="flex items-center gap-2">🌐 Domínio próprio & remoção de marca</span>
          <span className="text-xs">{showDomain ? "▲" : "▼"}</span>
        </button>
        {showDomain && (
          <div className="mt-3 space-y-3 text-sm">
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-border hover:border-ember/40">
              <input
                type="checkbox"
                checked={branding.whiteLabel}
                onChange={(e) => save({ whiteLabel: e.target.checked })}
                className="mt-0.5 accent-ember w-4 h-4"
              />
              <div>
                <div className="font-bold">Modo white-label total</div>
                <div className="text-xs text-muted-foreground">
                  Remove menções a "Top Burguer" no recibo, PDF e título da aba — usa só o nome da sua loja.
                </div>
              </div>
            </label>

            <div className="rounded-xl border border-border p-3 bg-background">
              <div className="font-bold text-sm mb-2">Conectar domínio próprio (ex: minhaloja.com.br)</div>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal pl-4">
                <li>Vá em <b>Configurações do projeto → Domínios</b> e clique em <b>Conectar Domínio</b> (ou compre um direto pelo botão "Comprar novo domínio").</li>
                <li>No seu registrador (Registro.br, GoDaddy etc), aponte um <b>A Record</b> de <code>@</code> e <code>www</code> para <code>185.158.133.1</code>.</li>
                <li>Adicione o <b>TXT</b> <code>_lovable</code> com o valor fornecido na tela.</li>
                <li>Aguarde propagação (até 72h). SSL é automático.</li>
              </ol>
              <div className="mt-2 text-[11px] text-muted-foreground">
                Atual: <code className="text-ember">{PROJECT_HOST}</code>
              </div>
            </div>

            <div className="rounded-xl border border-border p-3 bg-background">
              <div className="font-bold text-sm mb-1">Esconder badge "Edit with Lovable"</div>
              <div className="text-xs text-muted-foreground">
                Já configurado no projeto. Se ainda aparecer, vá em Configurações → Publicar → desativar badge (requer plano Pro).
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Exportar / Importar */}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={onExport}
          className="flex-1 min-w-[140px] px-4 py-2.5 rounded-xl border-2 border-ember/40 bg-ember/10 hover:bg-ember/20 font-bold text-sm flex items-center justify-center gap-2"
        >
          ⬇ Exportar configuração
        </button>
        <button
          onClick={() => importInput.current?.click()}
          className="flex-1 min-w-[140px] px-4 py-2.5 rounded-xl border-2 border-border hover:border-ember/40 font-bold text-sm flex items-center justify-center gap-2"
        >
          ⬆ Importar configuração
        </button>
        <input ref={importInput} type="file" accept="application/json" onChange={onImport} className="hidden" />
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        Inclui: identidade, tema, cardápio, promoções, despesas e idioma. Útil pra revender ou replicar entre lojas.
      </p>
    </section>
  );
}
