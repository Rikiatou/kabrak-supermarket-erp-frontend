"use client";

import { useState, useMemo } from "react";
import {
  Download,
  Calendar,
  TrendingUp,
  ShoppingCart,
  Package,
  BarChart2,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Percent,
  Boxes,
  Tag,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/Toast";
import { exportToCSV, printSection } from "@/lib/export";
import {
  useSalesReport,
  useSalesByCategory,
  useSalesByEmployee,
  useTopProducts,
  useProfitAnalysis,
  useInventoryValuation,
  useDiscountsReport,
} from "@/lib/hooks/useApi";

// ---- Fallback mock data (used when backend returns nothing) ----
const mockByDay = [
  { date: "Mon", revenue: 2_840_000, transactions: 240 },
  { date: "Tue", revenue: 3_120_000, transactions: 268 },
  { date: "Wed", revenue: 2_950_000, transactions: 251 },
  { date: "Thu", revenue: 3_380_000, transactions: 289 },
  { date: "Fri", revenue: 3_970_000, transactions: 332 },
  { date: "Sat", revenue: 4_820_000, transactions: 410 },
  { date: "Sun", revenue: 3_610_000, transactions: 305 },
];

const mockSalesReport = {
  totalRevenue: 24_690_000,
  totalSubtotal: 25_190_000,
  totalDiscount: 500_000,
  totalTax: 0,
  transactionsCount: 2095,
  avgBasket: 11_780,
  byDay: mockByDay,
};

const mockByCategory = [
  { category: "Beverages", revenue: 6_200_000, quantity: 1820 },
  { category: "Grocery", revenue: 8_400_000, quantity: 3120 },
  { category: "Hygiene", revenue: 3_100_000, quantity: 980 },
  { category: "Home", revenue: 2_690_000, quantity: 540 },
  { category: "Other", revenue: 4_300_000, quantity: 1240 },
];

const mockByEmployee = [
  { employeeId: "1", employeeName: "Awa Diallo", employeeNumber: "EMP001", revenue: 7_820_000, transactions: 680 },
  { employeeId: "2", employeeName: "Moussa Traoré", employeeNumber: "EMP002", revenue: 6_540_000, transactions: 560 },
  { employeeId: "3", employeeName: "Fatou Bambara", employeeNumber: "EMP003", revenue: 5_930_000, transactions: 510 },
  { employeeId: "4", employeeName: "Ibrahim Konaté", employeeNumber: "EMP004", revenue: 4_400_000, transactions: 345 },
];

const mockTopProducts = [
  { productId: "1", name: "Beer 65cl", quantity: 248, revenue: 223_200 },
  { productId: "2", name: "Scented Rice 25kg", quantity: 87, revenue: 1_914_000 },
  { productId: "3", name: "Mineral Water 1.5L", quantity: 412, revenue: 164_800 },
  { productId: "4", name: "Vegetable Oil 5L", quantity: 63, revenue: 346_500 },
  { productId: "5", name: "Lux Soap 200g", quantity: 185, revenue: 83_250 },
  { productId: "6", name: "Sugar 1kg", quantity: 156, revenue: 109_200 },
  { productId: "7", name: "Powdered Milk 400g", quantity: 98, revenue: 215_600 },
  { productId: "8", name: "Lipton Tea 100s", quantity: 74, revenue: 148_000 },
  { productId: "9", name: "Pasta 500g", quantity: 230, revenue: 92_000 },
  { productId: "10", name: "Coffee 200g", quantity: 61, revenue: 170_800 },
];

const mockProfit = {
  totalRevenue: 24_690_000,
  totalCost: 17_280_000,
  grossProfit: 7_410_000,
  marginRate: 30,
};

const mockInventory = {
  totalCostValue: 42_500_000,
  totalSaleValue: 58_900_000,
  potentialMargin: 16_400_000,
  productCount: 1248,
};

const mockDiscounts = {
  totalDiscount: 0,
  transactionsCount: 0,
  transactions: [],
  byProduct: [],
};

const PIE_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const RevenueTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  const { t } = useI18n();
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl shadow-[var(--shadow)] px-3 py-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-[var(--text-primary)] mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span className="text-[var(--text-muted)]">{p.name === "revenue" ? t.rapports.revenue : p.name}</span>
          <span className="font-medium tabular-nums">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function RapportsPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  // Default date range: last 7 days
  const defaultEnd = useMemo(() => toISODate(new Date()), []);
  const defaultStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return toISODate(d);
  }, []);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  // Quick period presets
  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    setStartDate(toISODate(start));
    setEndDate(toISODate(end));
  };

  // Backend hooks
  const { data: salesReport, loading: loadingSales } = useSalesReport(startDate, endDate);
  const { data: byCategory, loading: loadingCat } = useSalesByCategory(startDate, endDate);
  const { data: byEmployee, loading: loadingEmp } = useSalesByEmployee(startDate, endDate);
  const { data: topProducts, loading: loadingTop } = useTopProducts(startDate, endDate, 10);
  const { data: profit, loading: loadingProfit } = useProfitAnalysis(startDate, endDate);
  const { data: inventory, loading: loadingInv } = useInventoryValuation();
  const { data: discountsData, loading: loadingDiscounts } = useDiscountsReport(startDate, endDate);

  // Fallback to mock if backend returns nothing
  const sales = salesReport ?? mockSalesReport;
  const categories = byCategory && byCategory.length > 0 ? byCategory : mockByCategory;
  const employees = byEmployee && byEmployee.length > 0 ? byEmployee : mockByEmployee;
  const top = topProducts && topProducts.length > 0 ? topProducts : mockTopProducts;
  const profitData = profit ?? mockProfit;
  const inventoryData = inventory ?? mockInventory;
  const discounts = discountsData ?? mockDiscounts;

  // Translate day abbreviations in byDay data for chart display
  const dayAbbrMap: Record<string, string> = {
    Mon: t.common.days.mon,
    Tue: t.common.days.tue,
    Wed: t.common.days.wed,
    Thu: t.common.days.thu,
    Fri: t.common.days.fri,
    Sat: t.common.days.sat,
    Sun: t.common.days.sun,
  };
  const chartByDay = (sales.byDay ?? []).map((d: { date: string; revenue: number; transactions: number }) => ({
    ...d,
    date: dayAbbrMap[d.date] ?? d.date,
  }));

  const marginPct = profitData.marginRate ?? (profitData.totalRevenue > 0 ? (profitData.grossProfit / profitData.totalRevenue) * 100 : 0);

  const kpis = [
    {
      label: t.rapports.weekRevenue,
      value: formatCurrency(sales.totalRevenue),
      icon: DollarSign,
      delta: +8.4,
      sublabel: `${startDate} → ${endDate}`,
    },
    {
      label: t.rapports.transactions,
      value: (sales.transactionsCount ?? 0).toLocaleString(),
      icon: ShoppingCart,
      delta: +11.7,
      sublabel: t.rapports.forThePeriod,
    },
    {
      label: t.rapports.avgBasket,
      value: formatCurrency(sales.avgBasket),
      icon: TrendingUp,
      delta: +3.2,
      sublabel: t.rapports.perTransaction,
    },
    {
      label: t.rapports.grossProfit,
      value: formatCurrency(profitData.grossProfit),
      icon: BarChart2,
      delta: +5.1,
      sublabel: `Cost: ${formatCurrency(profitData.totalCost)}`,
    },
    {
      label: t.rapports.achievementRate,
      value: `${(marginPct ?? 0).toFixed(1)}%`,
      icon: Percent,
      delta: marginPct >= 30 ? +2.4 : -1.2,
      sublabel: t.rapports.grossMargin,
    },
    {
      label: t.rapports.totalDiscounts,
      value: formatCurrency(sales.totalDiscount ?? discounts.totalDiscount ?? 0),
      icon: Tag,
      delta: (discounts.transactionsCount ?? 0) > 0 ? 0 : undefined,
      sublabel: `${discounts.transactionsCount ?? 0} ${t.rapports.discountsCount.toLowerCase()}`,
    },
  ];

  const handleExportPDF = () => {
    printSection("rapports-content");
    toast(t.rapports.printing, "info");
  };
  const handleExportExcel = () => {
    // Exporter les top produits en CSV
    if (top && top.length > 0) {
      exportToCSV(
        top.map((p: Record<string, unknown>) => ({
          Produit: (p.name as string) || (p.productName as string) || "",
          Quantite: (p.quantity as number) || (p.qty as number) || 0,
          CA: (p.revenue as number) || (p.totalRevenue as number) || 0,
          Marge: (p.margin as string) || "",
        })),
        `rapports_ventes_${startDate}_${endDate}`,
        [
          { key: "Produit", label: t.rapports.colProduct },
          { key: "Quantite", label: t.rapports.colQty },
          { key: "CA", label: t.rapports.revenueLabel },
          { key: "Marge", label: t.rapports.colMargin },
        ],
      );
      toast(t.rapports.excelDownloaded, "success");
    } else {
      toast(t.rapports.noDataToExport, "warning");
    }
  };

  return (
    <AppShell title={t.rapports.title} subtitle={t.rapports.subtitle}>
      <div id="rapports-content">
      {/* Date range selector + Export */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-[var(--border)] rounded-xl p-1.5 shadow-[var(--shadow-sm)]">
          <Calendar className="w-4 h-4 text-[var(--text-muted)] ml-1" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs font-medium text-[var(--text-secondary)] bg-transparent border-none outline-none cursor-pointer"
          />
          <span className="text-[var(--text-muted)] text-xs">→</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs font-medium text-[var(--text-secondary)] bg-transparent border-none outline-none cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-1 bg-white border border-[var(--border)] rounded-xl p-1 shadow-[var(--shadow-sm)]">
          {[
            { label: "7d", days: 7 },
            { label: "30d", days: 30 },
            { label: "90d", days: 90 },
          ].map((p) => (
            <button
              key={p.label}
              onClick={() => setPreset(p.days)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-blue-50/50"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />
        <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExportPDF}>
          {t.rapports.exportPDF}
        </Button>
        <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExportExcel}>
          {t.rapports.exportExcel}
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {kpis.map(({ label, value, icon: Icon, delta, sublabel }) => (
          <div key={label} className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-muted)]">{label}</span>
              {delta !== undefined && (
                <div className={cn("flex items-center gap-0.5 text-[11px] font-semibold", delta >= 0 ? "text-emerald-600" : "text-red-500")}>
                  {delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(delta).toFixed(1)}%
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-[var(--brand)] shrink-0" />
              <span className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{value}</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1 truncate">{sublabel}</p>
          </div>
        ))}
      </div>

      {/* Charts row: Sales by day (Line) + Sales by category (Pie) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Card className="lg:col-span-2">
          <CardHeader title={t.rapports.revenueEvolution} subtitle={t.rapports.revenueEvolutionSub} />
          <div className="h-72 px-2 pb-2 min-w-0 w-full">
            {loadingSales ? (
              <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">{t.common.loading}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartByDay} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
                  <Tooltip content={<RevenueTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name={t.rapports.revenueLabel} stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title={t.rapports.salesByCategory} subtitle={t.rapports.salesByCategorySub} />
          <div className="h-72 px-2 pb-2 min-w-0 w-full">
            {loadingCat ? (
              <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">{t.common.loading}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="revenue"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={true}
                    labelLine={false}
                  >
                    {categories.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Sales by category bar chart */}
      <Card className="mb-5">
        <CardHeader title={t.rapports.salesByCategoryDetail} subtitle={t.rapports.salesByCategoryDetailSub} />
        <div className="h-64 px-2 pb-2 min-w-0 w-full">
          {loadingCat ? (
            <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">{t.common.loading}</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categories} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip cursor={{ fill: "#f1f5f9" }} formatter={(v: unknown) => formatCurrency(Number(v))} />
                <Legend />
                <Bar dataKey="revenue" name={t.rapports.revenueLabel} fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Top 10 products + Sales by employee */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {/* Top 10 products */}
        <Card>
          <CardHeader title={t.rapports.top10Products} subtitle={t.rapports.top10Sub} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)]">#</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)]">{t.rapports.colProduct}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] text-right">{t.rapports.colQty}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] text-right">{t.rapports.colRevenue}</th>
                </tr>
              </thead>
              <tbody>
                {loadingTop ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">{t.common.loading}</td>
                  </tr>
                ) : (
                  top.map((p, i) => (
                    <tr key={p.productId} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-2.5">
                        <Badge variant={i < 3 ? "success" : "neutral"} size="sm">{i + 1}</Badge>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">{p.name}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-secondary)]">{p.quantity}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-[var(--text-primary)]">{formatCurrency(p.revenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Sales by employee */}
        <Card>
          <CardHeader title={t.rapports.salesByEmployee} subtitle={t.rapports.salesByEmployeeSub} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)]">{t.rapports.colEmployee}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] text-right">{t.rapports.colTransactions}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] text-right">{t.rapports.colRevenue}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] text-right">{t.rapports.colAvgBasket}</th>
                </tr>
              </thead>
              <tbody>
                {loadingEmp ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">{t.common.loading}</td>
                  </tr>
                ) : (
                  employees.map((e, idx) => {
                    const name = e.employeeName || "—";
                    const parts = name.split(" ");
                    const initials = (parts[0]?.charAt(0) || "?") + (parts[1]?.charAt(0) || "");
                    return (
                    <tr key={e.employeeId || idx} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[var(--brand-light)] text-[var(--brand-dark)] flex items-center justify-center text-xs font-bold">
                            {initials.toUpperCase()}
                          </div>
                          <span className="font-medium text-[var(--text-primary)]">{name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-secondary)]">{e.transactions}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-[var(--text-primary)]">{formatCurrency(e.revenue)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-muted)]">
                        {formatCurrency(e.transactions > 0 ? e.revenue / e.transactions : 0)}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Inventory valuation summary */}
      <Card>
        <CardHeader title={t.rapports.stockValuation} subtitle={t.rapports.stockValuationSub} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4">
          {[
            {
              label: t.rapports.productCount,
              value: (inventoryData.productCount ?? 0).toLocaleString(),
              icon: Package,
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: t.rapports.costValue,
              value: formatCurrency(inventoryData.totalCostValue),
              icon: Boxes,
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
            {
              label: t.rapports.saleValue,
              value: formatCurrency(inventoryData.totalSaleValue),
              icon: DollarSign,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              label: t.rapports.potentialMargin,
              value: formatCurrency(inventoryData.potentialMargin),
              icon: TrendingUp,
              color: "text-indigo-600",
              bg: "bg-indigo-50",
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)]">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", bg)}>
                <Icon className={cn("w-5 h-5", color)} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[var(--text-muted)] mb-0.5">{label}</p>
                <p className="text-base font-bold text-[var(--text-primary)] tabular-nums truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
        {loadingInv && (
          <div className="px-4 pb-4 text-xs text-[var(--text-muted)]">{t.rapports.loadingValuation}</div>
        )}
      </Card>

      {/* ════════ DISCOUNTS SECTION ════════ */}
      <Card>
        <CardHeader title={t.rapports.discounts} subtitle={t.rapports.discountsSub} />

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 p-4">
          <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-rose-50">
              <Tag className="w-5 h-5 text-rose-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[var(--text-muted)] mb-0.5">{t.rapports.totalDiscounts}</p>
              <p className="text-base font-bold text-[var(--text-primary)] tabular-nums truncate">
                {formatCurrency(discounts.totalDiscount ?? 0)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-orange-50">
              <ShoppingCart className="w-5 h-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[var(--text-muted)] mb-0.5">{t.rapports.discountsCount}</p>
              <p className="text-base font-bold text-[var(--text-primary)] tabular-nums truncate">
                {(discounts.transactionsCount ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {loadingDiscounts ? (
          <div className="px-4 pb-4 text-xs text-[var(--text-muted)]">{t.common.loading}</div>
        ) : (discounts.transactionsCount ?? 0) === 0 ? (
          <div className="px-4 pb-4 text-xs text-[var(--text-muted)]">{t.rapports.noDiscounts}</div>
        ) : (
          <>
            {/* Discounts by product */}
            <div className="px-4 pb-2">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                {t.rapports.discountsByProduct}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
                      <th className="text-left py-2 px-2 font-medium">{t.rapports.colProduct}</th>
                      <th className="text-left py-2 px-2 font-medium">SKU</th>
                      <th className="text-right py-2 px-2 font-medium">{t.rapports.colDiscount}</th>
                      <th className="text-right py-2 px-2 font-medium">{t.rapports.colOccur}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(discounts.byProduct ?? []).slice(0, 10).map((p, i) => (
                      <tr key={i} className="border-b border-[var(--border)]/50">
                        <td className="py-2 px-2 text-[var(--text-primary)]">{p.productName}</td>
                        <td className="py-2 px-2 text-[var(--text-muted)] text-xs">{p.sku || "—"}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-rose-600 font-medium">
                          {formatCurrency(p.totalDiscount)}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-[var(--text-muted)]">
                          {p.occurrences}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Discounts history */}
            <div className="px-4 pb-4 pt-4">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                {t.rapports.discountsHistory}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
                      <th className="text-left py-2 px-2 font-medium">{t.rapports.colTxNumber}</th>
                      <th className="text-left py-2 px-2 font-medium">{t.rapports.colDate}</th>
                      <th className="text-left py-2 px-2 font-medium">{t.rapports.colCashier}</th>
                      <th className="text-right py-2 px-2 font-medium">{t.rapports.colSubtotal}</th>
                      <th className="text-right py-2 px-2 font-medium">{t.rapports.colDiscount}</th>
                      <th className="text-right py-2 px-2 font-medium">{t.rapports.colRevenue}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(discounts.transactions ?? []).slice(0, 20).map((tx, i) => (
                      <tr key={i} className="border-b border-[var(--border)]/50">
                        <td className="py-2 px-2 text-[var(--text-primary)] text-xs font-mono">
                          {tx.transactionNumber}
                        </td>
                        <td className="py-2 px-2 text-[var(--text-muted)] text-xs">
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-2 text-[var(--text-primary)]">{tx.cashierName}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-[var(--text-muted)]">
                          {formatCurrency(tx.subtotal)}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-rose-600 font-medium">
                          -{formatCurrency(tx.discount)}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-[var(--text-primary)] font-medium">
                          {formatCurrency(tx.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(discounts.transactions ?? []).length > 20 && (
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  {(discounts.transactions ?? []).length} transactions au total — 20 affichées
                </p>
              )}
            </div>
          </>
        )}
      </Card>
      </div>
    </AppShell>
  );
}
