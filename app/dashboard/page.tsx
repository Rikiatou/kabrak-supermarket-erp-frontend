"use client";

import {
  TrendingUp,
  ShoppingBag,
  Package,
  Users,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { MarginChart } from "@/components/dashboard/MarginChart";
import { StockAlertsList } from "@/components/dashboard/StockAlertsList";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { useTodayStats, useProductStats, useStockAlerts, useStockValue } from "@/lib/hooks/useApi";

export default function DashboardPage() {
  const { t } = useI18n();
  const { stats: todayStats } = useTodayStats();
  const { stats: productStats } = useProductStats();
  const { alerts: stockAlertsData } = useStockAlerts();
  const { value: stockValue } = useStockValue();

  // Données réelles du backend (fallback sur mock si indisponible)
  const revenue = todayStats?.revenue ?? 3_438_000;
  const transactionsCount = todayStats?.transactions ?? 823;
  const grossProfit = stockValue?.potentialMargin
    ? Math.round(stockValue.potentialMargin * 0.3)
    : 893_000;
  const stockAlertsCount =
    (stockAlertsData?.summary.lowStockCount ?? 0) +
    (stockAlertsData?.summary.outOfStockCount ?? 0) +
    (stockAlertsData?.summary.expiringSoonCount ?? 0) ||
    6;

  const criticalAlerts = stockAlertsData?.summary.outOfStockCount ?? 0;
  const expiringAlerts = stockAlertsData?.summary.expiringSoonCount ?? 0;

  return (
    <AppShell
      title={t.dashboard.title}
      subtitle={t.dashboard.subtitle}
    >
      {/* Status bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 bg-[var(--success-light)] text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          {t.dashboard.cashierOpen} — 3 {t.dashboard.activeCashiers}
        </div>
        {criticalAlerts > 0 && (
          <div className="flex items-center gap-2 bg-[var(--danger-light)] text-red-700 text-xs font-medium px-3 py-1.5 rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            {criticalAlerts} {t.dashboard.criticalOutOfStock}
          </div>
        )}
        {expiringAlerts > 0 && (
          <div className="flex items-center gap-2 bg-[var(--warning-light)] text-amber-700 text-xs font-medium px-3 py-1.5 rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            {expiringAlerts} {t.dashboard.expiringSoon}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label={t.dashboard.caRevenue}
          value={revenue}
          previous={3_120_000}
          format="currency"
          icon={<TrendingUp className="w-5 h-5 text-[var(--brand)]" />}
          iconBg="bg-[var(--brand-light)]"
        />
        <KpiCard
          label={t.dashboard.grossProfit}
          value={grossProfit}
          previous={812_000}
          format="currency"
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-[var(--success-light)]"
        />
        <KpiCard
          label={t.dashboard.transactions}
          value={transactionsCount}
          previous={778}
          format="number"
          icon={<ShoppingBag className="w-5 h-5 text-indigo-600" />}
          iconBg="bg-[var(--info-light)]"
        />
        <KpiCard
          label={t.dashboard.stockAlerts}
          value={stockAlertsCount}
          previous={3}
          format="number"
          icon={<Package className="w-5 h-5 text-amber-600" />}
          iconBg="bg-[var(--warning-light)]"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        <Card className="lg:col-span-3" padding="md">
          <CardHeader
            title={t.dashboard.salesByHour}
            subtitle={t.dashboard.salesByHourSub}
            action={
              <span className="text-xs text-[var(--text-muted)] tabular-nums">
                {t.dashboard.realtimeUpdate}
              </span>
            }
          />
          <SalesChart />
        </Card>

        <Card className="lg:col-span-2" padding="md">
          <CardHeader
            title={t.dashboard.marginByCategory}
            subtitle={t.dashboard.marginByCategorySub}
          />
          <MarginChart />
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stock alerts */}
        <Card padding="md">
          <CardHeader
            title={t.dashboard.stockAlertsTitle}
            subtitle={`${stockAlertsCount} ${t.dashboard.stockAlertsSub}`}
            action={
              <Link href="/stocks">
                <Button variant="ghost" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />} iconPosition="right">
                  {t.common.seeAll}
                </Button>
              </Link>
            }
          />
          <StockAlertsList />
        </Card>

        {/* Recent transactions */}
        <Card padding="md">
          <CardHeader
            title={t.dashboard.recentTransactions}
            subtitle={t.dashboard.recentTransactionsSub}
            action={
              <Link href="/pos">
                <Button variant="ghost" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />} iconPosition="right">
                  {t.dashboard.cashier}
                </Button>
              </Link>
            }
          />
          <RecentTransactions />
        </Card>
      </div>

      {/* Employee quick view */}
      <div className="mt-4">
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
                {t.dashboard.teamToday}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">5 {t.dashboard.teamSub} 6</p>
            </div>
            <Link href="/employes">
              <Button variant="secondary" size="sm" icon={<Users className="w-3.5 h-3.5" />}>
                {t.dashboard.manageTeam}
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-3 mt-4 flex-wrap">
            {[
              { name: "Amina B.", role: "Manager", color: "from-blue-400 to-indigo-600" },
              { name: "Jean-Paul M.", role: "Caissier", color: "from-emerald-400 to-teal-600" },
              { name: "Fatou D.", role: "Caissière", color: "from-pink-400 to-rose-600" },
              { name: "Pierre N.", role: "Stockiste", color: "from-amber-400 to-orange-600" },
              { name: "Samuel A.", role: "Caissier", color: "from-violet-400 to-purple-600" },
            ].map((emp) => (
              <div key={emp.name} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${emp.color} flex items-center justify-center text-white text-xs font-bold`}
                >
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--text-primary)] leading-none">{emp.name}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{emp.role}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 opacity-40">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold">
                GT
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)] leading-none">Grace T.</p>
                <p className="text-[11px] text-[var(--text-muted)]">En congé</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
