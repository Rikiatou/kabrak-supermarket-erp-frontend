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
  ShoppingCart,
  Truck,
  FileText,
  BarChart3,
  Cpu,
  History,
  PackagePlus,
  Zap,
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
import { useAuth } from "@/lib/auth/context";
import {
  useTodayStats,
  useYesterdayStats,
  useWeekTrend,
  useProductStats,
  useStockAlerts,
  useStockValue,
  useEmployees,
  useMonthlyGoal,
  useMonthlyTopProducts,
  useAverageBasket,
  useUnpaidInvoices,
  useActiveShifts,
} from "@/lib/hooks/useApi";

export default function DashboardPage() {
  const { t } = useI18n();
  const { stats: todayStats } = useTodayStats();
  const { stats: yesterdayStats } = useYesterdayStats();
  const { data: weekTrend } = useWeekTrend();
  const { stats: productStats } = useProductStats();
  const { alerts: stockAlertsData } = useStockAlerts();
  const { value: stockValue } = useStockValue();
  const { employees } = useEmployees();
  const { data: activeShifts } = useActiveShifts();
  const openCashiersCount = Array.isArray(activeShifts) ? activeShifts.filter((s: { status: string }) => s.status === "open").length : 0;
  const { data: monthlyGoal } = useMonthlyGoal();
  const { data: topProducts } = useMonthlyTopProducts(5);
  const { data: averageBasket } = useAverageBasket();
  const { data: unpaidInvoices } = useUnpaidInvoices();
  const { user } = useAuth();

  const roleShortcuts: Record<string, { label: string; href: string; icon: React.ElementType; color: string }[]> = {
    boss: [
      { label: "New Sale", href: "/pos", icon: ShoppingCart, color: "bg-blue-50 text-blue-700 border-blue-100" },
      { label: "Receive Delivery", href: "/achats", icon: Truck, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
      { label: "Reports", href: "/rapports", icon: BarChart3, color: "bg-violet-50 text-violet-700 border-violet-100" },
      { label: "AI Insights", href: "/ia", icon: Cpu, color: "bg-amber-50 text-amber-700 border-amber-100" },
      { label: "Product History", href: "/historique", icon: History, color: "bg-slate-50 text-slate-700 border-slate-200" },
      { label: "Invoices", href: "/factures", icon: FileText, color: "bg-rose-50 text-rose-700 border-rose-100" },
    ],
    manager: [
      { label: "New Sale", href: "/pos", icon: ShoppingCart, color: "bg-blue-50 text-blue-700 border-blue-100" },
      { label: "Receive Delivery", href: "/achats", icon: Truck, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
      { label: "Reports", href: "/rapports", icon: BarChart3, color: "bg-violet-50 text-violet-700 border-violet-100" },
      { label: "AI Insights", href: "/ia", icon: Cpu, color: "bg-amber-50 text-amber-700 border-amber-100" },
      { label: "Product History", href: "/historique", icon: History, color: "bg-slate-50 text-slate-700 border-slate-200" },
      { label: "Invoices", href: "/factures", icon: FileText, color: "bg-rose-50 text-rose-700 border-rose-100" },
    ],
    cashier: [
      { label: "New Sale", href: "/pos", icon: ShoppingCart, color: "bg-blue-50 text-blue-700 border-blue-100" },
      { label: "Clients", href: "/clients", icon: Users, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
      { label: "Register", href: "/caisses", icon: Zap, color: "bg-amber-50 text-amber-700 border-amber-100" },
    ],
    accountant: [
      { label: "Invoices", href: "/factures", icon: FileText, color: "bg-blue-50 text-blue-700 border-blue-100" },
      { label: "Accounting", href: "/comptabilite", icon: BarChart3, color: "bg-violet-50 text-violet-700 border-violet-100" },
      { label: "Reports", href: "/rapports", icon: BarChart3, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    ],
    stockist: [
      { label: "Receive Delivery", href: "/achats", icon: Truck, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
      { label: "Stocks", href: "/stocks", icon: PackagePlus, color: "bg-blue-50 text-blue-700 border-blue-100" },
      { label: "Losses", href: "/pertes", icon: AlertTriangle, color: "bg-red-50 text-red-700 border-red-100" },
      { label: "Scanner", href: "/scanner", icon: Package, color: "bg-amber-50 text-amber-700 border-amber-100" },
    ],
  };
  const shortcuts = roleShortcuts[user?.role ?? ""] ?? [];

  // Données réelles du backend (fallback sur mock si indisponible)
  const revenue = todayStats?.revenue ?? 0;
  const transactionsCount = todayStats?.transactions ?? 0;
  const grossProfit = stockValue?.potentialMargin
    ? Math.round(stockValue.potentialMargin * 0.3)
    : 0;
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

  // Employés actifs aujourd'hui
  const activeEmployees = employees.filter((e) => e.status === "active").slice(0, 6);

  return (
    <AppShell
      title={t.dashboard.title}
      subtitle={t.dashboard.subtitle}
    >
      {/* Status bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 bg-[var(--success-light)] text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          {t.dashboard.cashierOpen} — {openCashiersCount} {t.dashboard.activeCashiers}
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

      {/* Role-based quick shortcuts */}
      {shortcuts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {shortcuts.map((s) => (
            <Link
              key={s.href + s.label}
              href={s.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all hover:opacity-80 active:scale-95 ${s.color}`}
            >
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </Link>
          ))}
        </div>
      )}

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
          previous={0}
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
          previous={0}
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
                    {(day.revenue ?? 0) > 0 ? `${((day.revenue ?? 0) / 1000).toFixed(0)}k` : ""}
                  </span>
                  <div className="w-full flex items-end justify-center h-24">
                    <div
                      className={`w-full max-w-[40px] rounded-t-lg transition-all hover:opacity-80 ${
                        isToday
                          ? "bg-gradient-to-t from-[var(--brand)] to-blue-400"
                          : day.revenue > 0
                            ? "bg-gradient-to-t from-blue-300 to-blue-200"
                            : "bg-slate-100"
                      }`}
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                      title={`${day.label}: ${(day.revenue ?? 0).toLocaleString()} FCFA (${day.transactions ?? 0} txns)`}
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
            />
            <div className="mt-4">
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold text-[var(--brand)]">
                  {((monthlyGoal.current ?? 0) / 1000).toFixed(0)}k FCFA
                </span>
                <span className="text-sm text-[var(--text-muted)]">
                  / {((monthlyGoal.goal ?? 0) / 1000).toFixed(0)}k
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--brand)] to-blue-400 transition-all duration-500"
                  style={{ width: `${Math.min(monthlyGoal.progress, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className={`font-medium ${monthlyGoal.progress >= 100 ? "text-emerald-600" : "text-[var(--brand)]"}`}>
                  {monthlyGoal.progress}% {t.dashboard.monthlyGoalProgress}
                </span>
                <span className="text-[var(--text-muted)]">
                  {t.dashboard.monthlyGoalRemaining} {((monthlyGoal.remaining ?? 0) / 1000).toFixed(0)}k FCFA
                </span>
              </div>
            </div>
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
                      {((product.revenue ?? 0) / 1000).toFixed(1)}k
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
              <p className="text-xs text-[var(--text-muted)] mt-0.5">5 {t.dashboard.teamSub} 6</p>
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
                  boss: t.dashboard.roleBoss || "Boss",
                  manager: t.dashboard.roleManager,
                  supervisor: t.dashboard.roleSupervisor,
                  cashier: t.dashboard.roleCashier,
                  stockist: t.dashboard.roleStockist,
                  accountant: t.dashboard.roleAccountant || "Accountant",
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
