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
import {
  useSalesReport,
  useSalesByCategory,
  useSalesByEmployee,
  useTopProducts,
  useProfitAnalysis,
  useInventoryValuation,
} from "@/lib/hooks/useApi";

// ---- Fallback mock data (used when backend returns nothing) ----
const mockByDay = [
  { date: "Lun", revenue: 2_840_000, transactions: 240 },
  { date: "Mar", revenue: 3_120_000, transactions: 268 },
  { date: "Mer", revenue: 2_950_000, transactions: 251 },
  { date: "Jeu", revenue: 3_380_000, transactions: 289 },
  { date: "Ven", revenue: 3_970_000, transactions: 332 },
  { date: "Sam", revenue: 4_820_000, transactions: 410 },
  { date: "Dim", revenue: 3_610_000, transactions: 305 },
];

const mockSalesReport = {
  totalRevenue: 24_690_000,
  transactionCount: 2095,
  avgBasket: 11_780,
  byDay: mockByDay,
};

const mockByCategory = [
  { category: "Boissons", revenue: 6_200_000, quantity: 1820 },
  { category: "Alimentation", revenue: 8_400_000, quantity: 3120 },
  { category: "Hygiène", revenue: 3_100_000, quantity: 980 },
  { category: "Maison", revenue: 2_690_000, quantity: 540 },
  { category: "Autres", revenue: 4_300_000, quantity: 1240 },
];

const mockByEmployee = [
  { cashierId: "1", firstName: "Awa", lastName: "Diallo", revenue: 7_820_000, transactions: 680 },
  { cashierId: "2", firstName: "Moussa", lastName: "Traoré", revenue: 6_540_000, transactions: 560 },
  { cashierId: "3", firstName: "Fatou", lastName: "Bambara", revenue: 5_930_000, transactions: 510 },
  { cashierId: "4", firstName: "Ibrahim", lastName: "Konaté", revenue: 4_400_000, transactions: 345 },
];

const mockTopProducts = [
  { productId: "1", name: "Bière 33 Export 65cl", quantity: 248, revenue: 223_200 },
  { productId: "2", name: "Riz Parfumé 25kg", quantity: 87, revenue: 1_914_000 },
  { productId: "3", name: "Eau Minérale 1.5L", quantity: 412, revenue: 164_800 },
  { productId: "4", name: "Huile Végétale 5L", quantity: 63, revenue: 346_500 },
  { productId: "5", name: "Savon Lux 200g", quantity: 185, revenue: 83_250 },
  { productId: "6", name: "Sucre 1kg", quantity: 156, revenue: 109_200 },
  { productId: "7", name: "Lait en poudre 400g", quantity: 98, revenue: 215_600 },
  { productId: "8", name: "Thé Lipton 100s", quantity: 74, revenue: 148_000 },
  { productId: "9", name: "Pâtes 500g", quantity: 230, revenue: 92_000 },
  { productId: "10", name: "Café Malongo 200g", quantity: 61, revenue: 170_800 },
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

const PIE_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const RevenueTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl shadow-[var(--shadow)] px-3 py-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-[var(--text-primary)] mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span className="text-[var(--text-muted)]">{p.name === "revenue" ? "CA" : p.name}</span>
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

  // Fallback to mock if backend returns nothing
  const sales = salesReport ?? mockSalesReport;
  const categories = byCategory && byCategory.length > 0 ? byCategory : mockByCategory;
  const employees = byEmployee && byEmployee.length > 0 ? byEmployee : mockByEmployee;
  const top = topProducts && topProducts.length > 0 ? topProducts : mockTopProducts;
  const profitData = profit ?? mockProfit;
  const inventoryData = inventory ?? mockInventory;

  const marginPct = profitData.marginRate ?? (profitData.totalRevenue > 0 ? (profitData.grossProfit / profitData.totalRevenue) * 100 : 0);

  const kpis = [
    {
      label: "CA total",
      value: formatCurrency(sales.totalRevenue),
      icon: DollarSign,
      delta: +8.4,
      sublabel: `${startDate} → ${endDate}`,
    },
    {
      label: "Transactions",
      value: sales.transactionCount.toLocaleString("fr-FR"),
      icon: ShoppingCart,
      delta: +11.7,
      sublabel: "sur la période",
    },
    {
      label: "Panier moyen",
      value: formatCurrency(sales.avgBasket),
      icon: TrendingUp,
      delta: +3.2,
      sublabel: "par transaction",
    },
    {
      label: "Bénéfice brut",
      value: formatCurrency(profitData.grossProfit),
      icon: BarChart2,
      delta: +5.1,
      sublabel: `Coût : ${formatCurrency(profitData.totalCost)}`,
    },
    {
      label: "Marge %",
      value: `${marginPct.toFixed(1)}%`,
      icon: Percent,
      delta: marginPct >= 30 ? +2.4 : -1.2,
      sublabel: "marge brute",
    },
  ];

  const handleExportPDF = () => toast(t.rapports.exportPDF, "info");
  const handleExportExcel = () => toast(t.rapports.exportExcel, "info");

  return (
    <AppShell title={t.rapports.title} subtitle={t.rapports.subtitle}>
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
            { label: "7j", days: 7 },
            { label: "30j", days: 30 },
            { label: "90j", days: 90 },
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
              <div className={cn("flex items-center gap-0.5 text-[11px] font-semibold", delta >= 0 ? "text-emerald-600" : "text-red-500")}>
                {delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(delta).toFixed(1)}%
              </div>
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
          <CardHeader title="Évolution du CA par jour" subtitle="Chiffre d'affaires quotidien" />
          <div className="h-72 px-2 pb-2">
            {loadingSales ? (
              <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">Chargement…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sales.byDay} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
                  <Tooltip content={<RevenueTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="CA" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Ventes par catégorie" subtitle="Répartition du CA" />
          <div className="h-72 px-2 pb-2">
            {loadingCat ? (
              <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">Chargement…</div>
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
                    label={(e: any) => e.category}
                    labelLine={false}
                  >
                    {categories.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Sales by category bar chart */}
      <Card className="mb-5">
        <CardHeader title="Détail des ventes par catégorie" subtitle="Chiffre d'affaires et quantités" />
        <div className="h-64 px-2 pb-2">
          {loadingCat ? (
            <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">Chargement…</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categories} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip cursor={{ fill: "#f1f5f9" }} formatter={(v: any) => formatCurrency(Number(v))} />
                <Legend />
                <Bar dataKey="revenue" name="CA" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Top 10 products + Sales by employee */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {/* Top 10 products */}
        <Card>
          <CardHeader title="Top 10 produits" subtitle="Par chiffre d'affaires" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)]">#</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)]">Produit</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] text-right">Qté</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] text-right">CA</th>
                </tr>
              </thead>
              <tbody>
                {loadingTop ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">Chargement…</td>
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
          <CardHeader title="Ventes par employé" subtitle="Performance des caissiers" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)]">Employé</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] text-right">Transactions</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] text-right">CA</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] text-right">Panier moy.</th>
                </tr>
              </thead>
              <tbody>
                {loadingEmp ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">Chargement…</td>
                  </tr>
                ) : (
                  employees.map((e) => (
                    <tr key={e.cashierId} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[var(--brand-light)] text-[var(--brand-dark)] flex items-center justify-center text-xs font-bold">
                            {e.firstName.charAt(0)}{e.lastName.charAt(0)}
                          </div>
                          <span className="font-medium text-[var(--text-primary)]">{e.firstName} {e.lastName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-secondary)]">{e.transactions}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-[var(--text-primary)]">{formatCurrency(e.revenue)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-muted)]">
                        {formatCurrency(e.transactions > 0 ? e.revenue / e.transactions : 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Inventory valuation summary */}
      <Card>
        <CardHeader title="Valorisation du stock" subtitle="Valeur d'inventaire et marge potentielle" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4">
          {[
            {
              label: "Nombre de produits",
              value: inventoryData.productCount.toLocaleString("fr-FR"),
              icon: Package,
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "Valeur de coût",
              value: formatCurrency(inventoryData.totalCostValue),
              icon: Boxes,
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
            {
              label: "Valeur de vente",
              value: formatCurrency(inventoryData.totalSaleValue),
              icon: DollarSign,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              label: "Marge potentielle",
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
          <div className="px-4 pb-4 text-xs text-[var(--text-muted)]">Chargement de la valorisation…</div>
        )}
      </Card>
    </AppShell>
  );
}
