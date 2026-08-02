"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { translations, type Locale } from "./translations";

export type T = typeof translations.fr;

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: T;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: translations.en as unknown as T,
});

const STORAGE_KEY = "kabrak-locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  // FIX HYDRATION (#418): l'app dépend de valeurs client-only (locale sauvée dans
  // localStorage, heure courante, paniers en cours). Le serveur ne les connaît pas,
  // ce qui provoquait un hydration mismatch → erreurs React #418 puis
  // insertBefore/removeChild → "error to load" sur le PC caisse.
  // On attend le montage côté client avant de rendre l'app: le HTML serveur et le
  // premier rendu client sont alors identiques (rien), donc plus aucun mismatch.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && (saved === "fr" || saved === "en")) {
      setLocaleState(saved);
    }
    setMounted(true);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: translations[locale] as unknown as T }}>
      {mounted ? children : null}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
