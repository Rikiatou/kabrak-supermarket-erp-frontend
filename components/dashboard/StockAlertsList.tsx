"use client";

import { AlertTriangle, Clock, ArrowDown } from "lucide-react";
import { stockAlerts as mockAlerts } from "@/lib/mock-data";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { useStockAlerts } from "@/lib/hooks/useApi";
import type { StockAlert } from "@/lib/types";

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    badge: "danger" as const,
    label: "Critique",
    iconColor: "text-red-500",
    bg: "bg-red-50",
  },
  low: {
    icon: ArrowDown,
    badge: "warning" as const,
    label: "Stock bas",
    iconColor: "text-amber-500",
    bg: "bg-amber-50",
  },
  expiring: {
    icon: Clock,
    badge: "warning" as const,
    label: "Expire bientôt",
    iconColor: "text-orange-500",
    bg: "bg-orange-50",
  },
};

function AlertRow({ alert }: { alert: StockAlert }) {
  const config = severityConfig[alert.severity];
  const Icon = config.icon;
  const stockPercent = Math.round((alert.currentStock / alert.minStock) * 100);

  return (
    <div className="flex items-center gap-3 py-3 border-b border-[var(--border-subtle)] last:border-0">
      <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${config.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-[var(--text-primary)] truncate">
            {alert.productName}
          </span>
          <Badge variant={config.badge} size="sm">
            {config.label}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <span className="tabular-nums">
            {alert.currentStock} / {alert.minStock} unités
          </span>
          {alert.expiryDate && (
            <span className="text-orange-500 font-medium">
              Expire le {formatDate(alert.expiryDate)}
            </span>
          )}
        </div>
        <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden w-32">
          <div
            className={`h-full rounded-full transition-all ${
              alert.severity === "critical"
                ? "bg-red-500"
                : "bg-amber-400"
            }`}
            style={{ width: `${Math.min(stockPercent, 100)}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-[var(--text-muted)] shrink-0">{alert.category}</span>
    </div>
  );
}

export function StockAlertsList() {
  const { alerts } = useStockAlerts();

  // Convertir les alertes du backend au format StockAlert du frontend
  const backendAlerts: StockAlert[] = alerts
    ? [
        ...alerts.outOfStock.map((p) => ({
          id: p.id,
          productName: p.name,
          sku: p.sku,
          currentStock: p.stock,
          minStock: p.minStock,
          category: p.category,
          severity: "critical" as const,
          expiryDate: p.expiryDate || undefined,
        })),
        ...alerts.lowStock.map((p) => ({
          id: p.id,
          productName: p.name,
          sku: p.sku,
          currentStock: p.stock,
          minStock: p.minStock,
          category: p.category,
          severity: "low" as const,
          expiryDate: p.expiryDate || undefined,
        })),
        ...alerts.expiringSoon.map((p) => ({
          id: p.id,
          productName: p.name,
          sku: p.sku,
          currentStock: p.stock,
          minStock: p.minStock,
          category: p.category,
          severity: "expiring" as const,
          expiryDate: p.expiryDate || undefined,
        })),
      ].slice(0, 10)
    : [];

  // Fallback sur mock si backend indisponible
  const displayAlerts = backendAlerts.length > 0 ? backendAlerts : mockAlerts;

  return (
    <div className="divide-y divide-transparent">
      {displayAlerts.map((alert, index) => (
        <AlertRow key={`${alert.id}-${alert.severity}-${index}`} alert={alert} />
      ))}
    </div>
  );
}
