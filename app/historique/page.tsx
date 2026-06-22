"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  History,
  BarChart2,
  ChevronRight,
  Download,
  Calendar,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/Toast";
import { useProducts } from "@/lib/hooks/useApi";
import { stockApi } from "@/lib/api";
import type { ApiStockMovement } from "@/lib/api";
import type { Product } from "@/lib/types";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

type MovementType = "in" | "out" | "adjustment";
type TypeFilter = "all" | MovementType;

function getCategoryDot(category: string) {
  const dots: Record<string, string> = {
    Grocery: "bg-green-400",
    Beverages: "bg-blue-400",
    Dairy: "bg-yellow-400",
    Hygiene: "bg-purple-400",
    Butchery: "bg-red-400",
    Bakery: "bg-orange-400",
    Frozen: "bg-cyan-400",
  };
  return dots[category] ?? "bg-slate-400";
}

// ── Tiny SVG sparkline for stock level over time ──────────────
function StockSparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 200;
  const h = 48;
  const pad = 4;
  const coords = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  const last = coords[coords.length - 1].split(",");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" preserveAspectRatio="none">
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r="3" fill="var(--brand)" />
    </svg>
  );
}

// ── Skeleton loaders ──────────────────────────────────────────
function ProductListSkeleton() {
  return (
    <div className="p-3 space-y-2">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="h-[58px] bg-slate-100 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

function MovementTableSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className={cn("h-10 rounded-xl animate-pulse", i % 2 === 0 ? "bg-slate-100" : "bg-slate-50")} />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function HistoriquePage() {
  const { t } = useI18n();
  const { toast } = useToast();

  // MOVEMENT_CONFIG inside component so it reads t live
  const MOVEMENT_CONFIG: Record<MovementType, { label: string; variant: "success" | "danger" | "warning"; icon: typeof ArrowDownToLine }> = {
    in:         { label: t.stocks.movementInLabel,           variant: "success", icon: ArrowDownToLine },
    out:        { label: t.stocks.movementOutLabel,          variant: "danger",  icon: ArrowUpFromLine },
    adjustment: { label: t.stocks.movementReasonAdjustment,  variant: "warning", icon: RefreshCw },
  };

  // Map raw backend reason string → translated label
  const REASON_MAP: Record<string, string> = {
    purchase:   t.stocks.movementReasonPurchase,
    sale:       t.stocks.movementReasonSale,
    refund:     t.stocks.movementReasonRefund,
    adjustment: t.stocks.movementReasonAdjustment,
    expiry:     t.stocks.movementReasonExpiry,
    damage:     t.stocks.movementReasonDamage,
    theft:      t.stocks.movementReasonTheft,
    other:      t.stocks.movementReasonOther,
  };

  function getMovementConfig(type: string) {
    return MOVEMENT_CONFIG[type as MovementType] ?? MOVEMENT_CONFIG.adjustment;
  }

  function translateReason(reason: string | null | undefined): string {
    if (!reason) return "—";
    const lower = reason.toLowerCase().trim();
    // Try exact match first
    if (REASON_MAP[lower]) return REASON_MAP[lower];
    // Try partial match
    for (const key of Object.keys(REASON_MAP)) {
      if (lower.includes(key)) return REASON_MAP[key];
    }
    return reason; // fallback: show as-is
  }

  const { products, loading: loadingProducts } = useProducts();

  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<ApiStockMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Fetch movements when product changes
  useEffect(() => {
    if (!selectedProduct) { setMovements([]); return; }
    let cancelled = false;
    setLoadingMovements(true);
    stockApi.listMovements(1, 500, selectedProduct.id)
      .then((res) => { if (!cancelled) setMovements(res.data); })
      .catch(() => { if (!cancelled) { toast(t.stocks.loadError, "warning"); setMovements([]); } })
      .finally(() => { if (!cancelled) setLoadingMovements(false); });
    return () => { cancelled = true; };
  }, [selectedProduct?.id]);

  const handleRefresh = () => {
    if (!selectedProduct) return;
    setLoadingMovements(true);
    stockApi.listMovements(1, 500, selectedProduct.id)
      .then((res) => setMovements(res.data))
      .catch(() => toast(t.stocks.reloadError, "warning"))
      .finally(() => setLoadingMovements(false));
  };

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  // Filtered movements (type + date range)
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (typeFilter !== "all" && m.type !== typeFilter) return false;
      if (dateFrom && new Date(m.createdAt) < new Date(dateFrom)) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59);
        if (new Date(m.createdAt) > end) return false;
      }
      return true;
    });
  }, [movements, typeFilter, dateFrom, dateTo]);

  // Summary totals (from ALL movements, not filtered)
  const totalIn  = movements.filter((m) => m.type === "in").reduce((s, m) => s + m.quantity, 0);
  const totalOut = movements.filter((m) => m.type === "out").reduce((s, m) => s + m.quantity, 0);
  const totalAdj = movements.filter((m) => m.type === "adjustment").reduce((s, m) => s + m.quantity, 0);
  const netChange = totalIn - totalOut + totalAdj;

  // Running balance for sparkline — chronological order
  const sparklinePoints = useMemo(() => {
    if (!movements.length) return [];
    const sorted = [...movements].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let balance = 0;
    return sorted.map((m) => {
      if (m.type === "in") balance += m.quantity;
      else if (m.type === "out") balance -= m.quantity;
      else balance += m.quantity; // adjustment (signed)
      return balance;
    });
  }, [movements]);

  // Running balance per row (newest-first display → compute from sorted asc then reverse)
  const movementsWithBalance = useMemo(() => {
    const sorted = [...filteredMovements].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let balance = 0;
    const withBal = sorted.map((m) => {
      if (m.type === "in") balance += m.quantity;
      else if (m.type === "out") balance -= m.quantity;
      else balance += m.quantity;
      return { ...m, balance };
    });
    return withBal.reverse(); // newest first
  }, [filteredMovements]);

  // Margin calculation
  const marginPct = selectedProduct && (selectedProduct.price ?? 0) > 0
    ? ((( selectedProduct.price ?? 0) - (selectedProduct.costPrice ?? 0)) / (selectedProduct.price ?? 1)) * 100
    : 0;

  // CSV Export
  const handleExportCSV = () => {
    if (!movementsWithBalance.length || !selectedProduct) return;
    const header = ["Date", "Type", "Quantity", "Balance", "Reason", "Reference", "Note"];
    const rows = movementsWithBalance.map((m) => [
      formatDate(m.createdAt),
      m.type,
      m.type === "in" ? `+${m.quantity}` : m.type === "out" ? `-${m.quantity}` : m.quantity,
      m.balance,
      translateReason(m.reason),
      m.reference ?? "",
      (m.notes ?? "").replace(/,/g, ";"),
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-history-${selectedProduct.sku}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell title={t.stocks.historyPageTitle} subtitle={t.stocks.historyPageSubtitle}>
      <div className="flex flex-col lg:flex-row gap-4" style={{ minHeight: "calc(100vh - 120px)" }}>

        {/* ── LEFT: Product selector ── */}
        <div className="w-full lg:w-1/3 flex flex-col">
          <Card padding="none" className="flex flex-col flex-1">
            <div className="p-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2 focus-within:border-[var(--brand)] transition-colors">
                <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`${t.common.search} ${t.stocks.searchProductPh}`}
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">×</button>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-2 px-0.5">
                {filteredProducts.length} {t.common.product}{filteredProducts.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="overflow-y-auto flex-1" style={{ maxHeight: "calc(100vh - 220px)" }}>
              {loadingProducts ? (
                <ProductListSkeleton />
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <Package className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-sm text-[var(--text-muted)]">{t.stocks.noProductFound}</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProduct?.id === product.id;
                    return (
                      <button
                        key={product.id}
                        onClick={() => { setSelectedProduct(product); setTypeFilter("all"); setDateFrom(""); setDateTo(""); }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors group",
                          isSelected ? "bg-[var(--brand-light)]" : "hover:bg-slate-50"
                        )}
                      >
                        <div className="relative shrink-0">
                          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", isSelected ? "bg-white/70" : "bg-slate-100")}>
                            <Package className={cn("w-4 h-4", isSelected ? "text-[var(--brand)]" : "text-slate-400")} />
                          </div>
                          <span className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white", getCategoryDot(product.category))} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-medium leading-tight truncate", isSelected ? "text-[var(--brand)]" : "text-[var(--text-primary)]")}>
                            {product.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-[var(--text-muted)] font-mono">{product.sku}</span>
                            <span className="text-[var(--border)] text-[11px]">·</span>
                            <span className="text-[11px] text-[var(--text-muted)]">{product.stock} {product.unit}</span>
                          </div>
                        </div>
                        <ChevronRight className={cn("w-4 h-4 shrink-0 transition-colors", isSelected ? "text-[var(--brand)]" : "text-slate-300 group-hover:text-slate-400")} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── RIGHT: History panel ── */}
        <div className="w-full lg:w-2/3 flex flex-col gap-4">
          {!selectedProduct ? (
            <Card className="flex-1 flex flex-col items-center justify-center py-24">
              <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-5">
                <History className="w-10 h-10 text-slate-300" />
              </div>
              <p className="text-base font-semibold text-[var(--text-primary)]">{t.stocks.selectProduct}</p>
              <p className="text-sm text-[var(--text-muted)] mt-1.5 text-center max-w-xs">{t.stocks.selectProductDesc}</p>
              <div className="mt-6 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5"><ArrowDownToLine className="w-3.5 h-3.5 text-emerald-500" /> {t.stocks.movementIn}</span>
                <span className="flex items-center gap-1.5"><ArrowUpFromLine className="w-3.5 h-3.5 text-red-500" /> {t.stocks.movementOut}</span>
                <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 text-amber-500" /> {t.stocks.movementAdj}</span>
              </div>
            </Card>
          ) : (
            <>
              {/* ── Product header + sparkline ── */}
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-[var(--brand-light)] rounded-xl flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6 text-[var(--brand)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold text-[var(--text-primary)] leading-tight truncate">{selectedProduct.name}</h2>
                      <div className="flex items-center flex-wrap gap-2 mt-1">
                        <span className="text-xs text-[var(--text-muted)] font-mono">{selectedProduct.sku}</span>
                        <span className="text-[var(--border)] text-xs">·</span>
                        <span className="text-xs text-[var(--text-muted)]">{selectedProduct.category}</span>
                        <Badge
                          variant={selectedProduct.stock === 0 ? "danger" : selectedProduct.stock <= selectedProduct.minStock ? "warning" : "success"}
                          size="sm"
                        >
                          {selectedProduct.stock} {selectedProduct.unit}
                        </Badge>
                      </div>
                      {/* Sparkline */}
                      {sparklinePoints.length >= 2 && (
                        <div className="mt-3 w-full max-w-[200px]">
                          <p className="text-[10px] text-[var(--text-muted)] mb-1 uppercase tracking-wide font-semibold">{t.stocks.movementHistory}</p>
                          <StockSparkline points={sparklinePoints} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial KPIs */}
                  <div className="flex items-center gap-5 shrink-0 flex-wrap">
                    <div className="text-right">
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide font-semibold">{t.stocks.sellPrice}</p>
                      <p className="text-sm font-bold text-[var(--brand)] tabular-nums mt-0.5">{formatCurrency(selectedProduct.price)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide font-semibold">{t.stocks.costPriceLabel}</p>
                      <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums mt-0.5">{formatCurrency(selectedProduct.costPrice)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide font-semibold">{t.stocks.marginRate}</p>
                      <p className={cn("text-sm font-bold tabular-nums mt-0.5", marginPct >= 20 ? "text-emerald-600" : "text-amber-600")}>
                        {marginPct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* ── 3 summary KPI cards ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: t.stocks.totalIn,  value: totalIn,  sign: "+", Icon: ArrowDownToLine, iconBg: "bg-[var(--success-light)]", iconColor: "text-emerald-600", valColor: "text-emerald-600" },
                  { label: t.stocks.totalOut, value: totalOut, sign: "-", Icon: ArrowUpFromLine, iconBg: "bg-[var(--danger-light)]",  iconColor: "text-red-500",     valColor: "text-red-500" },
                  {
                    label: t.stocks.netChange, value: netChange, sign: netChange >= 0 ? "+" : "",
                    Icon: netChange >= 0 ? TrendingUp : TrendingDown,
                    iconBg: netChange >= 0 ? "bg-[var(--brand-light)]" : "bg-amber-50",
                    iconColor: netChange >= 0 ? "text-[var(--brand)]" : "text-amber-600",
                    valColor: netChange >= 0 ? "text-[var(--brand)]" : "text-amber-600",
                  },
                ].map(({ label, value, sign, Icon, iconBg, iconColor, valColor }) => (
                  <div key={label} className="bg-white border border-[var(--border)] rounded-2xl p-4 flex items-center gap-3 shadow-[var(--shadow-sm)]">
                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
                      <Icon className={cn("w-5 h-5", iconColor)} />
                    </div>
                    <div>
                      <p className={cn("text-2xl font-bold tabular-nums leading-none", valColor)}>{sign}{Math.abs(value)}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Movement table with filters ── */}
              <Card padding="none" className="flex-1">
                {/* Header */}
                <div className="px-4 py-3.5 border-b border-[var(--border)]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">{t.stocks.movementHistory}</h3>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {loadingMovements ? t.common.loading : `${filteredMovements.length} / ${movements.length}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Export CSV */}
                      <button
                        onClick={handleExportCSV}
                        disabled={!filteredMovements.length}
                        title="Export CSV"
                        className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-30 px-2 py-1 rounded-lg hover:bg-slate-100"
                      >
                        <Download className="w-3.5 h-3.5" /> CSV
                      </button>
                      {/* Refresh */}
                      <button
                        onClick={handleRefresh}
                        disabled={loadingMovements}
                        className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 px-2 py-1 rounded-lg hover:bg-slate-100"
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", loadingMovements && "animate-spin")} />
                        {t.common.refresh}
                      </button>
                    </div>
                  </div>

                  {/* Filters row */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {/* Type tabs */}
                    <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                      {([
                        { key: "all",        label: t.common.all },
                        { key: "in",         label: t.stocks.movementInLabel },
                        { key: "out",        label: t.stocks.movementOutLabel },
                        { key: "adjustment", label: t.stocks.movementReasonAdjustment },
                      ] as { key: TypeFilter; label: string }[]).map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setTypeFilter(key)}
                          className={cn(
                            "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all",
                            typeFilter === key ? "bg-white text-[var(--brand)] shadow-sm" : "text-slate-500 hover:text-slate-700"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Date range */}
                    <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="border border-[var(--border)] rounded-lg px-2 py-1 text-[11px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)] bg-white"
                      />
                      <span>→</span>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="border border-[var(--border)] rounded-lg px-2 py-1 text-[11px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)] bg-white"
                      />
                      {(dateFrom || dateTo) && (
                        <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-red-400 hover:text-red-600 ml-1">×</button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Table content */}
                {loadingMovements ? (
                  <MovementTableSkeleton />
                ) : movementsWithBalance.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                      <BarChart2 className="w-7 h-7 text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{t.stocks.noHistory}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{t.stocks.noMovementsDesc}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-slate-50/60">
                          {[
                            { label: t.common.date,       align: "left" },
                            { label: t.common.type,       align: "left" },
                            { label: t.common.quantity,   align: "right" },
                            { label: "Balance",           align: "right" },
                            { label: t.common.reason,     align: "left" },
                            { label: t.stocks.reference,  align: "left" },
                            { label: t.common.note,       align: "left" },
                          ].map(({ label, align }) => (
                            <th key={label} className={cn("px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide", align === "right" ? "text-right" : "text-left")}>
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {movementsWithBalance.map((movement, i) => {
                          const config = getMovementConfig(movement.type);
                          const TypeIcon = config.icon;
                          const isIn  = movement.type === "in";
                          const isOut = movement.type === "out";
                          return (
                            <tr
                              key={movement.id}
                              className={cn(
                                "border-b border-[var(--border-subtle)] last:border-0 hover:bg-slate-50/60 transition-colors",
                                i % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                              )}
                            >
                              {/* Date */}
                              <td className="px-4 py-3 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                                {formatDate(movement.createdAt)}
                              </td>
                              {/* Type */}
                              <td className="px-4 py-3">
                                <Badge variant={config.variant} size="sm">
                                  <TypeIcon className="w-3 h-3 mr-1 inline-block" />
                                  {config.label}
                                </Badge>
                              </td>
                              {/* Quantity */}
                              <td className={cn("px-4 py-3 text-sm font-bold text-right tabular-nums", isIn ? "text-emerald-600" : isOut ? "text-red-500" : "text-amber-600")}>
                                {isIn ? "+" : isOut ? "−" : ""}{movement.quantity}
                              </td>
                              {/* Running balance */}
                              <td className="px-4 py-3 text-sm font-semibold text-right tabular-nums text-[var(--text-secondary)]">
                                {movement.balance}
                              </td>
                              {/* Reason (translated) */}
                              <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                                {translateReason(movement.reason)}
                              </td>
                              {/* Reference */}
                              <td className="px-4 py-3 text-xs text-[var(--text-muted)] font-mono">
                                {movement.reference || <span className="not-italic">—</span>}
                              </td>
                              {/* Notes */}
                              <td className="px-4 py-3 text-xs text-[var(--text-muted)] max-w-[200px]">
                                <span className="block truncate" title={movement.notes ?? ""}>{movement.notes || "—"}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
