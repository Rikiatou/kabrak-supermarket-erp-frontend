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
  RotateCcw,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/Toast";
import { useServerProductSearch, useRecentTransactions } from "@/lib/hooks/useApi";
import { stockApi, returnsApi } from "@/lib/api";
import type { ApiStockMovement, ApiTransaction, ApiTransactionItem } from "@/lib/api";
import type { Product } from "@/lib/types";
import { formatCurrency, formatDate, formatTime, cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/context";
import { ShoppingCart, Wallet, Clock, User } from "lucide-react";

type MovementType = "in" | "out" | "adjustment";
type TypeFilter = "all" | MovementType;

// Couleurs générées dynamiquement par hash du nom de catégorie
const CATEGORY_COLORS = [
  "bg-green-400", "bg-blue-400", "bg-yellow-400", "bg-purple-400",
  "bg-red-400", "bg-orange-400", "bg-cyan-400", "bg-pink-400",
  "bg-indigo-400", "bg-teal-400", "bg-amber-400", "bg-lime-400",
  "bg-emerald-400", "bg-fuchsia-400", "bg-violet-400", "bg-rose-400",
];

function getCategoryDot(category: string) {
  if (!category) return "bg-slate-400";
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash << 5) - hash + category.charCodeAt(i);
    hash |= 0;
  }
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"stock" | "sales">("stock");

  // Cashier voit seulement SES ventes; managers/boss voient tout
  const isCashier = user?.role === "cashier";
  const cashierIdFilter = isCashier ? (user?.id ?? undefined) : undefined;

  // Filtre par date — par défaut: 30 derniers jours
  const [salesStartDate, setSalesStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [salesEndDate, setSalesEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { transactions: mySales, loading: loadingSales } = useRecentTransactions(200, cashierIdFilter, salesStartDate, salesEndDate);

  // Return modal state
  const [returnTx, setReturnTx] = useState<ApiTransaction | null>(null);
  const [returnReason, setReturnReason] = useState("defect");
  const [returnResolution, setReturnResolution] = useState("refund");
  const [returnRefundMethod, setReturnRefundMethod] = useState("cash");
  const [returnNote, setReturnNote] = useState("");
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [returnExchangeIds, setReturnExchangeIds] = useState<Record<string, string>>({});
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Sale detail modal state
  const [detailTx, setDetailTx] = useState<ApiTransaction | null>(null);

  const openReturnModal = (tx: ApiTransaction) => {
    setReturnTx(tx);
    setReturnReason("defect");
    setReturnResolution("refund");
    setReturnRefundMethod("cash");
    setReturnNote("");
    const qtys: Record<string, number> = {};
    tx.items?.forEach((it) => { qtys[it.productId] = 0; });
    setReturnQtys(qtys);
    setReturnExchangeIds({});
  };

  const handleSubmitReturn = async () => {
    if (!returnTx) return;
    const itemsToReturn = (returnTx.items || []).filter((it) => (returnQtys[it.productId] || 0) > 0);
    if (itemsToReturn.length === 0) {
      toast("Select at least one item to return", "warning");
      return;
    }
    setSubmittingReturn(true);
    try {
      await returnsApi.create({
        originalTransactionId: returnTx.id,
        clientName: returnTx.customer ? `${returnTx.customer.firstName} ${returnTx.customer.lastName}` : undefined,
        reason: returnReason,
        resolution: returnResolution,
        refundMethod: returnResolution === "refund" ? returnRefundMethod : undefined,
        note: returnNote || undefined,
        items: itemsToReturn.map((it) => {
          const qty = returnQtys[it.productId];
          const exchId = returnExchangeIds[it.productId];
          const exchProd = exchId ? products.find((p) => p.id === exchId) : undefined;
          return {
            productId: it.productId,
            productName: it.product?.name || it.productId,
            quantity: qty,
            unitPrice: it.unitPrice,
            total: qty * it.unitPrice,
            exchangeProductId: exchProd?.id,
            exchangeProductName: exchProd?.name,
            exchangeTotal: exchProd ? exchProd.price * qty : undefined,
          };
        }),
      });
      toast(t.historique.returnSuccess, "success");
      setReturnTx(null);
    } catch {
      toast("Erreur lors du retour", "warning");
    } finally {
      setSubmittingReturn(false);
    }
  };

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
    initial:    "Initial Stock",
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

  // Recherche server-side: cherche parmi TOUS les produits (18000+), pas seulement 50
  const { results: searchResults, search: serverSearch, bestsellers, loading: loadingProducts } = useServerProductSearch();

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

  // Recherche server-side déclenchée à chaque changement (query vide → bestsellers)
  useEffect(() => {
    serverSearch(search);
  }, [search, serverSearch]);

  // Liste affichée = résultats server-side (ou bestsellers si pas de recherche)
  const filteredProducts = search.trim() ? searchResults : (searchResults.length > 0 ? searchResults : bestsellers);

  // Pour le sélecteur d'échange (retour): produits disponibles (résultats recherche + bestsellers, dédupliqués)
  const products = useMemo(() => {
    const merged = [...searchResults, ...bestsellers];
    return merged.filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);
  }, [searchResults, bestsellers]);

  // Filtered movements (type + date range), sorted most recent first
  const filteredMovements = useMemo(() => {
    return movements
      .filter((m) => {
        if (typeFilter !== "all" && m.type !== typeFilter) return false;
        if (dateFrom && new Date(m.createdAt) < new Date(dateFrom)) return false;
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59);
          if (new Date(m.createdAt) > end) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [movements, typeFilter, dateFrom, dateTo]);

  // Summary totals (from ALL movements, not filtered)
  // Backend stores OUT movements with negative quantity (e.g. -5),
  // IN movements with positive quantity (e.g. +16),
  // adjustments with signed quantity (e.g. -2 or +3).
  // So: totalOut is already negative — use Math.abs for display.
  const totalIn  = movements.filter((m) => m.type === "in").reduce((s, m) => s + Math.abs(m.quantity), 0);
  const totalOut = movements.filter((m) => m.type === "out").reduce((s, m) => s + Math.abs(m.quantity), 0);
  const totalAdj = movements.filter((m) => m.type === "adjustment").reduce((s, m) => s + m.quantity, 0); // signed
  const netChange = totalIn - totalOut + totalAdj;

  // Running balance — use the signed quantity directly from the backend.
  // IN  → +qty (positive), OUT → qty (already negative), ADJ → signed qty.
  // So balance += m.quantity works for ALL types.
  const sparklinePoints = useMemo(() => {
    if (!movements.length) return [];
    const sorted = [...movements].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let balance = 0;
    return sorted.map((m) => {
      balance += m.quantity; // signed: in=+, out=-, adj=±
      return balance;
    });
  }, [movements]);

  // Running balance per row (newest-first display)
  // IMPORTANT: baseline = stock actuel - somme de TOUS les mouvements.
  // Ça capture le stock initial du produit (mis à la création sans mouvement),
  // pour que la balance de la dernière ligne = le vrai stock du produit.
  const movementsWithBalance = useMemo(() => {
    // Balance calculée sur TOUS les mouvements (pas seulement filtrés)
    const allSorted = [...movements].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const netAll = allSorted.reduce((s, m) => s + m.quantity, 0);
    const baseline = (selectedProduct?.stock ?? 0) - netAll;
    let balance = baseline;
    const balById: Record<string, number> = {};
    allSorted.forEach((m) => {
      balance += m.quantity; // signed
      balById[m.id] = balance;
    });
    // Afficher les mouvements filtrés, du plus récent au plus ancien
    const sortedFiltered = [...filteredMovements].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sortedFiltered.map((m) => ({ ...m, balance: balById[m.id] ?? 0 }));
  }, [filteredMovements, movements, selectedProduct]);

  // Margin calculation
  const marginPct = selectedProduct && (selectedProduct.price ?? 0) > 0
    ? ((( selectedProduct.price ?? 0) - (selectedProduct.costPrice ?? 0)) / (selectedProduct.price ?? 1)) * 100
    : 0;

  // CSV Export
  const handleExportCSV = () => {
    if (!movementsWithBalance.length || !selectedProduct) return;
    const header = [t.stocks.csvDate, t.stocks.csvTime, t.stocks.csvType, t.stocks.csvQuantity, t.stocks.csvBalance, t.stocks.csvUnitValue, t.stocks.csvTotalValue, t.stocks.csvReason, t.stocks.csvReference, t.stocks.csvDoneBy, t.stocks.csvNote];
    const rows = movementsWithBalance.map((m) => {
      const absQ = Math.abs(m.quantity);
      const uv = m.type === "in" ? (selectedProduct.costPrice ?? 0) : (selectedProduct.price ?? 0);
      return [
        formatDate(m.createdAt),
        formatTime(m.createdAt),
        m.type,
        m.type === "in" ? `+${absQ}` : m.type === "out" ? `-${absQ}` : m.quantity,
        m.balance,
        uv,
        absQ * uv,
        translateReason(m.reason),
        m.reference ?? "",
        m.employee ? `${m.employee.firstName} ${m.employee.lastName}` : "",
        (m.notes ?? "").replace(/,/g, ";"),
      ];
    });
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
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("stock")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
            activeTab === "stock" ? "bg-[var(--brand)] text-white" : "bg-slate-100 text-[var(--text-secondary)] hover:bg-slate-200"
          )}
        >
          {t.stocks.historyPageTitle}
        </button>
        <button
          onClick={() => setActiveTab("sales")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
            activeTab === "sales" ? "bg-[var(--brand)] text-white" : "bg-slate-100 text-[var(--text-secondary)] hover:bg-slate-200"
          )}
        >
          {t.historique?.mySales || "Mes ventes"}
        </button>
      </div>

      {/* Tab: Mes ventes */}
      {activeTab === "sales" && (
        <Card padding="none">
          <div className="p-4 border-b border-[var(--border)]">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">{t.historique?.mySales || "Mes ventes"}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {mySales.length} {t.historique?.salesCount || "ventes"}
                </p>
              </div>
              {/* Date range filter */}
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={salesStartDate}
                  onChange={(e) => setSalesStartDate(e.target.value)}
                  className="px-2 py-1.5 border border-[var(--border)] rounded-lg text-xs outline-none focus:border-[var(--brand)]"
                />
                <span className="text-xs text-[var(--text-muted)]">→</span>
                <input
                  type="date"
                  value={salesEndDate}
                  onChange={(e) => setSalesEndDate(e.target.value)}
                  className="px-2 py-1.5 border border-[var(--border)] rounded-lg text-xs outline-none focus:border-[var(--brand)]"
                />
              </div>
            </div>
          </div>
          {loadingSales ? (
            <div className="p-8 text-center text-sm text-[var(--text-muted)]">...</div>
          ) : mySales.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--text-muted)]">{t.historique?.noSales || "No sales"}</div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {mySales.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setDetailTx(tx)}>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{tx.transactionNumber}</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                        tx.paymentMethod === "cash" ? "bg-emerald-100 text-emerald-700" :
                        tx.paymentMethod === "mobile" ? "bg-purple-100 text-purple-700" :
                        tx.paymentMethod === "orange" ? "bg-orange-100 text-orange-700" :
                        "bg-blue-100 text-blue-700"
                      )}>
                        {tx.paymentMethod === "orange" ? "Orange Money" : tx.paymentMethod}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-0.5">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {tx.cashier ? `${tx.cashier.firstName} ${tx.cashier.lastName}` : tx.cashierId}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(tx.date)} {formatTime(tx.date)}
                      </span>
                      <span>{tx.items?.length || 0} articles</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <div className="text-sm font-bold tabular-nums text-[var(--text-primary)]">{formatCurrency(tx.total)}</div>
                    {tx.discount > 0 && (
                      <div className="text-xs text-red-500 tabular-nums">-{formatCurrency(tx.discount)}</div>
                    )}
                    <button
                      onClick={() => openReturnModal(tx)}
                      className="flex items-center gap-1 text-[10px] font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded-md transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {t.historique.returnProduct}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab: Stock movements */}
      {activeTab === "stock" && (
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
                        {(marginPct ?? 0).toFixed(1)}%
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
                        title={t.stocks.exportCSV}
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
                            { label: t.common.date,        align: "left" },
                            { label: t.common.type,        align: "left" },
                            { label: t.common.quantity,    align: "right" },
                            { label: t.stocks.balance,            align: "right" },
                            { label: t.stocks.unitValue,   align: "right" },
                            { label: t.stocks.totalValue,  align: "right" },
                            { label: t.common.reason,      align: "left" },
                            { label: t.stocks.reference,   align: "left" },
                            { label: t.stocks.doneBy,      align: "left" },
                            { label: t.common.note,        align: "left" },
                          ].map(({ label, align }) => (
                            <th key={label} className={cn("px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap", align === "right" ? "text-right" : "text-left")}>
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
                          const absQty = Math.abs(movement.quantity);
                          // Value calculation
                          const unitCost = selectedProduct?.costPrice ?? 0;
                          const unitPrice = selectedProduct?.price ?? 0;
                          const unitValue = isIn ? unitCost : unitPrice;
                          const totalValue = absQty * unitValue;
                          return (
                            <tr
                              key={movement.id}
                              className={cn(
                                "border-b border-[var(--border-subtle)] last:border-0 hover:bg-slate-50/60 transition-colors",
                                i % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                              )}
                            >
                              {/* Date + time */}
                              <td className="px-4 py-3 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                                <div>{formatDate(movement.createdAt)}</div>
                                <div className="text-[10px] text-[var(--text-muted)]">{formatTime(movement.createdAt)}</div>
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
                                {isIn ? "+" : isOut ? "−" : ""}{absQty}
                              </td>
                              {/* Running balance */}
                              <td className="px-4 py-3 text-sm font-semibold text-right tabular-nums text-[var(--text-secondary)]">
                                {movement.balance}
                              </td>
                              {/* Unit value */}
                              <td className="px-4 py-3 text-xs text-right tabular-nums text-[var(--text-muted)] whitespace-nowrap">
                                {formatCurrency(unitValue)}
                              </td>
                              {/* Total value */}
                              <td className="px-4 py-3 text-xs text-right tabular-nums font-semibold text-[var(--text-secondary)] whitespace-nowrap">
                                {formatCurrency(totalValue)}
                              </td>
                              {/* Reason (translated) */}
                              <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                                {translateReason(movement.reason)}
                              </td>
                              {/* Reference */}
                              <td className="px-4 py-3 text-xs text-[var(--text-muted)] font-mono">
                                {movement.reference || <span className="not-italic">—</span>}
                              </td>
                              {/* Done by */}
                              <td className="px-4 py-3 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                                {movement.employee ? (
                                  <span title={movement.employee.role}>
                                    {movement.employee.firstName} {movement.employee.lastName?.charAt(0) || ""}.
                                  </span>
                                ) : (
                                  <span className="text-[var(--text-muted)]">—</span>
                                )}
                              </td>
                              {/* Notes */}
                              <td className="px-4 py-3 text-xs text-[var(--text-muted)] max-w-[180px]">
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
      )}
      {/* ── Return Modal ──────────────────────────────────────── */}
      {returnTx && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50" onClick={() => setReturnTx(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg pointer-events-auto flex flex-col max-h-[90vh]">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center">
                    <RotateCcw className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">{t.historique.returnModal}</h2>
                    <p className="text-xs text-[var(--text-muted)]">{returnTx.transactionNumber} — {formatDate(returnTx.date)}</p>
                  </div>
                </div>
                <button onClick={() => setReturnTx(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">

                {/* Items to return */}
                <div>
                  <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">{t.historique.returnItems}</p>
                  <div className="space-y-2">
                    {(returnTx.items || []).map((item) => {
                      const qty = returnQtys[item.productId] ?? 0;
                      const exchId = returnExchangeIds[item.productId] ?? "";
                      const exchProd = exchId ? products.find((p) => p.id === exchId) : null;
                      return (
                        <div key={item.productId} className={cn("p-3 rounded-xl border transition-colors", qty > 0 ? "bg-orange-50 border-orange-200" : "bg-slate-50 border-[var(--border)]")}>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm font-medium text-[var(--text-primary)]">{item.product?.name || item.productId}</p>
                              <p className="text-xs text-[var(--text-muted)]">{formatCurrency(item.unitPrice)} × {item.quantity}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[var(--text-muted)]">{t.historique.returnQty}:</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setReturnQtys((prev) => ({ ...prev, [item.productId]: Math.max(0, (prev[item.productId] ?? 0) - 1) }))}
                                  className="w-6 h-6 rounded-lg bg-slate-200 hover:bg-slate-300 text-sm font-bold flex items-center justify-center"
                                >−</button>
                                <span className="w-6 text-center text-sm font-bold tabular-nums">{qty}</span>
                                <button
                                  onClick={() => setReturnQtys((prev) => ({ ...prev, [item.productId]: Math.min(item.quantity, (prev[item.productId] ?? 0) + 1) }))}
                                  className="w-6 h-6 rounded-lg bg-slate-200 hover:bg-slate-300 text-sm font-bold flex items-center justify-center"
                                >+</button>
                              </div>
                            </div>
                          </div>
                          {/* Exchange product selector (shown only if resolution = exchange and qty > 0) */}
                          {returnResolution === "exchange" && qty > 0 && (
                            <div className="mt-2 pt-2 border-t border-orange-200">
                              <p className="text-[10px] text-orange-700 font-medium mb-1">{t.historique.returnExchangeItem}</p>
                              <select
                                value={exchId}
                                onChange={(e) => setReturnExchangeIds((prev) => ({ ...prev, [item.productId]: e.target.value }))}
                                className="w-full border border-orange-200 rounded-lg px-2 py-1.5 text-xs bg-white outline-none focus:border-orange-400"
                              >
                                <option value="">— Choisir —</option>
                                {products.filter((p) => p.id !== item.productId).map((p) => (
                                  <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}</option>
                                ))}
                              </select>
                              {exchProd && (() => {
                                const diff = exchProd.price * qty - item.unitPrice * qty;
                                return (
                                  <p className={cn("text-xs mt-1 font-medium tabular-nums", diff > 0 ? "text-amber-600" : diff < 0 ? "text-emerald-600" : "text-slate-500")}>
                                    {t.historique.returnExchangeDiff}: {diff > 0 ? "+" : ""}{formatCurrency(diff)}
                                  </p>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">{t.historique.returnReason}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "defect", label: t.historique.returnReasonDefect },
                      { value: "wrong_item", label: t.historique.returnReasonWrong },
                      { value: "changed_mind", label: t.historique.returnReasonMind },
                      { value: "other", label: t.historique.returnReasonOther },
                    ].map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setReturnReason(r.value)}
                        className={cn("py-2 px-3 rounded-xl text-xs font-medium border transition-colors text-left", returnReason === r.value ? "bg-orange-100 border-orange-400 text-orange-800" : "bg-slate-50 border-[var(--border)] text-[var(--text-secondary)] hover:bg-slate-100")}
                      >{r.label}</button>
                    ))}
                  </div>
                </div>

                {/* Resolution */}
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">{t.historique.returnResolution}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "refund", label: t.historique.returnResolutionRefund },
                      { value: "exchange", label: t.historique.returnResolutionExchange },
                    ].map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setReturnResolution(r.value)}
                        className={cn("py-2.5 px-3 rounded-xl text-sm font-semibold border transition-colors", returnResolution === r.value ? "bg-orange-500 border-orange-500 text-white" : "bg-slate-50 border-[var(--border)] text-[var(--text-secondary)] hover:bg-slate-100")}
                      >{r.label}</button>
                    ))}
                  </div>
                </div>

                {/* Refund method (only for refund) */}
                {returnResolution === "refund" && (
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">{t.historique.returnRefundMethod}</label>
                    <select
                      value={returnRefundMethod}
                      onChange={(e) => setReturnRefundMethod(e.target.value)}
                      className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 bg-white"
                    >
                      <option value="cash">{t.common.cash}</option>
                      <option value="mobile">{t.common.mobile}</option>
                      <option value="orange">{t.common.orange}</option>
                      <option value="card">{t.common.card}</option>
                    </select>
                  </div>
                )}

                {/* Note */}
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">{t.historique.returnNote}</label>
                  <textarea
                    value={returnNote}
                    onChange={(e) => setReturnNote(e.target.value)}
                    rows={2}
                    placeholder="..."
                    className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-sm resize-none outline-none focus:border-orange-400"
                  />
                </div>

                {/* Total summary */}
                {(() => {
                  const total = (returnTx.items || []).reduce((s, it) => s + (returnQtys[it.productId] ?? 0) * it.unitPrice, 0);
                  if (total === 0) return null;
                  return (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between">
                      <span className="text-sm font-medium text-orange-800">{returnResolution === "refund" ? t.historique.returnTotal : t.historique.returnExchangeItem}</span>
                      <span className="text-lg font-bold tabular-nums text-orange-700">{formatCurrency(total)}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[var(--border)] shrink-0">
                <button
                  disabled={submittingReturn}
                  onClick={handleSubmitReturn}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <RotateCcw className={cn("w-4 h-4", submittingReturn && "animate-spin")} />
                  {t.historique.returnConfirm}
                </button>
              </div>

            </div>
          </div>
        </>
      )}

      {/* Sale detail modal */}
      {detailTx && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[70]" onClick={() => setDetailTx(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-[71] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">{detailTx.transactionNumber}</h2>
                  <p className="text-xs text-[var(--text-muted)]">{formatDate(detailTx.date)} {formatTime(detailTx.date)}</p>
                </div>
              </div>
              <button onClick={() => setDetailTx(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Payment info */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={cn(
                  "text-[11px] px-2 py-1 rounded-full font-medium",
                  detailTx.paymentMethod === "cash" ? "bg-emerald-100 text-emerald-700" :
                  detailTx.paymentMethod === "mobile" ? "bg-purple-100 text-purple-700" :
                  detailTx.paymentMethod === "orange" ? "bg-orange-100 text-orange-700" :
                  "bg-blue-100 text-blue-700"
                )}>
                  {detailTx.paymentMethod === "orange" ? "Orange Money" : detailTx.paymentMethod}
                </span>
                <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <User className="w-3 h-3" />
                  {detailTx.cashier ? `${detailTx.cashier.firstName} ${detailTx.cashier.lastName}` : detailTx.cashierId}
                </span>
                <span className="text-xs text-[var(--text-muted)]">{detailTx.items?.length || 0} items</span>
              </div>

              {/* Items list */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Items Sold</p>
                <div className="space-y-1.5">
                  {(detailTx.items || []).map((item: ApiTransactionItem, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.product?.name || item.name || `Item ${i + 1}`}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {item.quantity} × {formatCurrency(item.unitPrice || item.price || 0)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)] shrink-0 ml-2">
                        {formatCurrency(item.total || (item.quantity * (item.unitPrice || item.price || 0)))}
                      </span>
                    </div>
                  ))}
                  {(!detailTx.items || detailTx.items.length === 0) && (
                    <p className="text-xs text-center text-[var(--text-muted)] py-4">No items data available</p>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-[var(--border)] pt-3 space-y-1.5">
                {detailTx.discount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Discount</span>
                    <span className="text-red-500 tabular-nums">-{formatCurrency(detailTx.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-[var(--text-primary)]">Total</span>
                  <span className="text-[var(--text-primary)] tabular-nums">{formatCurrency(detailTx.total)}</span>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-[var(--border)] shrink-0">
              <button
                onClick={() => { setReturnTx(detailTx); setDetailTx(null); }}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 py-2.5 rounded-xl transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                {t.historique.returnProduct}
              </button>
            </div>
          </div>
        </>
      )}

    </AppShell>
  );
}
