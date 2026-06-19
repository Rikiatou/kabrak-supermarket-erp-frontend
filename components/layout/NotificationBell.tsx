"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  AlertTriangle,
  Clock,
  TrendingDown,
  Wallet,
  FileText,
  Target,
  TrendingUp,
  Package,
  X,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lib/hooks/useApi";
import type { ApiNotification } from "@/lib/api";
import type { LucideIcon } from "lucide-react";

const TYPE_CONFIG: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  stockout: { icon: Package, color: "text-red-600", bg: "bg-red-50" },
  expired: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  near_expiry: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  cash_diff: { icon: Wallet, color: "text-orange-600", bg: "bg-orange-50" },
  revenue_goal: { icon: Target, color: "text-emerald-600", bg: "bg-emerald-50" },
  invoice_overdue: { icon: FileText, color: "text-red-600", bg: "bg-red-50" },
  markdown_suggestion: { icon: TrendingDown, color: "text-amber-600", bg: "bg-amber-50" },
};

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-blue-500",
  low: "bg-slate-400",
};

export function NotificationBell() {
  const router = useRouter();
  const { notifications, summary, unreadCount, criticalCount, lastChecked, reload } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown quand on clique en dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleClick = (notif: ApiNotification) => {
    if (notif.actionUrl) {
      router.push(notif.actionUrl);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) reload();
        }}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--surface-hover)] transition-colors shrink-0"
      >
        <Bell className="w-4.5 h-4.5 text-[var(--text-secondary)]" />
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center tabular-nums ring-2 ring-white",
              criticalCount > 0 ? "bg-red-500" : "bg-amber-500",
            )}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-[var(--border)] z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[var(--brand)]" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold text-white bg-[var(--brand)] px-1.5 py-0.5 rounded-full tabular-nums">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>
          </div>

          {/* Revenue progress bar */}
          {summary && (
            <div className="px-4 py-2.5 bg-slate-50 border-b border-[var(--border-subtle)]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-[var(--text-muted)]">CA du jour</span>
                <span className="text-[11px] font-bold text-[var(--text-primary)] tabular-nums">
                  {summary.revenue.toLocaleString("fr-FR")} / {summary.revenueGoal.toLocaleString("fr-FR")} FCFA
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    summary.revenueProgress >= 100 ? "bg-emerald-500" : "bg-[var(--brand)]",
                  )}
                  style={{ width: `${summary.revenueProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Notifications list */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-[var(--text-primary)]">Tout est sous contrôle!</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Aucune notification pour le moment</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.stockout;
                const Icon = config.icon;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[var(--surface-hover)] transition-colors text-left border-b border-[var(--border-subtle)] last:border-0"
                  >
                    {/* Icon */}
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
                      <Icon className={cn("w-4 h-4", config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", PRIORITY_DOT[notif.priority])} />
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {notif.title}
                        </p>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-snug">
                        {notif.message}
                      </p>
                      {notif.action && (
                        <p className="text-[10px] text-[var(--brand)] font-medium mt-1">
                          {notif.action} →
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-[var(--border)] bg-slate-50 flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)]">
              {lastChecked ? `Vérifié à ${lastChecked.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "Chargement..."}
            </span>
            <button
              onClick={reload}
              className="text-[10px] font-medium text-[var(--brand)] hover:underline"
            >
              Actualiser
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
