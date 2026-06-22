"use client";

import { useState, useEffect } from "react";
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

const MOVEMENT_CONFIG: Record<
  MovementType,
  { label: string; variant: "success" | "danger" | "warning"; icon: typeof ArrowDownToLine }
> = {
  in: { label: "Entrée", variant: "success", icon: ArrowDownToLine },
  out: { label: "Sortie", variant: "danger", icon: ArrowUpFromLine },
  adjustment: { label: "Ajustement", variant: "warning", icon: RefreshCw },
};

function getMovementConfig(type: string) {
  return MOVEMENT_CONFIG[type as MovementType] ?? MOVEMENT_CONFIG.adjustment;
}

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

// ────────────────────────────────────────────────────────────
// Skeleton loaders
// ────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────
export default function HistoriquePage() {
  const { t } = useI18n();
  const { toast } = useToast();

  const { products, loading: loadingProducts } = useProducts();

  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<ApiStockMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Fetch movements whenever the selected product changes
  useEffect(() => {
    if (!selectedProduct) {
      setMovements([]);
      return;
    }
    let cancelled = false;
    setLoadingMovements(true);
    stockApi
      .listMovements(1, 500, selectedProduct.id)
      .then((res) => {
        if (!cancelled) setMovements(res.data);
      })
      .catch(() => {
        if (!cancelled) {
          toast("Impossible de charger l'historique des mouvements", "warning");
          setMovements([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMovements(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProduct?.id]);

  const handleRefresh = () => {
    if (!selectedProduct) return;
    setLoadingMovements(true);
    stockApi
      .listMovements(1, 500, selectedProduct.id)
      .then((res) => setMovements(res.data))
      .catch(() => toast("Impossible de recharger", "warning"))
      .finally(() => setLoadingMovements(false));
  };

  // Filter products by search query
  const filteredProducts = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  // Compute movement summaries
  const totalIn = movements
    .filter((m) => m.type === "in")
    .reduce((s, m) => s + m.quantity, 0);
  const totalOut = movements
    .filter((m) => m.type === "out")
    .reduce((s, m) => s + m.quantity, 0);
  const totalAdj = movements
    .filter((m) => m.type === "adjustment")
    .reduce((s, m) => s + m.quantity, 0);
  const netChange = totalIn - totalOut + totalAdj;

  // Margin calculation
  const marginPct =
    selectedProduct && selectedProduct.price > 0
      ? ((selectedProduct.price - selectedProduct.costPrice) / selectedProduct.price) * 100
      : 0;

  return (
    <AppShell
      title="Historique Produits"
      subtitle="Cycle de vie complet — entrées, sorties et ajustements"
    >
      <div className="flex flex-col lg:flex-row gap-4" style={{ minHeight: "calc(100vh - 120px)" }}>
        {/* ═══════════════════════════════════════════════════════
            LEFT — Product selector panel (1/3 width on desktop)
            ═══════════════════════════════════════════════════════ */}
        <div className="w-full lg:w-1/3 flex flex-col">
          <Card padding="none" className="flex flex-col flex-1">
            {/* Search bar */}
            <div className="p-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2 focus-within:border-[var(--brand)] transition-colors">
                <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`${t.common.search} un produit…`}
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-2 px-0.5">
                {filteredProducts.length} produit{filteredProducts.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Product list */}
            <div className="overflow-y-auto flex-1" style={{ maxHeight: "calc(100vh - 220px)" }}>
              {loadingProducts ? (
                <ProductListSkeleton />
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <Package className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-sm text-[var(--text-muted)]">Aucun produit trouvé</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProduct?.id === product.id;
                    return (
                      <button
                        key={product.id}
                        onClick={() => setSelectedProduct(product)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors group",
                          isSelected
                            ? "bg-[var(--brand-light)]"
                            : "hover:bg-slate-50"
                        )}
                      >
                        {/* Category dot + icon */}
                        <div className="relative shrink-0">
                          <div
                            className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center",
                              isSelected ? "bg-white/70" : "bg-slate-100"
                            )}
                          >
                            <Package
                              className={cn(
                                "w-4 h-4",
                                isSelected ? "text-[var(--brand)]" : "text-slate-400"
                              )}
                            />
                          </div>
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white",
                              getCategoryDot(product.category)
                            )}
                          />
                        </div>

                        {/* Product info */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm font-medium leading-tight truncate",
                              isSelected ? "text-[var(--brand)]" : "text-[var(--text-primary)]"
                            )}
                          >
                            {product.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-[var(--text-muted)] font-mono">
                              {product.sku}
                            </span>
                            <span className="text-[var(--border)] text-[11px]">·</span>
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {product.stock} {product.unit}
                            </span>
                          </div>
                        </div>

                        {/* Arrow indicator */}
                        <ChevronRight
                          className={cn(
                            "w-4 h-4 shrink-0 transition-colors",
                            isSelected ? "text-[var(--brand)]" : "text-slate-300 group-hover:text-slate-400"
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ═══════════════════════════════════════════════════════
            RIGHT — History panel (2/3 width on desktop)
            ═══════════════════════════════════════════════════════ */}
        <div className="w-full lg:w-2/3 flex flex-col gap-4">
          {!selectedProduct ? (
            /* ── Placeholder ── */
            <Card className="flex-1 flex flex-col items-center justify-center py-24">
              <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-5">
                <History className="w-10 h-10 text-slate-300" />
              </div>
              <p className="text-base font-semibold text-[var(--text-primary)]">
                Sélectionnez un produit
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1.5 text-center max-w-xs">
                Choisissez un produit dans le panneau de gauche pour consulter son historique complet
              </p>
              <div className="mt-6 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-500" /> Entrées
                </span>
                <span className="flex items-center gap-1.5">
                  <ArrowUpFromLine className="w-3.5 h-3.5 text-red-500" /> Sorties
                </span>
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-500" /> Ajustements
                </span>
              </div>
            </Card>
          ) : (
            <>
              {/* ── Product header card ── */}
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Left: identity */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-[var(--brand-light)] rounded-xl flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6 text-[var(--brand)]" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-[var(--text-primary)] leading-tight truncate">
                        {selectedProduct.name}
                      </h2>
                      <div className="flex items-center flex-wrap gap-2 mt-1">
                        <span className="text-xs text-[var(--text-muted)] font-mono">
                          {selectedProduct.sku}
                        </span>
                        <span className="text-[var(--border)] text-xs">·</span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {selectedProduct.category}
                        </span>
                        <Badge
                          variant={
                            selectedProduct.stock === 0
                              ? "danger"
                              : selectedProduct.stock <= selectedProduct.minStock
                              ? "warning"
                              : "success"
                          }
                          size="sm"
                        >
                          {selectedProduct.stock} {selectedProduct.unit}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Right: financial KPIs */}
                  <div className="flex items-center gap-5 shrink-0 flex-wrap">
                    <div className="text-right">
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide font-semibold">
                        Prix vente
                      </p>
                      <p className="text-sm font-bold text-[var(--brand)] tabular-nums mt-0.5">
                        {formatCurrency(selectedProduct.price)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide font-semibold">
                        Prix achat
                      </p>
                      <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                        {formatCurrency(selectedProduct.costPrice)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide font-semibold">
                        Marge
                      </p>
                      <p
                        className={cn(
                          "text-sm font-bold tabular-nums mt-0.5",
                          marginPct >= 20 ? "text-emerald-600" : "text-amber-600"
                        )}
                      >
                        {marginPct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* ── 3 summary cards ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    label: "Total Entré",
                    value: totalIn,
                    sign: "+",
                    icon: ArrowDownToLine,
                    iconBg: "bg-[var(--success-light)]",
                    iconColor: "text-emerald-600",
                    valueColor: "text-emerald-600",
                  },
                  {
                    label: "Total Vendu / Sorti",
                    value: totalOut,
                    sign: "-",
                    icon: ArrowUpFromLine,
                    iconBg: "bg-[var(--danger-light)]",
                    iconColor: "text-red-500",
                    valueColor: "text-red-500",
                  },
                  {
                    label: "Variation nette",
                    value: netChange,
                    sign: netChange >= 0 ? "+" : "",
                    icon: netChange >= 0 ? TrendingUp : TrendingDown,
                    iconBg: netChange >= 0 ? "bg-[var(--brand-light)]" : "bg-amber-50",
                    iconColor: netChange >= 0 ? "text-[var(--brand)]" : "text-amber-600",
                    valueColor: netChange >= 0 ? "text-[var(--brand)]" : "text-amber-600",
                  },
                ].map(({ label, value, sign, icon: Icon, iconBg, iconColor, valueColor }) => (
                  <div
                    key={label}
                    className="bg-white border border-[var(--border)] rounded-2xl p-4 flex items-center gap-3 shadow-[var(--shadow-sm)]"
                  >
                    <div
                      className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                        iconBg
                      )}
                    >
                      <Icon className={cn("w-5 h-5", iconColor)} />
                    </div>
                    <div>
                      <p className={cn("text-2xl font-bold tabular-nums leading-none", valueColor)}>
                        {sign}{Math.abs(value)}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Movement table ── */}
              <Card padding="none" className="flex-1">
                {/* Table header */}
                <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
                      Historique des mouvements
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {loadingMovements
                        ? t.common.loading
                        : `${movements.length} mouvement${movements.length !== 1 ? "s" : ""} au total`}
                    </p>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={loadingMovements}
                    className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
                  >
                    <RefreshCw
                      className={cn("w-3.5 h-3.5", loadingMovements && "animate-spin")}
                    />
                    {t.common.refresh}
                  </button>
                </div>

                {/* Content */}
                {loadingMovements ? (
                  <MovementTableSkeleton />
                ) : movements.length === 0 ? (
                  /* Empty state */
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                      <BarChart2 className="w-7 h-7 text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {t.stocks.noHistory}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Ce produit n'a pas encore de mouvements de stock
                    </p>
                  </div>
                ) : (
                  /* Table */
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-slate-50/60">
                          {[
                            { label: t.common.date, align: "left" },
                            { label: t.common.type, align: "left" },
                            { label: t.common.quantity, align: "right" },
                            { label: t.common.reason, align: "left" },
                            { label: t.stocks.reference, align: "left" },
                            { label: t.common.note, align: "left" },
                          ].map(({ label, align }) => (
                            <th
                              key={label}
                              className={cn(
                                "px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide",
                                align === "right" ? "text-right" : "text-left"
                              )}
                            >
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {movements.map((movement, i) => {
                          const config = getMovementConfig(movement.type);
                          const TypeIcon = config.icon;
                          const isIn = movement.type === "in";
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

                              {/* Type badge */}
                              <td className="px-4 py-3">
                                <Badge variant={config.variant} size="sm">
                                  <TypeIcon className="w-3 h-3 mr-1 inline-block" />
                                  {config.label}
                                </Badge>
                              </td>

                              {/* Quantity */}
                              <td
                                className={cn(
                                  "px-4 py-3 text-sm font-bold text-right tabular-nums",
                                  isIn
                                    ? "text-emerald-600"
                                    : isOut
                                    ? "text-red-500"
                                    : "text-amber-600"
                                )}
                              >
                                {isIn ? "+" : isOut ? "−" : ""}
                                {movement.quantity}
                              </td>

                              {/* Reason */}
                              <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                                {movement.reason || (
                                  <span className="text-[var(--text-muted)]">—</span>
                                )}
                              </td>

                              {/* Reference */}
                              <td className="px-4 py-3 text-xs text-[var(--text-muted)] font-mono">
                                {movement.reference || (
                                  <span className="not-italic">—</span>
                                )}
                              </td>

                              {/* Notes */}
                              <td className="px-4 py-3 text-xs text-[var(--text-muted)] max-w-[220px]">
                                <span className="block truncate" title={movement.notes ?? ""}>
                                  {movement.notes || "—"}
                                </span>
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
