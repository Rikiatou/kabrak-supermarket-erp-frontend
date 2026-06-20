"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/context";

/**
 * Updates the <html lang="..."> attribute based on the selected locale.
 * Rendered once inside I18nProvider so it can react to language changes.
 */
export function LangAttribute() {
  const { locale } = useI18n();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
