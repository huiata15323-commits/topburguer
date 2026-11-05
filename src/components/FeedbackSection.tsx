import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = { presentation_rating: number; system_rating: number };

function Stars({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm font-semibold uppercase tracking-widest text-amber-warm">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${label}: ${n} estrelas`} onClick={() => onChange(n)}>
            <Star className={`h-9 w-9 transition ${n <= value ? "fill-amber-warm text-amber-warm" : "text-white/25"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function FeedbackSection() {
  const [pres, setPres] = useState(0);
  const [sys, setSys] = useState(0);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    const { data } = await supabase.from("feedback").select("presentation_rating, system_rating");
    setRows(data ?? []);
  };
  useEffect(() => {
    load();
    if (localStorage.getItem("tb_feedback_sent")) setSent(true);
  }, []);

  const avg = (k: keyof Row) => (rows.length ? (rows.reduce((s, r) => s + r[k], 0) / rows.length).toFixed(1) : "–");

  const submit = async () => {
    if (!pres || !sys) return setErr("Escolha as estrelas das duas avaliações.");
    setBusy(true);
    setErr("");
    const { error } = await supabase.from("feedback").insert({
      presentation_rating: pres,
      system_rating: sys,
      name: name.trim().slice(0, 60) || null,
      comment: comment.trim().slice(0, 300) || null,
    });
    setBusy(false);
    if (error) return setErr("Não foi possível enviar. Tente de novo.");
    localStorage.setItem("tb_feedback_sent", "1");
    setSent(true);
    load();
  };

  return (
    <section id="avaliacao" className="relative z-10 mx-auto max-w-3xl px-6 pb-24 text-center">
      <div className="rounded-[2rem] border border-amber-warm/20 bg-black/40 p-8 md:p-12">
        <h2 className="text-display text-[clamp(2rem,5vw,3.5rem)] leading-none">AVALIE A GENTE</h2>
        <p className="mt-3 text-white/60">O que você achou da apresentação e do sistema Top Burguer?</p>

        <div className="mt-6 flex justify-center gap-10 text-white/80">
          <div><div className="text-3xl font-bold text-amber-warm">{avg("presentation_rating")}</div><div className="text-xs uppercase tracking-widest">Apresentação</div></div>
          <div><div className="text-3xl font-bold text-amber-warm">{avg("system_rating")}</div><div className="text-xs uppercase tracking-widest">Sistema</div></div>
          <div><div className="text-3xl font-bold text-amber-warm">{rows.length}</div><div className="text-xs uppercase tracking-widest">Avaliações</div></div>
        </div>

        {sent ? (
          <p className="mt-8 text-lg font-semibold text-amber-warm">Obrigado pela sua avaliação! 🧡</p>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-6">
            <div className="flex flex-col gap-6 md:flex-row md:gap-12">
              <Stars label="Apresentação" value={pres} onChange={setPres} />
              <Stars label="Sistema" value={sys} onChange={setSys} />
            </div>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Seu nome (opcional)"
              className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40" />
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={300} rows={3} placeholder="Deixe um comentário (opcional)"
              className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40" />
            {err && <p className="text-sm text-red-400">{err}</p>}
            <button onClick={submit} disabled={busy}
              className="rounded-full bg-gradient-ember px-8 py-3 font-bold uppercase tracking-widest text-white disabled:opacity-50">
              {busy ? "Enviando..." : "Enviar avaliação"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
