"use client";

import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5">
      <button
        onClick={() => setLocale("fr")}
        className={cn(
          "px-2.5 py-1 text-xs font-bold rounded-md transition-all",
          locale === "fr"
            ? "bg-white text-[var(--brand)]"
            : "text-white/60 hover:text-white"
        )}
      >
        FR
      </button>
      <button
        onClick={() => setLocale("en")}
        className={cn(
          "px-2.5 py-1 text-xs font-bold rounded-md transition-all",
          locale === "en"
            ? "bg-white text-[var(--brand)]"
            : "text-white/60 hover:text-white"
        )}
      >
        EN
      </button>
    </div>
  );
}
