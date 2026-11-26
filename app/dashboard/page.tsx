"use client";

import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Package,
  Users,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Pencil,
  Wallet,
} from "lucide-react";
import { useState } from "react";
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
import { useAuth } from "@/lib/auth/context";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";
import {
  useTodayStats,
  useYesterdayStats,
  useWeekTrend,
  useProductStats,
  useStockAlerts,
  useEmployees,
  useMonthlyGoal,
  useMonthlyTopProducts,
  useAverageBasket,
  useUnpaidInvoices,
  useActiveShifts,
  useProfitLoss,
  usePolling,
} from "@/lib/hooks/useApi";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const isBoss = user?.role === "boss" || user?.role === "manager";
  const { stats: todayStats } = useTodayStats();
  const { stats: yesterdayStats } = useYesterdayStats();
  const { data: weekTrend } = useWeekTrend();
  const { stats: productStats } = useProductStats();
  const { alerts: stockAlertsData } = useStockAlerts();
  const { employees } = useEmployees();
  const { data: monthlyGoal, saveGoal } = useMonthlyGoal();
  const today = todayISO();
  const { data: todayPL, reload: reloadTodayPL } = useProfitLoss(today, today);
  usePolling(reloadTodayPL, 60000);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);
  const { data: topProducts } = useMonthlyTopProducts(5);
  const { data: averageBasket } = useAverageBasket();
  const { data: unpaidInvoices } = useUnpaidInvoices();
  const { data: activeShifts } = useActiveShifts();

  const revenue = todayStats?.revenue ?? 0;
  const transactionsCount = todayStats?.transactions ?? 0;
  const stockAlertsCount =
    (stockAlertsData?.summary.lowStockCount ?? 0) +
    (stockAlertsData?.summary.outOfStockCount ?? 0) +
    (stockAlertsData?.summary.expiringSoonCount ?? 0);

  const criticalAlerts = stockAlertsData?.summary.outOfStockCount ?? 0;
  const expiringAlerts = stockAlertsData?.summary.expiringSoonCount ?? 0;

  // Comparaison vs hier
  const yesterdayRevenue = yesterdayStats?.revenue ?? 0;
  const yesterdayTransactions = yesterdayStats?.transactions ?? 0;
  const revenueChange = yesterdayRevenue > 0
    ? Math.round(((revenue - yesterdayRevenue) / yesterdayRevenue) * 100)
    : 0;
  const txnChange = yesterdayTransactions > 0
    ? Math.round(((transactionsCount - yesterdayTransactions) / yesterdayTransactions) * 100)
    : 0;

  // Tendance 7 jours — trouver le max pour le graphique
  const maxRevenue = Math.max(...weekTrend.map((d) => d.revenue), 1);
  const todayLabel = weekTrend[weekTrend.length - 1]?.label || t.common.today;

  const allActiveEmployees = employees.filter((e) => e.status === "active");
  const activeEmployees = allActiveEmployees.slice(0, 6);
  const openTills = activeShifts?.length ?? 0;

  const paymentLabels: Record<string, string> = {
    cash: t.comptabilite.pmCash,
    mobile: t.comptabilite.pmMobile,
    card: t.comptabilite.pmCard,
    transfer: t.comptabilite.pmTransfer,
    check: t.comptabilite.pmCheck,
  };

  const startEditGoal = () => {
    setGoalInput(monthlyGoal?.goal ? String(monthlyGoal.goal) : "");
    setEditingGoal(true);
  };

  const submitGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseInt(goalInput.replace(/\s/g, ""), 10);
    if (!Number.isFinite(value) || value <= 0) return;
    setSavingGoal(true);
    try {
      await saveGoal(value);
      toast(t.dashboard.goalSaved, "success");
      setEditingGoal(false);
    } catch (err) {
      toast(err instanceof Error && err.message ? err.message : t.dashboard.goalError, "warning");
    } finally {
      setSavingGoal(false);
    }
  };

  return (
    <AppShell
      title={t.dashboard.title}
      subtitle={t.dashboard.subtitle}
    >
      {/* Status bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {openTills > 0 ? (
          <div className="flex items-center gap-2 bg-[var(--success-light)] text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            {t.dashboard.cashierOpen} — {openTills} {t.dashboard.activeCashiers}
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-slate-100 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
            {t.dashboard.noCashierOpen}
          </div>
        )}
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
          previous={yesterdayRevenue}
          format="currency"
          icon={revenueChange >= 0 ? <TrendingUp className="w-5 h-5 text-[var(--brand)]" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
          iconBg="bg-[var(--brand-light)]"
        />
        <KpiCard
          label={t.dashboard.avgBasket}
          value={averageBasket?.average ?? 0}
          previous={yesterdayStats?.avgBasket ?? 0}
          format="currency"
          icon={<ShoppingBag className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-[var(--success-light)]"
        />
        <KpiCard
          label={t.dashboard.transactions}
          value={transactionsCount}
          previous={yesterdayTransactions}
          format="number"
          icon={<ShoppingBag className="w-5 h-5 text-indigo-600" />}
          iconBg="bg-[var(--info-light)]"
        />
        <KpiCard
          label={t.dashboard.unpaidInvoices}
          value={unpaidInvoices?.totalUnpaid ?? 0}
          footnote={`${unpaidInvoices?.count ?? 0} ${t.dashboard.unpaidCount}`}
          format="currency"
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
          iconBg="bg-[var(--danger-light)]"
        />
      </div>

      {/* Indicateurs de changement vs hier */}
      {(revenueChange !== 0 || txnChange !== 0) && (
        <div className="flex items-center gap-4 mb-4 text-xs">
          <span className="text-[var(--text-muted)]">{t.dashboard.vsYesterdayLabel}</span>
          {revenueChange !== 0 && (
            <span className={`flex items-center gap-1 font-medium ${revenueChange >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {revenueChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {t.dashboard.revenueLabel} {revenueChange >= 0 ? "+" : ""}{revenueChange}%
            </span>
          )}
          {txnChange !== 0 && (
            <span className={`flex items-center gap-1 font-medium ${txnChange >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {txnChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {t.dashboard.transactionsLabel} {txnChange >= 0 ? "+" : ""}{txnChange}%
            </span>
          )}
        </div>
      )}

      {/* Encaissé aujourd'hui + marge du jour */}
      <Card className="mb-6" padding="md">
        <CardHeader
          title={t.dashboard.todayMoney}
          subtitle={t.dashboard.todayMoneySub}
          action={<Wallet className="w-4 h-4 text-[var(--text-muted)]" />}
        />
        {!todayPL || todayPL.paymentMethods.length === 0 ? (
          <p className="mt-3 text-xs text-[var(--text-muted)]">{t.dashboard.noSalesToday}</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {todayPL.paymentMethods.map((pm) => (
              <div key={pm.method} className="rounded-xl border border-[var(--border)] px-3 py-2.5">
                <p className="text-xs text-[var(--text-muted)]">{paymentLabels[pm.method] ?? pm.method}</p>
                <p className="text-base font-semibold tabular-nums text-[var(--text-primary)]">{formatCurrency(pm.amount)}</p>
              </div>
            ))}
            {isBoss && (
              <div className="rounded-xl border border-[var(--border)] px-3 py-2.5">
                <p className="text-xs text-[var(--text-muted)]">{t.dashboard.grossMarginToday}</p>
                <p className={`text-base font-semibold tabular-nums ${todayPL.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCurrency(todayPL.grossProfit)} <span className="text-xs font-normal text-[var(--text-muted)]">({todayPL.grossMarginRate}%)</span>
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">{t.dashboard.costToday}: {formatCurrency(todayPL.costOfGoodsSold)}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 7-day trend chart */}
      {weekTrend.length > 0 && (
        <Card className="mb-6" padding="md">
          <CardHeader
            title={t.dashboard.salesTrend}
            subtitle={t.dashboard.salesTrendSub}
            action={
              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {todayLabel}
              </span>
            }
          />
          <div className="flex items-end justify-between gap-2 h-32 mt-4">
            {weekTrend.map((day, i) => {
              const heightPct = (day.revenue / maxRevenue) * 100;
              const isToday = i === weekTrend.length - 1;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-medium text-[var(--text-muted)] tabular-nums">
                    {day.revenue > 0 ? `${(day.revenue / 1000).toFixed(0)}k` : ""}
                  </span>
                  <div className="w-full flex items-end justify-center h-24">
                    <div
                      className={`w-full max-w-[40px] rounded-t-lg transition-all hover:opacity-80 ${
                        isToday
                          ? "bg-[var(--brand)]"
                          : day.revenue > 0
                            ? "bg-blue-200"
                            : "bg-slate-100"
                      }`}
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                      title={`${day.label}: ${day.revenue.toLocaleString("fr-FR")} ${t.common.currency} (${day.transactions} ${t.common.txnsAbbr})`}
                    />
                  </div>
                  <span className={`text-[10px] ${isToday ? "font-bold text-[var(--brand)]" : "text-[var(--text-muted)]"}`}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Objectif mensuel + Top produits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Objectif mensuel */}
        {monthlyGoal && (
          <Card padding="md">
            <CardHeader
              title={t.dashboard.monthlyGoal}
              subtitle={`${monthlyGoal.transactions} ${t.dashboard.monthlyGoalSub}`}
              action={
                isBoss && monthlyGoal.goal && !editingGoal ? (
                  <Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={startEditGoal}>
                    {t.dashboard.editGoal}
                  </Button>
                ) : undefined
              }
            />
            {editingGoal ? (
              <form onSubmit={submitGoal} className="mt-4 flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">{t.dashboard.goalAmount}</label>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    autoFocus
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                  />
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={() => setEditingGoal(false)}>
                  {t.common.cancel}
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={savingGoal}>
                  {savingGoal ? t.common.saving : t.common.save}
                </Button>
              </form>
            ) : (
              <div className="mt-4">
                <div className="flex items-end justify-between mb-2">
                  <span className="text-2xl font-bold text-[var(--brand)]">
                    {formatCurrency(monthlyGoal.current)}
                  </span>
                  {monthlyGoal.goal && (
                    <span className="text-sm text-[var(--text-muted)]">
                      / {formatCurrency(monthlyGoal.goal)}
                    </span>
                  )}
                </div>
                {monthlyGoal.goal ? (
                  <>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--brand)] transition-all duration-500"
                        style={{ width: `${Math.min(monthlyGoal.progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className={`font-medium ${monthlyGoal.progress >= 100 ? "text-emerald-600" : "text-[var(--brand)]"}`}>
                        {monthlyGoal.progress}% {t.dashboard.monthlyGoalProgress}
                      </span>
                      <span className="text-[var(--text-muted)]">
                        {t.dashboard.monthlyGoalRemaining} {formatCurrency(monthlyGoal.remaining)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                    <span>{t.dashboard.noGoal}</span>
                    {isBoss && (
                      <Button variant="secondary" size="sm" onClick={startEditGoal}>
                        {t.dashboard.setGoal}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Top 5 produits */}
        {topProducts.length > 0 && (
          <Card padding="md">
            <CardHeader
              title={t.dashboard.top5Products}
              subtitle={t.dashboard.top5Sub}
            />
            <div className="mt-4 space-y-3">
              {topProducts.map((product, i) => (
                <div key={product.productId} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--brand-light)] text-[var(--brand)] text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.productName}</p>
                    <p className="text-xs text-[var(--text-muted)]">{product.quantity} {t.dashboard.sold}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--brand)]">
                      {(product.revenue / 1000).toFixed(1)}k
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
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
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {allActiveEmployees.length} {t.dashboard.teamSub} {employees.length}
              </p>
            </div>
            <Link href="/employes">
              <Button variant="secondary" size="sm" icon={<Users className="w-3.5 h-3.5" />}>
                {t.dashboard.manageTeam}
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-3 mt-4 flex-wrap">
            {activeEmployees.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">{t.dashboard.noActiveEmployees}</p>
            ) : (
              activeEmployees.map((emp) => {
                const colors: Record<string, string> = {
                  manager: "from-blue-400 to-indigo-600",
                  supervisor: "from-purple-400 to-violet-600",
                  cashier: "from-emerald-400 to-teal-600",
                  stockist: "from-amber-400 to-orange-600",
                };
                const roleLabels: Record<string, string> = {
                  manager: t.dashboard.roleManager,
                  supervisor: t.dashboard.roleSupervisor,
                  cashier: t.dashboard.roleCashier,
                  stockist: t.dashboard.roleStockist,
                };
                return (
                  <div key={emp.id} className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${colors[emp.role] || "from-slate-400 to-slate-600"} flex items-center justify-center text-white text-xs font-bold`}
                    >
                      {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--text-primary)] leading-none">
                        {emp.firstName} {emp.lastName.charAt(0)}.
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">{roleLabels[emp.role] || emp.role}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
