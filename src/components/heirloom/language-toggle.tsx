import { useLocale, useT } from "@/lib/i18n";

/**
 * EN / 中文 switch. The choice is persisted in localStorage by the provider,
 * so it survives navigation and reloads without changing the URL.
 */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const t = useT();

  return (
    <div
      className={`lang-toggle ${className}`.trim()}
      role="group"
      aria-label={t.common.language.label}
    >
      <button
        type="button"
        className={locale === "en" ? "active" : ""}
        aria-pressed={locale === "en"}
        title={t.common.language.switchToEnglish}
        onClick={() => setLocale("en")}
      >
        {t.common.language.english}
      </button>
      <span aria-hidden="true">/</span>
      <button
        type="button"
        className={locale === "zh" ? "active" : ""}
        aria-pressed={locale === "zh"}
        title={t.common.language.switchToChinese}
        onClick={() => setLocale("zh")}
      >
        {t.common.language.chinese}
      </button>
    </div>
  );
}
