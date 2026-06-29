"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn, formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";

interface KpiCardProps {
  label: string;
  value: number;
  previous: number;
  format?: "currency" | "number" | "percent";
  icon: React.ReactNode;
  iconBg: string;
  prefix?: string;
  suffix?: string;
}

export function KpiCard({
  label,
  value,
  previous,
  format = "currency",
  icon,
  iconBg,
  suffix,
}: KpiCardProps) {
  const { t } = useI18n();
  const delta = previous > 0 ? ((value - previous) / previous) * 100 : 0;
  const isUp = delta > 0;
  const isFlat = delta === 0;

  const display =
    format === "currency"
      ? formatCurrency(value)
      : format === "number"
      ? formatNumber(value)
      : `${(value ?? 0).toFixed(1)}%`;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            iconBg
          )}
        >
          {icon}
        </div>
        <div
          className={cn(
            "flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md",
            isFlat
              ? "bg-slate-100 text-slate-500"
              : isUp
              ? "bg-[var(--success-light)] text-[var(--success)]"
              : "bg-[var(--danger-light)] text-[var(--danger)]"
          )}
        >
          {isFlat ? (
            <Minus className="w-3 h-3" />
          ) : isUp ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span className="tabular-nums">{Math.abs(delta ?? 0).toFixed(1)}%</span>
        </div>
      </div>

      <p className="text-[22px] font-bold text-[var(--text-primary)] tabular-nums leading-none mb-1 tracking-tight">
        {display}
        {suffix && <span className="text-sm font-normal text-[var(--text-muted)] ml-1">{suffix}</span>}
      </p>
      <p className="text-[12px] text-[var(--text-secondary)] font-medium">{label}</p>
      <p className="text-[11px] text-[var(--text-muted)] mt-1">
        {t.kpiCard.vsYesterday}{" "}
        <span className="tabular-nums">
          {format === "currency" ? formatCurrency(previous) : formatNumber(previous)}
        </span>
      </p>
    </div>
  );
}
