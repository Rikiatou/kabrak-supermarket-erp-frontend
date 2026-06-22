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

export function formatCurrency(amount: number, currency = "XAF"): string {
  const locale = getCurrentLocale();
  return new Intl.NumberFormat(locale === "en-US" ? "en-US" : "fr-CM", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(getCurrentLocale()).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat(getCurrentLocale(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat(getCurrentLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
