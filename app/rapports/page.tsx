"use client";

import { useState, useMemo, useEffect } from "react";
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
  RotateCcw,
  Gift,
  TrendingDown,
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
  useReturns,
} from "@/lib/hooks/useApi";
import { stockApi, returnsApi } from "@/lib/api";

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
  const { returns, reload: reloadReturns } = useReturns();

  // Returns & Gifts data
  const [allMovements, setAllMovements] = useState<any[]>([]);
  const [loadingRG, setLoadingRG] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingRG(true);
      try {
        const res = await stockApi.listMovements(1, 500);
        setAllMovements(res.data || []);
      } catch {
        // ignore
      } finally {
        setLoadingRG(false);
      }
    })();
    reloadReturns();
  }, []); // eslint-disable-line

  // Filter returns & gifts by date range
  const startDateObj = useMemo(() => new Date(startDate + "T00:00:00"), [startDate]);
  const endDateObj = useMemo(() => new Date(endDate + "T23:59:59"), [endDate]);

  const filteredReturns = useMemo(() => {
    return (returns || []).filter((r: any) => {
      const d = new Date(r.returnDate || r.createdAt);
      return d >= startDateObj && d <= endDateObj;
    });
  }, [returns, startDateObj, endDateObj]);

  const filteredGifts = useMemo(() => {
    return allMovements.filter((m: any) => {
      if (m.reason !== "gift_staff" && m.reason !== "gift_other") return false;
      const d = new Date(m.createdAt);
      return d >= startDateObj && d <= endDateObj;
    });
  }, [allMovements, startDateObj, endDateObj]);

  const filteredLosses = useMemo(() => {
    return allMovements.filter((m: any) => {
      if (m.type !== "adjustment") return false;
      const d = new Date(m.createdAt);
      return d >= startDateObj && d <= endDateObj;
    });
  }, [allMovements, startDateObj, endDateObj]);

  // Returns & Gifts stats
  const returnsStats = useMemo(() => {
    const totalReturns = filteredReturns.length;
    const totalRefunded = filteredReturns.reduce((s: number, r: any) => s + (r.totalRefunded || 0), 0);
    const byReason: Record<string, number> = {};
    filteredReturns.forEach((r: any) => {
      byReason[r.reason] = (byReason[r.reason] || 0) + 1;
    });
    return { totalReturns, totalRefunded, byReason };
  }, [filteredReturns]);

  const giftsStats = useMemo(() => {
    const totalGifts = filteredGifts.length;
    const staffGifts = filteredGifts.filter((m: any) => m.reason === "gift_staff").length;
    const otherGifts = filteredGifts.filter((m: any) => m.reason === "gift_other").length;
    const totalGiftValue = filteredGifts.reduce((s: number, m: any) => {
      const product = m.product;
      const cost = product?.costPrice || 0;
      return s + Math.abs(m.quantity) * cost;
    }, 0);
    return { totalGifts, staffGifts, otherGifts, totalGiftValue };
  }, [filteredGifts]);

  const lossesStats = useMemo(() => {
    const totalLosses = filteredLosses.length;
    const totalLossValue = filteredLosses.reduce((s: number, m: any) => {
      const product = m.product;
      const cost = product?.costPrice || 0;
      return s + Math.abs(m.quantity) * cost;
    }, 0);
    const byType: Record<string, number> = {};
    filteredLosses.forEach((m: any) => {
      const type = (m.reason || "other").split(":")[0];
      byType[type] = (byType[type] || 0) + 1;
    });
    return { totalLosses, totalLossValue, byType };
  }, [filteredLosses]);

  // Utiliser les vraies données de l'API, pas de mock
  const sales = salesReport ?? { totalRevenue: 0, transactionCount: 0, avgBasket: 0, byDay: [] };
  const categories = byCategory ?? [];
  const employees = byEmployee ?? [];
  const top = topProducts ?? [];
  const profitData = profit ?? { totalRevenue: 0, totalCost: 0, grossProfit: 0, marginRate: 0 };
  const inventoryData = inventory ?? { totalValue: 0, totalItems: 0, lowStock: 0, byCategory: [], productCount: 0, totalCostValue: 0, totalSaleValue: 0, potentialMargin: 0 };

  const marginPct = profitData.marginRate ?? (profitData.totalRevenue > 0 ? (profitData.grossProfit / profitData.totalRevenue) * 100 : 0);

  const kpis = [
    {
      label: t.rapports.totalRevenue || "CA total",
      value: formatCurrency(sales.totalRevenue),
      icon: DollarSign,
      delta: +8.4,
      sublabel: `${startDate} → ${endDate}`,
    },
    {
      label: t.rapports.transactions || "Transactions",
      value: (sales.transactionCount ?? 0).toLocaleString(),
      icon: ShoppingCart,
      delta: +11.7,
      sublabel: `${startDate} → ${endDate}`,
    },
    {
      label: t.rapports.avgBasket || "Panier moyen",
      value: formatCurrency(sales.avgBasket),
      icon: TrendingUp,
      delta: +3.2,
      sublabel: t.rapports.perTransaction || "per transaction",
    },
    {
      label: t.rapports.grossProfit || "Bénéfice brut",
      value: formatCurrency(profitData.grossProfit),
      icon: BarChart2,
      delta: +5.1,
      sublabel: `${t.rapports.cost || "Cost"}: ${formatCurrency(profitData.totalCost)}`,
    },
    {
      label: `${t.rapports.marginRate || "Marge"} %`,
      value: `${marginPct.toFixed(1)}%`,
      icon: Percent,
      delta: marginPct >= 30 ? +2.4 : -1.2,
      sublabel: "marge brute",
    },
  ];

  const handleExportPDF = () => {
    printSection("rapports-content");
    toast(t.rapports.printing || "Printing...", "info");
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
          { key: "Produit", label: "Produit" },
          { key: "Quantite", label: "Quantité" },
          { key: "CA", label: "Chiffre d'affaires" },
          { key: "Marge", label: "Marge" },
        ],
      );
      toast(t.rapports.exportDone || "Export downloaded", "success");
    } else {
      toast(t.rapports.noData || "No data to export", "warning");
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
                <Tooltip cursor={{ fill: "#f1f5f9" }} formatter={(v: unknown) => formatCurrency(Number(v))} />
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
                            {e.firstName?.charAt(0) || "?"}{e.lastName?.charAt(0) || ""}
                          </div>
                          <span className="font-medium text-[var(--text-primary)]">{e.firstName || "—"} {e.lastName || ""}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-secondary)]">{e.transactions ?? 0}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-[var(--text-primary)]">{formatCurrency(e.revenue)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-muted)]">
                        {formatCurrency((e.transactions ?? 0) > 0 ? (e.revenue ?? 0) / e.transactions : 0)}
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
              value: (inventoryData.productCount ?? 0).toLocaleString("fr-FR"),
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
      </div>

      {/* ========================================
          SECTION: RETOURS, PERTES & CADEAUX
          ======================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* Retours clients */}
        <Card>
          <CardHeader
            title="Retours clients"
            subtitle={`${startDate} → ${endDate}`}
            icon={<RotateCcw className="w-5 h-5 text-orange-500" />}
          />
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-orange-50 rounded-xl p-3">
                <p className="text-xs text-[var(--text-muted)]">Nombre de retours</p>
                <p className="text-xl font-bold text-orange-600">{returnsStats.totalReturns}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-xs text-[var(--text-muted)]">Total remboursé</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(returnsStats.totalRefunded)}</p>
              </div>
            </div>
            {Object.keys(returnsStats.byReason).length > 0 && (
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Par raison</p>
                <div className="space-y-1.5">
                  {Object.entries(returnsStats.byReason).map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-secondary)] capitalize">{reason}</span>
                      <Badge variant="default">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {filteredReturns.length > 0 && (
              <div className="pt-2 border-t border-[var(--border)]">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Détails</p>
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {filteredReturns.slice(0, 20).map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between text-xs py-1 border-b border-[var(--border)] last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[var(--text-primary)] truncate">
                          {r.clientName || "Client"} — {r.reason}
                        </p>
                        <p className="text-[var(--text-muted)]">
                          {new Date(r.returnDate || r.createdAt).toLocaleDateString("fr-FR")} · {r.resolution}
                        </p>
                      </div>
                      <span className="font-bold text-red-500 tabular-nums shrink-0 ml-2">{formatCurrency(r.totalRefunded)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {loadingRG && <p className="text-xs text-[var(--text-muted)]">Chargement…</p>}
            {!loadingRG && filteredReturns.length === 0 && (
              <p className="text-xs text-center text-[var(--text-muted)] py-4">Aucun retour sur cette période</p>
            )}
          </div>
        </Card>

        {/* Pertes */}
        <Card>
          <CardHeader
            title="Pertes"
            subtitle={`${startDate} → ${endDate}`}
            icon={<TrendingDown className="w-5 h-5 text-red-500" />}
          />
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-xs text-[var(--text-muted)]">Nombre de pertes</p>
                <p className="text-xl font-bold text-red-600">{lossesStats.totalLosses}</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-xs text-[var(--text-muted)]">Valeur estimée</p>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(lossesStats.totalLossValue)}</p>
              </div>
            </div>
            {Object.keys(lossesStats.byType).length > 0 && (
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Par type</p>
                <div className="space-y-1.5">
                  {Object.entries(lossesStats.byType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-secondary)] capitalize">{type}</span>
                      <Badge variant="default">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {filteredLosses.length > 0 && (
              <div className="pt-2 border-t border-[var(--border)]">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Détails</p>
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {filteredLosses.slice(0, 20).map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between text-xs py-1 border-b border-[var(--border)] last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[var(--text-primary)] truncate">{m.product?.name || "Produit"}</p>
                        <p className="text-[var(--text-muted)]">
                          {new Date(m.createdAt).toLocaleDateString("fr-FR")} · {m.reason}
                        </p>
                      </div>
                      <span className="font-bold text-red-500 tabular-nums shrink-0 ml-2">-{Math.abs(m.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!loadingRG && filteredLosses.length === 0 && (
              <p className="text-xs text-center text-[var(--text-muted)] py-4">Aucune perte sur cette période</p>
            )}
          </div>
        </Card>

        {/* Cadeaux */}
        <Card>
          <CardHeader
            title="Cadeaux"
            subtitle={`${startDate} → ${endDate}`}
            icon={<Gift className="w-5 h-5 text-purple-500" />}
          />
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-purple-50 rounded-xl p-3">
                <p className="text-xs text-[var(--text-muted)]">Total cadeaux</p>
                <p className="text-xl font-bold text-purple-600">{giftsStats.totalGifts}</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-3">
                <p className="text-xs text-[var(--text-muted)]">Valeur estimée</p>
                <p className="text-xl font-bold text-indigo-600">{formatCurrency(giftsStats.totalGiftValue)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-2 text-center">
                <p className="text-xs text-[var(--text-muted)]">Staff</p>
                <p className="text-lg font-bold text-slate-700">{giftsStats.staffGifts}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2 text-center">
                <p className="text-xs text-[var(--text-muted)]">Autres</p>
                <p className="text-lg font-bold text-slate-700">{giftsStats.otherGifts}</p>
              </div>
            </div>
            {filteredGifts.length > 0 && (
              <div className="pt-2 border-t border-[var(--border)]">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Détails</p>
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {filteredGifts.slice(0, 20).map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between text-xs py-1 border-b border-[var(--border)] last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[var(--text-primary)] truncate">{m.product?.name || "Produit"}</p>
                        <p className="text-[var(--text-muted)]">
                          {new Date(m.createdAt).toLocaleDateString("fr-FR")} · {m.reason === "gift_staff" ? "Staff" : "Autre"}
                          {m.notes ? ` · ${m.notes}` : ""}
                        </p>
                      </div>
                      <span className="font-bold text-purple-500 tabular-nums shrink-0 ml-2">-{Math.abs(m.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!loadingRG && filteredGifts.length === 0 && (
              <p className="text-xs text-center text-[var(--text-muted)] py-4">Aucun cadeau sur cette période</p>
            )}
          </div>
        </Card>
      </div>

    </AppShell>
  );
}
