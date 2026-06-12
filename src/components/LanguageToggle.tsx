import { LANGS, useLang } from "@/lib/i18n";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`inline-flex rounded-full bg-white/10 p-0.5 ${compact ? "text-[10px]" : "text-xs"}`}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`px-2.5 py-1 rounded-full font-bold transition ${
            lang === l.code ? "bg-amber-warm text-charcoal" : "text-white/70 hover:text-white"
          }`}
          aria-pressed={lang === l.code}
        >
          {l.flag} {l.label}
        </button>
      ))}
    </div>
  );
}
