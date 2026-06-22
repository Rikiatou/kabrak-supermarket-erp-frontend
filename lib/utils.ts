import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Get current locale from localStorage (set by i18n context)
function getCurrentLocale(): "fr-FR" | "en-US" {
  if (typeof window !== "undefined") {
    return localStorage.getItem("kabrak-locale") === "en" ? "en-US" : "fr-FR";
  }
  return "fr-FR";
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined, currency = "XAF"): string {
  if (amount == null || isNaN(amount as number)) return "—";
  const locale = getCurrentLocale();
  return new Intl.NumberFormat(locale === "en-US" ? "en-US" : "fr-CM", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value as number)) return "—";
  return new Intl.NumberFormat(getCurrentLocale()).format(value);
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null || isNaN(value as number)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(getCurrentLocale(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(getCurrentLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
