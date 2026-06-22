"use client";

import { useState } from "react";
import {
  Brain,
  TrendingUp,
  Package,
  AlertTriangle,
  Zap,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  Clock,
  Lightbulb,
  ShoppingCart,
  ArrowUpRight,
  TrendingDown,
  X,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/Toast";
import { useStockForecast, useAiRecommendations, useMarkdownSuggestions, useSetMarkdown } from "@/lib/hooks/useApi";
import type { ApiMarkdownSuggestion } from "@/lib/api";

const urgencyConfig = {
  critical: { label: "Critique", color: "bg-red-100 text-red-700", border: "border-red-200" },
  warning: { label: "Attention", color: "bg-amber-100 text-amber-700", border: "border-amber-200" },
  ok: { label: "OK", color: "bg-emerald-100 text-emerald-700", border: "border-emerald-200" },
  overstock: { label: "Surstock", color: "bg-blue-100 text-blue-700", border: "border-blue-200" },
};

const priorityConfig: Record<string, { color: string; bg: string; icon: any; iconColor: string }> = {
  high: { color: "border-l-red-500", bg: "bg-red-50", icon: AlertTriangle, iconColor: "text-red-600" },
  medium: { color: "border-l-amber-500", bg: "bg-amber-50", icon: Clock, iconColor: "text-amber-600" },
  low: { color: "border-l-blue-500", bg: "bg-blue-50", icon: Lightbulb, iconColor: "text-blue-600" },
};

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  stockout: { label: "Stockout", icon: Package, color: "text-red-600" },
  overstock: { label: "Overstock", icon: TrendingUp, color: "text-blue-600" },
  expiry: { label: "Expiry", icon: Clock, color: "text-amber-600" },
  profit: { label: "Profitability", icon: TrendingUp, color: "text-emerald-600" },
};

// Fallback data if backend is unreachable
const mockForecast = [
  { name: "Mineral Water 1.5L", sku: "EAU-001", category: "Beverages", stock: 45, minStock: 20, unit: "pc", sold30Days: 320, dailyVelocity: 10.7, daysUntilOut: 4, recommendedOrder: 150, urgency: "critical" },
  { name: "Scented Rice 5kg", sku: "RIZ-005", category: "Grocery", stock: 28, minStock: 15, unit: "sack", sold30Days: 180, dailyVelocity: 6.0, daysUntilOut: 4, recommendedOrder: 84, urgency: "critical" },
  { name: "Granulated Sugar 1kg", sku: "SUC-001", category: "Grocery", stock: 85, minStock: 30, unit: "pc", sold30Days: 240, dailyVelocity: 8.0, daysUntilOut: 10, recommendedOrder: 112, urgency: "warning" },
  { name: "Vegetable Oil 1L", sku: "HUI-001", category: "Grocery", stock: 120, minStock: 40, unit: "pc", sold30Days: 90, dailyVelocity: 3.0, daysUntilOut: 40, recommendedOrder: 42, urgency: "ok" },
  { name: "Marseille Soap", sku: "SAV-001", category: "Household", stock: 350, minStock: 50, unit: "pc", sold30Days: 30, dailyVelocity: 1.0, daysUntilOut: 350, recommendedOrder: 0, urgency: "overstock" },
];

const mockRecommendations = [
  { type: "stockout", priority: "high", title: "Stockout imminent: Mineral Water 1.5L", message: "Stock will run out in 4 days. Order 150 units recommended.", action: "Order 150 units" },
  { type: "stockout", priority: "high", title: "Stockout imminent: Scented Rice 5kg", message: "Stock will run out in 4 days. Order 84 sacks recommended.", action: "Order 84 sacks" },
  { type: "expiry", priority: "high", title: "Expiry: Natural Yogurt 500g", message: "Expires in 5 days. Stock: 40 units. Apply a discount.", action: "Apply -20%" },
  { type: "overstock", priority: "low", title: "Overstock: Marseille Soap", message: "Stock for 350 days. Launch a promotion to accelerate sales.", action: "Launch promotion" },
  { type: "profit", priority: "low", title: "Top margin: Arabica Coffee 250g", message: "62% margin (1500 FCFA/unit). Feature at checkout.", action: "Feature at checkout" },
];

export default function IaPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { data: forecastData, loading: forecastLoading, reload: reloadForecast } = useStockForecast();
  const { data: recData, loading: recLoading, reload: reloadRecs } = useAiRecommendations();
  const { data: markdownData, loading: markdownLoading, reload: reloadMarkdown } = useMarkdownSuggestions();
  const { setMarkdown, setting: settingMarkdown } = useSetMarkdown();
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const forecast = forecastData?.forecasts?.length ? forecastData.forecasts : mockForecast;
  const summary = forecastData?.summary || {
    total: forecast.length,
    critical: forecast.filter((f: any) => f.urgency === "critical").length,
    warning: forecast.filter((f: any) => f.urgency === "warning").length,
    overstock: forecast.filter((f: any) => f.urgency === "overstock").length,
    recommendedOrdersValue: forecast.reduce((s: number, f: any) => s + f.recommendedOrder * 500, 0),
  };
  const recommendations = recData?.length ? recData : mockRecommendations;

  const handleRefresh = () => {
    reloadForecast();
    reloadRecs();
    reloadMarkdown();
    toast(t.ia.analysisUpdated, "info");
  };

  const handleAction = (rec: any) => {
    toast(`${t.ia.actionLabel} ${rec.action}`, "info");
  };

  const handleApplyMarkdown = async (suggestion: ApiMarkdownSuggestion) => {
    setApplyingId(suggestion.productId);
    const result = await setMarkdown(suggestion.productId, {
      markdownPrice: suggestion.suggestedMarkdownPrice,
      markdownReason: suggestion.reason,
      markdownNote: `Suggestion IA: ${suggestion.markdownPercent}% de remise`,
    });
    if (result) {
      toast(`${t.ia.markdownApplied} ${suggestion.name} → ${formatCurrency(suggestion.suggestedMarkdownPrice)} (-${suggestion.markdownPercent}%)`, "success");
      reloadMarkdown();
    } else {
      toast(t.ia.markdownError, "warning");
    }
    setApplyingId(null);
  };

  return (
    <AppShell title={t.ia.title} subtitle={t.ia.subtitle}>
      <div className="space-y-5">
        {/* Header avec refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t.ia.predictiveAnalysis}</h2>
              <p className="text-xs text-[var(--text-muted)]">
                {summary.total} products analyzed
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={cn("w-3.5 h-3.5", forecastLoading && "animate-spin")} />}
            onClick={handleRefresh}
          >
            {t.common.refresh}
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className={cn("p-4 border-l-4", urgencyConfig.critical.border)}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{t.ia.critical}</span>
            </div>
            <p className="text-2xl font-bold text-red-600 tabular-nums">{summary.critical}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{t.ia.criticalSub}</p>
          </Card>
          <Card className={cn("p-4 border-l-4", urgencyConfig.warning.border)}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{t.ia.alerts}</span>
            </div>
            <p className="text-2xl font-bold text-amber-600 tabular-nums">{summary.warning}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{t.ia.alertsSub}</p>
          </Card>
          <Card className={cn("p-4 border-l-4", urgencyConfig.overstock.border)}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{t.ia.overstock}</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 tabular-nums">{summary.overstock}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{t.ia.overstockSub}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-emerald-200">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">To order</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 tabular-nums">{formatCurrency(summary.recommendedOrdersValue)}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{t.ia.estimatedValue}</p>
          </Card>
        </div>

        {/* Recommandations IA */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t.ia.smartRecs}</h3>
            <Badge variant="neutral">{recommendations.length}</Badge>
          </div>
          <div className="space-y-2">
            {recommendations.map((rec, idx) => {
              const priority = priorityConfig[rec.priority];
              const typeCfg = typeConfig[rec.type] || typeConfig.stockout;
              const Icon = priority.icon;
              return (
                <Card
                  key={idx}
                  className={cn("p-4 border-l-4", priority.color, priority.bg)}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", priority.iconColor)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-[10px] font-bold uppercase tracking-wide", typeCfg.color)}>
                          {typeCfg.label}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded",
                          rec.priority === "high" ? "bg-red-200 text-red-800" :
                          rec.priority === "medium" ? "bg-amber-200 text-amber-800" :
                          "bg-blue-200 text-blue-800"
                        )}>
                          {rec.priority === "high" ? "Urgent" : rec.priority === "medium" ? "Moyen" : "Info"}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{rec.title}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{rec.message}</p>
                      {rec.action && (
                        <button
                          onClick={() => handleAction(rec)}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:underline"
                        >
                          {rec.action}
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Tableau prévisions de stock */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-[var(--brand)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Stock forecasts</h3>
            <span className="text-xs text-[var(--text-muted)]">- 30 days of data</span>
          </div>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                    <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">Produit</th>
                    <th className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Stock</th>
                    <th className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">Velocity/day</th>
                    <th className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">Out of stock in</th>
                    <th className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3 hidden md:table-cell">Commande sugg.</th>
                    <th className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.map((item: any) => {
                    const urgency = urgencyConfig[item.urgency as keyof typeof urgencyConfig] || urgencyConfig.ok;
                    return (
                      <tr key={item.id || item.sku} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-[var(--text-primary)]">{item.name}</p>
                          <p className="text-[11px] text-[var(--text-muted)] font-mono">{item.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-center tabular-nums text-[var(--text-secondary)] hidden sm:table-cell">
                          {item.stock} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-sm text-center tabular-nums text-[var(--text-secondary)]">
                          {item.dailyVelocity}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.daysUntilOut === null ? (
                            <span className="text-xs text-[var(--text-muted)]">N/A</span>
                          ) : (
                            <span className={cn(
                              "text-sm font-bold tabular-nums",
                              item.daysUntilOut <= 3 ? "text-red-600" :
                              item.daysUntilOut <= 7 ? "text-amber-600" :
                              "text-[var(--text-secondary)]"
                            )}>
                              {item.daysUntilOut}j
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center tabular-nums hidden md:table-cell">
                          {item.recommendedOrder > 0 ? (
                            <span className="font-medium text-[var(--brand)]">{item.recommendedOrder} {item.unit}</span>
                          ) : (
                            <span className="text-[var(--text-muted)]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("inline-flex px-2 py-0.5 rounded-md text-xs font-medium", urgency.color)}>
                            {urgency.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Markdown suggestions */}
        {markdownData && markdownData.suggestions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Suggestions de markdown</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {markdownData.summary.total} produit(s) · Perte potentielle: {formatCurrency(markdownData.summary.totalPotentialLoss)}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw className={cn("w-3.5 h-3.5", markdownLoading && "animate-spin")} />}
                onClick={reloadMarkdown}
              >
                Actualiser
              </Button>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                      <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">Produit</th>
                      <th className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3 hidden md:table-cell">Expiration</th>
                      <th className="text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">Prix actuel</th>
                      <th className="text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">Suggested price</th>
                      <th className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Remise</th>
                      <th className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">Priority</th>
                      <th className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {markdownData.suggestions.map((s) => {
                      const priorityColors: Record<string, string> = {
                        critical: "bg-red-100 text-red-700",
                        high: "bg-amber-100 text-amber-700",
                        medium: "bg-blue-100 text-blue-700",
                      };
                      const reasonLabels: Record<string, string> = {
                        expiry: "Expired",
                        near_expiry: "Exp. proche",
                        clearance: "Destockage",
                      };
                      return (
                        <tr key={s.productId} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-[var(--text-primary)]">{s.name}</p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {s.category} · Stock: {s.stock} {s.unit} · {reasonLabels[s.reason] || s.reason}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center hidden md:table-cell">
                            {s.daysToExpiry !== null ? (
                              <span className={cn(
                                "text-xs font-medium tabular-nums",
                                s.daysToExpiry <= 0 ? "text-red-600" :
                                s.daysToExpiry <= 7 ? "text-amber-600" : "text-[var(--text-muted)]"
                              )}>
                                {s.daysToExpiry <= 0 ? "Expired" : `D-${s.daysToExpiry}`}
                              </span>
                            ) : (
                              <span className="text-xs text-[var(--text-muted)]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm tabular-nums text-right text-[var(--text-secondary)]">
                            {formatCurrency(s.price)}
                          </td>
                          <td className="px-4 py-3 text-sm tabular-nums text-right font-bold text-red-600">
                            {formatCurrency(s.suggestedMarkdownPrice)}
                          </td>
                          <td className="px-4 py-3 text-center hidden sm:table-cell">
                            <span className="text-xs font-bold text-red-600">-{s.markdownPercent}%</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn("inline-flex px-2 py-0.5 rounded-md text-xs font-medium", priorityColors[s.priority])}>
                              {s.priority === "critical" ? "Critique" : s.priority === "high" ? "Haute" : "Moyenne"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleApplyMarkdown(s)}
                              disabled={settingMarkdown && applyingId === s.productId}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 mx-auto"
                            >
                              {settingMarkdown && applyingId === s.productId ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              Appliquer
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
