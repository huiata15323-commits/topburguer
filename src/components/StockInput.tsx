import { useEffect, useRef, useState } from "react";

interface Props {
  value: number | undefined;
  onCommit: (next: number | undefined) => void | Promise<void>;
  max?: number;
}

/**
 * Input de estoque com estado LOCAL: não dispara update a cada tecla
 * (evita o realtime sobrescrever o valor enquanto o admin digita).
 * Salva no blur, no Enter, ou após 800ms sem digitação.
 */
export function StockInput({ value, onCommit, max = 99999 }: Props) {
  const [draft, setDraft] = useState<string>(typeof value === "number" ? String(value) : "");
  const focused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincroniza com o servidor APENAS quando não está em foco (evita sobrescrever digitação).
  useEffect(() => {
    if (focused.current) return;
    setDraft(typeof value === "number" ? String(value) : "");
  }, [value]);

  const commit = (raw: string) => {
    if (raw.trim() === "") {
      onCommit(undefined);
      return;
    }
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    const clamped = Math.max(0, Math.min(max, n));
    setDraft(String(clamped));
    onCommit(clamped);
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={max}
      value={draft}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(e) => {
        const v = e.target.value.replace(/[^\d]/g, "");
        setDraft(v);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => commit(v), 800);
      }}
      onBlur={(e) => {
        focused.current = false;
        if (timer.current) clearTimeout(timer.current);
        commit(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      placeholder="∞"
      className="w-20 px-2 py-1 rounded-md border border-border bg-background text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-ember"
    />
  );
}
