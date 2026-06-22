"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  X,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/Toast";
import {
  useProfitLoss,
  useMonthlySummary,
  useExpenseBreakdown,
  useExpenses,
  useCreateExpense,
} from "@/lib/hooks/useApi";
import type { ApiExpense } from "@/lib/api";

// ---- Fallback mock data ----
const mockMonthlyData = [
  { month: "Nov", revenue: 28_400_000, expenses: 19_800_000, profit: 8_600_000 },
  { month: "Dec", revenue: 35_200_000, expenses: 23_100_000, profit: 12_100_000 },
  { month: "Jan", revenue: 29_100_000, expenses: 20_500_000, profit: 8_600_000 },
  { month: "Feb", revenue: 27_800_000, expenses: 19_200_000, profit: 8_600_000 },
  { month: "Mar", revenue: 31_500_000, expenses: 21_800_000, profit: 9_700_000 },
  { month: "Apr", revenue: 34_100_000, expenses: 22_900_000, profit: 11_200_000 },
];

const mockExpenseBreakdown = [
  { category: "supplies", amount: 14_200_000, percentage: 62 },
  { category: "salaries", amount: 4_800_000, percentage: 21 },
  { category: "rent", amount: 1_900_000, percentage: 8 },
  { category: "utilities", amount: 850_000, percentage: 4 },
  { category: "other", amount: 420_000, percentage: 2 },
  { category: "other", amount: 730_000, percentage: 3 },
];

const mockExpenses: ApiExpense[] = [
  { id: "EXP-001", date: "2026-04-28", category: "supplies", description: "SABC invoice — beer delivery", amount: 340_000, paymentMethod: "transfer", supplier: "SABC", status: "paid" },
  { id: "EXP-002", date: "2026-04-27", category: "salaries", description: "Salaries — bi-weekly", amount: 2_400_000, paymentMethod: "transfer", status: "paid" },
  { id: "EXP-003", date: "2026-04-26", category: "supplies", description: "Unilever CMR invoice", amount: 185_000, paymentMethod: "cash", supplier: "Unilever", status: "paid" },
  { id: "EXP-004", date: "2026-04-25", category: "rent", description: "Monthly rent", amount: 950_000, paymentMethod: "transfer", supplier: "Landlord", status: "paid" },
  { id: "EXP-005", date: "2026-04-20", category: "utilities", description: "ENEO invoice — electricity", amount: 320_000, paymentMethod: "transfer", supplier: "ENEO", status: "paid" },
];

const PIE_COLORS = ["#1a56db", "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#94a3b8"];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ---- Helpers ----
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultStartDate(): string {
  const now = new Date();
  return toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function defaultEndDate(): string {
  return toISODate(new Date());
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

// ---- Tooltip ----
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl shadow-[var(--shadow)] px-3 py-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-[var(--text-primary)] mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span className="text-[var(--text-muted)]">{p.name === "revenue" ? "Revenue" : p.name === "expenses" ? "Expenses" : "Profit"}</span>
          <span className="font-medium tabular-nums">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ---- Add Expense Modal ----
interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { category: string; description: string; amount: number; paymentMethod: string; supplier?: string }) => void;
  submitting: boolean;
}

function AddExpenseModal({ open, onClose, onSubmit, submitting }: AddExpenseModalProps) {
  const { t } = useI18n();
  const [category, setCategory] = useState("supplies");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [supplier, setSupplier] = useState("");

  const categoryLabels: Record<string, string> = {
    rent: t.comptabilite.catRent,
    utilities: t.comptabilite.catUtilities,
    salaries: t.comptabilite.catSalaries,
    supplies: t.comptabilite.catSupplies,
    transport: t.comptabilite.catTransport,
    marketing: t.comptabilite.catMarketing,
    other: t.comptabilite.catOther,
  };

  const paymentMethodLabels: Record<string, string> = {
    cash: t.comptabilite.pmCash,
    transfer: t.comptabilite.pmTransfer,
    card: t.comptabilite.pmCard,
    mobile: t.comptabilite.pmMobile,
    check: t.comptabilite.pmCheck,
  };

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!description.trim() || !amt || amt <= 0) return;
    onSubmit({
      category,
      description: description.trim(),
      amount: amt,
      paymentMethod,
      supplier: supplier.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t.comptabilite.addExpense}</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">{t.comptabilite.expenseCategory}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            >
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">{t.comptabilite.expenseDescription}</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.comptabilite.expenseDescriptionPh}
              className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">{t.comptabilite.expenseAmount}</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="1"
              className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">{t.comptabilite.paymentMethod}</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            >
              {Object.entries(paymentMethodLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">{t.comptabilite.supplierOptional}</label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder={t.comptabilite.supplierPh}
              className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={submitting}>
              {submitting ? t.common.saving : t.common.save}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function ComptabilitePage() {
  const { t } = useI18n();
  const { toast } = useToast();

  // Date range state
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(defaultEndDate());
  const currentYear = new Date().getFullYear();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);

  // Data hooks
  const { data: profitLossData, loading: plLoading } = useProfitLoss(startDate, endDate);
  const { data: monthlyDataRaw, loading: monthlyLoading } = useMonthlySummary(currentYear);
  const { data: breakdownData, loading: breakdownLoading } = useExpenseBreakdown(startDate, endDate);
  const { data: expensesData, loading: expensesLoading } = useExpenses(startDate, endDate);
  const { create: createExpense, creating: expenseCreating } = useCreateExpense();

  // Label resolvers (i18n)
  const categoryLabels: Record<string, string> = {
    rent: t.comptabilite.catRent,
    utilities: t.comptabilite.catUtilities,
    salaries: t.comptabilite.catSalaries,
    supplies: t.comptabilite.catSupplies,
    transport: t.comptabilite.catTransport,
    marketing: t.comptabilite.catMarketing,
    other: t.comptabilite.catOther,
  };
  const paymentMethodLabels: Record<string, string> = {
    cash: t.comptabilite.pmCash,
    transfer: t.comptabilite.pmTransfer,
    card: t.comptabilite.pmCard,
    mobile: t.comptabilite.pmMobile,
    check: t.comptabilite.pmCheck,
  };
  const categoryLabel = (key: string) => categoryLabels[key] ?? key;
  const paymentMethodLabel = (key: string) => paymentMethodLabels[key] ?? key;

  // Derived data with fallbacks
  const pl = profitLossData ?? { totalRevenue: 34_100_000, totalExpenses: 22_900_000, netProfit: 11_200_000, expenseBreakdown: [] };

  const monthlyData = useMemo(() => {
    if (monthlyDataRaw && monthlyDataRaw.length > 0) {
      return monthlyDataRaw.map((m) => ({ month: MONTH_NAMES[m.month - 1] ?? String(m.month), revenue: m.revenue, expenses: m.expenses, profit: m.profit }));
    }
    return mockMonthlyData;
  }, [monthlyDataRaw]);

  const expenseBreakdown = useMemo(() => {
    if (breakdownData && breakdownData.length > 0) {
      return breakdownData.map((b) => ({ name: categoryLabel(b.category), value: b.amount, percentage: b.percentage }));
    }
    if (profitLossData?.expenseBreakdown && profitLossData.expenseBreakdown.length > 0) {
      return profitLossData.expenseBreakdown.map((b) => ({ name: categoryLabel(b.category), value: b.amount, percentage: 0 }));
    }
    return mockExpenseBreakdown.map((b) => ({ name: categoryLabel(b.category), value: b.amount, percentage: b.percentage }));
  }, [breakdownData, profitLossData, t]);

  const expenses = useMemo(() => {
    return expensesData && expensesData.length > 0 ? expensesData : mockExpenses;
  }, [expensesData]);

  // KPI calculations
  const totalRevenue = pl.totalRevenue;
  const totalExpenses = pl.totalExpenses;
  const netProfit = pl.netProfit;
  const marginRate = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  const currentMonth = monthlyData[monthlyData.length - 1] ?? { revenue: 0, expenses: 0, profit: 0 };
  const prevMonth = monthlyData[monthlyData.length - 2] ?? currentMonth;
  const revenueDelta = prevMonth.revenue > 0 ? ((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100 : 0;
  const profitDelta = prevMonth.profit > 0 ? ((currentMonth.profit - prevMonth.profit) / prevMonth.profit) * 100 : 0;

  const handleCreateExpense = async (data: { category: string; description: string; amount: number; paymentMethod: string; supplier?: string }) => {
    try {
      await createExpense(data);
      toast(t.comptabilite.expenseSaved, "success");
      setModalOpen(false);
      // Reload by toggling dates (hooks will refetch on dependency change)
      // Force a refetch by re-setting the same dates
      setStartDate((s) => s);
      setEndDate((e) => e);
    } catch (e: any) {
      toast(e?.message ?? t.comptabilite.expenseError, "warning");
    }
  };

  return (
    <AppShell title={t.comptabilite.title} subtitle={t.comptabilite.subtitle}>
      {/* Date Range Selector */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">{t.comptabilite.startDate}</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-[var(--border)] rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Date de fin</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-[var(--border)] rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>
        {(plLoading || monthlyLoading || breakdownLoading || expensesLoading) && (
          <span className="text-xs text-[var(--text-muted)] pb-2.5">Loading...</span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          {
            label: "Revenus totaux",
            value: totalRevenue,
            delta: revenueDelta,
            icon: <TrendingUp className="w-5 h-5 text-[var(--brand)]" />,
            iconBg: "bg-[var(--brand-light)]",
          },
          {
            label: "Total expenses",
            value: totalExpenses,
            delta: 0,
            icon: <TrendingDown className="w-5 h-5 text-red-500" />,
            iconBg: "bg-[var(--danger-light)]",
          },
          {
            label: "Profit net",
            value: netProfit,
            delta: profitDelta,
            icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
            iconBg: "bg-[var(--success-light)]",
          },
          {
            label: "Marge nette %",
            value: marginRate,
            delta: 0,
            isPercent: true,
            icon: <TrendingUp className="w-5 h-5 text-indigo-600" />,
            iconBg: "bg-[var(--info-light)]",
          },
        ].map(({ label, value, delta, icon, iconBg, isPercent }) => (
          <div key={label} className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-[var(--shadow-sm)]">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>{icon}</div>
              {delta !== 0 && (
                <div className={cn("flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg", delta > 0 ? "bg-[var(--success-light)] text-emerald-700" : "bg-[var(--danger-light)] text-red-600")}>
                  {delta > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(delta ?? 0).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums leading-none mb-1">
              {isPercent ? `${value}%` : formatCurrency(value)}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-5">
        <Card className="lg:col-span-3" padding="md">
          <CardHeader title={t.comptabilite.revenueChart} subtitle={`${currentYear}`} />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1a56db" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#1a56db" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#1a56db" strokeWidth={2} fill="url(#revGrad)" dot={false} />
              <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="none" dot={false} />
              <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fill="url(#profGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="lg:col-span-2" padding="md">
          <CardHeader title={t.comptabilite.expenseBreakdown} subtitle={`${startDate} → ${endDate}`} />
          <div className="flex items-center gap-4">
            <PieChart width={120} height={120}>
              <Pie data={expenseBreakdown} cx={55} cy={55} innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value">
                {expenseBreakdown.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
            <div className="flex-1 space-y-1.5">
              {expenseBreakdown.slice(0, 6).map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="flex-1 text-[var(--text-secondary)] truncate">{e.name}</span>
                  <span className="font-medium tabular-nums text-[var(--text-primary)]">{formatCurrency(e.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Expenses Table */}
      <Card padding="md">
        <CardHeader
          title="Recent expenses"
          subtitle={`${expenses.length} entries`}
          action={
            <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add expense
            </Button>
          }
        />
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium">Fournisseur</th>
                <th className="px-5 py-3 font-medium">Paiement</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
                <th className="px-5 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-subtle)] transition-colors">
                  <td className="px-5 py-3 text-[var(--text-secondary)] whitespace-nowrap">{formatDate(e.date)}</td>
                  <td className="px-5 py-3">
                    <Badge variant="neutral">{categoryLabels[e.category] ?? e.category}</Badge>
                  </td>
                  <td className="px-5 py-3 text-[var(--text-primary)]">{e.description}</td>
                  <td className="px-5 py-3 text-[var(--text-muted)]">{e.supplier ?? "—"}</td>
                  <td className="px-5 py-3 text-[var(--text-muted)]">{paymentMethodLabels[e.paymentMethod] ?? e.paymentMethod}</td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums text-[var(--text-primary)] whitespace-nowrap">
                    {formatCurrency(e.amount)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={e.status === "paid" ? "success" : "warning"}>
                      {e.status === "paid" ? "Paid" : e.status === "pending" ? "Pending" : e.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-[var(--text-muted)]">
                    No expenses in this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Expense Modal */}
      <AddExpenseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateExpense}
        submitting={expenseCreating}
      />
    </AppShell>
  );
}
