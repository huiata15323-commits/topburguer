// Avaliações recebidas pela equipe: nome, pontuação e comentário de cada visita.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Star, RefreshCw, MessageSquareQuote, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type FeedbackRow = {
  id: string;
  name: string | null;
  presentation_rating: number;
  system_rating: number;
  comment: string | null;
  created_at: string;
};

type Filter = "all" | "comment" | "low";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "comment", label: "Com comentário" },
  { key: "low", label: "Precisam de atenção" },
];

function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex gap-0.5" aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${cls} ${n <= value ? "fill-amber-warm text-amber-warm" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function Bar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full bg-gradient-ember transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function when(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FeedbackAdmin() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("feedback")
      .select("id, name, presentation_rating, system_rating, comment, created_at")
      .order("created_at", { ascending: false });
    if (!error) setRows((data as FeedbackRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    // Novas avaliações aparecem sozinhas + reconciliação periódica.
    const channel = supabase
      .channel("feedback-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, () => void load())
      .subscribe();
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void load();
    }, 25000);
    return () => {
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const stats = useMemo(() => {
    const n = rows.length;
    const avg = (k: "presentation_rating" | "system_rating") =>
      n ? rows.reduce((s, r) => s + (r[k] ?? 0), 0) / n : 0;
    const dist = (k: "presentation_rating" | "system_rating") =>
      [5, 4, 3, 2, 1].map((star) => rows.filter((r) => (r[k] ?? 0) === star).length);
    return {
      n,
      pres: avg("presentation_rating"),
      sys: avg("system_rating"),
      presDist: dist("presentation_rating"),
      sysDist: dist("system_rating"),
      withComment: rows.filter((r) => r.comment && r.comment.trim()).length,
      low: rows.filter((r) => r.presentation_rating <= 2 || r.system_rating <= 2).length,
    };
  }, [rows]);

  const shown = useMemo(() => {
    if (filter === "comment") return rows.filter((r) => r.comment && r.comment.trim());
    if (filter === "low") return rows.filter((r) => r.presentation_rating <= 2 || r.system_rating <= 2);
    return rows;
  }, [rows, filter]);

  return (
    <section className="rounded-3xl border-2 border-amber-warm/30 bg-gradient-to-br from-amber-warm/10 via-card to-card p-5 shadow-card-soft">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <h2 className="font-black text-lg flex items-center gap-2">
            <span className="text-2xl">⭐</span> Avaliações recebidas
          </h2>
          <p className="text-xs text-muted-foreground">
            Nome, pontuação e comentário de quem avaliou a apresentação e o sistema.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> ao vivo
          </span>
          <button
            onClick={() => void load()}
            className="p-2 rounded-xl border border-border bg-background hover:border-amber-warm/50 transition"
            title="Atualizar agora"
            aria-label="Atualizar avaliações"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Médias */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-background/70 border border-border p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Apresentação</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black tabular-nums">{stats.n ? stats.pres.toFixed(1) : "–"}</span>
            <span className="text-xs text-muted-foreground">de 5</span>
          </div>
          <div className="mt-2"><Bar value={stats.pres} /></div>
        </div>
        <div className="rounded-2xl bg-background/70 border border-border p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Sistema</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black tabular-nums">{stats.n ? stats.sys.toFixed(1) : "–"}</span>
            <span className="text-xs text-muted-foreground">de 5</span>
          </div>
          <div className="mt-2"><Bar value={stats.sys} /></div>
        </div>
        <div className="rounded-2xl bg-background/70 border border-border p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Avaliações</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black tabular-nums">{stats.n}</span>
            <span className="text-xs text-muted-foreground">no total</span>
          </div>
          <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageSquareQuote className="h-3.5 w-3.5" /> {stats.withComment}
            </span>
            <span className="flex items-center gap-1 text-red-500">
              <ThumbsDown className="h-3.5 w-3.5" /> {stats.low}
            </span>
          </div>
        </div>
      </div>

      {/* Distribuição 5→1 */}
      {stats.n > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          {([["Apresentação", stats.presDist], ["Sistema", stats.sysDist]] as const).map(([label, dist]) => (
            <div key={label} className="rounded-2xl bg-background/70 border border-border p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                {label} · quantas notas
              </div>
              <div className="space-y-1">
                {dist.map((count, i) => {
                  const star = 5 - i;
                  const pct = stats.n ? (count / stats.n) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-[11px]">
                      <span className="w-3 text-right font-bold tabular-nums">{star}</span>
                      <Star className="h-3 w-3 fill-amber-warm text-amber-warm" />
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-amber-warm" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-5 text-right tabular-nums text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5 mt-5 mb-3">
        {FILTERS.map((f) => {
          const on = filter === f.key;
          const count =
            f.key === "comment" ? stats.withComment : f.key === "low" ? stats.low : stats.n;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition ${
                on
                  ? "bg-gradient-ember text-ember-foreground border-transparent shadow-sm"
                  : "bg-background border-border text-muted-foreground hover:border-amber-warm/50"
              }`}
            >
              {f.label} <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {loading && stats.n === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-background/60 p-4 animate-pulse">
              <div className="h-3 w-1/3 rounded-full bg-muted" />
              <div className="h-3 w-2/3 rounded-full bg-muted mt-2" />
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground italic border border-dashed border-border rounded-2xl">
          {stats.n === 0
            ? "Nenhuma avaliação recebida ainda. Ela aparece aqui assim que alguém enviar na página inicial."
            : "Nenhuma avaliação neste filtro."}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => {
            const needsCare = r.presentation_rating <= 2 || r.system_rating <= 2;
            return (
              <article
                key={r.id}
                className={`rounded-2xl border bg-background/70 p-4 transition ${
                  needsCare ? "border-red-500/40" : "border-border hover:border-amber-warm/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-bold truncate">
                      {r.name && r.name.trim() ? r.name.trim() : "Anônimo"}
                    </div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">{when(r.created_at)}</div>
                  </div>
                  {needsCare && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 text-[10px] font-black uppercase tracking-wider">
                      atenção
                    </span>
                  )}
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground w-24 shrink-0">
                      Apresentação
                    </span>
                    <Stars value={r.presentation_rating} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground w-24 shrink-0">
                      Sistema
                    </span>
                    <Stars value={r.system_rating} />
                  </div>
                </div>

                {r.comment && r.comment.trim() && (
                  <p className="mt-3 text-sm text-foreground/90 italic border-l-2 border-amber-warm/50 pl-3">
                    “{r.comment.trim()}”
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
