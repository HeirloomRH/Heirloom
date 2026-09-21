import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { en } from "./en";
import { zh } from "./zh";

export type Locale = "en" | "zh";

/**
 * The English dictionary is the source of truth for the shape of every locale.
 * `zh` is typed against it, so a missing or misspelled key is a build error
 * rather than an `undefined` rendered into the page.
 */
export type Dict = typeof en;

const DICTS: Record<Locale, Dict> = { en, zh };

export const LOCALE_STORAGE_KEY = "heirloom.locale";

/** `<html lang>` value per locale. */
const HTML_LANG: Record<Locale, string> = { en: "en", zh: "zh-Hans" };

function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "zh";
}

/** Reads a persisted choice, falling back to the browser's own preference. */
function readStoredLocale(): Locale | null {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Private mode / blocked storage — fall through to language detection.
  }
  try {
    if (navigator.language.toLowerCase().startsWith("zh")) return "zh";
  } catch {
    // No navigator (non-browser runtime).
  }
  return null;
}

type I18nValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: Dict;
};

const I18nContext = createContext<I18nValue | null>(null);

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function I18nProvider({ children }: { children: ReactNode }) {
  // Always "en" on first render so the client's markup matches what the server
  // sent. The stored locale is applied in a layout effect below, which runs
  // after hydration but before the browser paints.
  const [locale, setLocaleState] = useState<Locale>("en");

  useIsomorphicLayoutEffect(() => {
    const stored = readStoredLocale();
    if (stored && stored !== "en") setLocaleState(stored);
  }, []);

  useIsomorphicLayoutEffect(() => {
    document.documentElement.lang = HTML_LANG[locale];
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Preference simply will not persist; the toggle still works this session.
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t: DICTS[locale] }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

/** The active dictionary: `const t = useT(); t.home.heroTitle`. */
export function useT(): Dict {
  return useI18n().t;
}

/** The active locale plus its setter, for the language toggle. */
export function useLocale(): { locale: Locale; setLocale: (next: Locale) => void } {
  const { locale, setLocale } = useI18n();
  return { locale, setLocale };
}
