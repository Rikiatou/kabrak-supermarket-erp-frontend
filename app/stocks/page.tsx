"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  ArrowUpDown,
  AlertTriangle,
  Clock,
  TrendingDown,
  Package,
  X,
  ChevronDown,
  Tag,
  Printer,
  ScanLine,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/Toast";
import { NewProductModal } from "@/components/forms/NewProductModal";
import { useProducts, useStockAlerts, useSetMarkdown, useRemoveMarkdown } from "@/lib/hooks/useApi";
import { useBarcodeScanner } from "@/lib/hooks/useBarcodeScanner";
import { productsApi, stockApi, apiProductToFrontend } from "@/lib/api";
import { getEffectivePrice, hasActiveMarkdown } from "@/lib/api";
import type { Product } from "@/lib/types";
import type { ApiStockMovement } from "@/lib/api";

type SortKey = "name" | "stock" | "price" | "category";
type SortDir = "asc" | "desc";
type FilterStatus = "all" | "critical" | "low" | "ok" | "expiring";

// Stable backend category keys (always French in DB) - order matches CATEGORIES labels
const CATEGORY_KEYS = ["All", "Grocery", "Beverages", "Dairy", "Hygiene", "Butchery", "Bakery", "Frozen"];

function stockStatus(product: Product): FilterStatus {
  if (product.stock === 0) return "critical";
  if (product.expiryDate) {
    const daysLeft = Math.ceil(
      (new Date(product.expiryDate).getTime() - Date.now()) / 86400000
    );
    if (daysLeft <= 5) return "expiring";
  }
  if (product.stock <= product.minStock * 0.3) return "critical";
  if (product.stock <= product.minStock) return "low";
  return "ok";
}

function useStatusConfig(t: ReturnType<typeof useI18n>["t"]) {
  return {
    critical: { label: t.stocks.status.critical, badge: "danger" as const },
    low: { label: t.stocks.status.low, badge: "warning" as const },
    expiring: { label: t.stocks.status.expiring, badge: "warning" as const },
    ok: { label: t.stocks.status.ok, badge: "success" as const },
    all: { label: t.stocks.status.all, badge: "neutral" as const },
  };
}

export default function StocksPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { products: apiProducts, reload: reloadProducts } = useProducts();
  const { alerts: stockAlertsData } = useStockAlerts();
  const CATEGORIES = [
    t.common.catAll,
    t.common.catGrocery,
    t.common.catDrinks,
    t.common.catDairy,
    t.common.catHygiene,
    t.common.catButcher,
    t.common.catBakery,
    t.common.catFrozen,
  ];
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [stockScanBarcode, setStockScanBarcode] = useState("");
  const [markdownProduct, setMarkdownProduct] = useState<Product | null>(null);
  const [markdownPrice, setMarkdownPrice] = useState("");
  const [markdownReason, setMarkdownReason] = useState("near_expiry");
  const [markdownNote, setMarkdownNote] = useState("");
  const { setMarkdown, setting: settingMarkdown } = useSetMarkdown();
  const { removeMarkdown, removing: removingMarkdown } = useRemoveMarkdown();

  // Utiliser les vrais produits du backend
  useEffect(() => {
    setProducts(apiProducts);
  }, [apiProducts]);

  const [saving, setSaving] = useState(false);

  // Global barcode scanner — détecte automatiquement toute saisie de douchette
  // (pas besoin de cliquer un bouton — scan direct sur la page)
  const handleGlobalScan = useCallback((code: string) => {
    // Ne pas interférer si un modal est déjà ouvert
    if (showNewProduct) return;
    const existing = products.find(
      (p) => p.barcode === code || p.sku?.toLowerCase() === code.toLowerCase()
    );
    if (existing) {
      setSelectedProduct(existing);
      toast(`${existing.name} — ${t.stocks.barcode}: ${code}`, "info");
    } else {
      setStockScanBarcode(code);
      setShowNewProduct(true);
    }
  }, [products, showNewProduct, toast, t.stocks.barcode]);

  useBarcodeScanner(handleGlobalScan, showNewProduct);

  const handleNewProduct = async (data: Omit<Product, "id">) => {
    setSaving(true);
    try {
      // Sauvegarder dans le backend
      const created = await productsApi.create({
        sku: data.sku || undefined,
        barcode: data.barcode || undefined,
        name: data.name,
        category: data.category,
        price: data.price,
        costPrice: data.costPrice,
        stock: data.stock,
        minStock: data.minStock,
        unit: data.unit,
      });
      // Ajouter le produit créé à la liste locale
      const newProduct = apiProductToFrontend(created);
      setProducts((prev) => [newProduct, ...prev]);
      toast(`${data.name} ${t.stocks.addedToStock}`, "success");
      reloadProducts();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t.stocks.errorAdd;
      toast(msg, "warning");
      // Fallback: ajouter en local au moins
      const newProduct: Product = { ...data, id: `p${Date.now()}` };
      setProducts((prev) => [newProduct, ...prev]);
    } finally {
      setSaving(false);
    }
  };

  const openMarkdownModal = (product: Product) => {
    setMarkdownProduct(product);
    setMarkdownPrice(product.markdownPrice ? String(product.markdownPrice) : "");
    setMarkdownReason(product.markdownReason || "near_expiry");
    setMarkdownNote(product.markdownNote || "");
  };

  const closeMarkdownModal = () => {
    setMarkdownProduct(null);
    setMarkdownPrice("");
    setMarkdownNote("");
  };

  const handleSetMarkdown = async () => {
    if (!markdownProduct) return;
    const price = parseInt(markdownPrice);
    if (!price || price <= 0) {
      toast(t.stocks.markdownInvalidPrice, "warning");
      return;
    }
    if (price >= markdownProduct.price) {
      toast(`${t.stocks.markdownMustBeLower} ${formatCurrency(markdownProduct.price)}`, "warning");
      return;
    }
    const result = await setMarkdown(markdownProduct.id, {
      markdownPrice: price,
      markdownReason,
      markdownNote: markdownNote || undefined,
    });
    if (result) {
      // Mettre à jour le produit dans la liste locale
      setProducts((prev) =>
        prev.map((p) =>
          p.id === markdownProduct.id
            ? { ...p, markdownPrice: price, markdownReason, markdownNote }
            : p
        )
      );
      toast(`${t.stocks.markdownApplied} ${markdownProduct.name} → ${formatCurrency(price)}`, "success");
      reloadProducts();
      closeMarkdownModal();
    } else {
      // Fallback local
      setProducts((prev) =>
        prev.map((p) =>
          p.id === markdownProduct.id
            ? { ...p, markdownPrice: price, markdownReason, markdownNote }
            : p
        )
      );
      toast(t.stocks.markdownAppliedLocal, "warning");
      closeMarkdownModal();
    }
  };

  const handleRemoveMarkdown = async (product: Product) => {
    const result = await removeMarkdown(product.id);
    if (result) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? { ...p, markdownPrice: null, markdownReason: null, markdownNote: null }
            : p
        )
      );
      toast(`${t.stocks.markdownRemoved} ${product.name}`, "success");
      reloadProducts();
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = products
    .filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
        (p.barcode && p.barcode.includes(search));
      const activeCategory = CATEGORY_KEYS[activeCategoryIdx];
      const matchCat = activeCategoryIdx === 0 || p.category === activeCategory;
      const status = stockStatus(p);
      const matchStatus = filterStatus === "all" || status === filterStatus;
      return matchSearch && matchCat && matchStatus;
    })
    .sort((a, b) => {
      let av: string | number = a[sortKey] as string | number;
      let bv: string | number = b[sortKey] as string | number;
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const criticalCount = stockAlertsData?.summary.outOfStockCount ?? products.filter((p) => stockStatus(p) === "critical").length;
  const lowCount = stockAlertsData?.summary.lowStockCount ?? products.filter((p) => stockStatus(p) === "low").length;
  const expiringCount = stockAlertsData?.summary.expiringSoonCount ?? products.filter((p) => stockStatus(p) === "expiring").length;

  const statusConfig = useStatusConfig(t);

  return (
    <AppShell title={t.stocks.title} subtitle={`${products.length} ${t.stocks.totalRefs}`}>
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          {
            label: t.stocks.totalRefs,
            value: products.length,
            icon: Package,
            iconBg: "bg-[var(--brand-light)]",
            iconColor: "text-[var(--brand)]",
          },
          {
            label: t.stocks.criticalBreaks,
            value: criticalCount,
            icon: AlertTriangle,
            iconBg: "bg-[var(--danger-light)]",
            iconColor: "text-red-500",
          },
          {
            label: t.stocks.lowStock,
            value: lowCount,
            icon: TrendingDown,
            iconBg: "bg-[var(--warning-light)]",
            iconColor: "text-amber-500",
          },
          {
            label: t.stocks.expiringSoon,
            value: expiringCount,
            icon: Clock,
            iconBg: "bg-orange-50",
            iconColor: "text-orange-500",
          },
        ].map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <div
            key={label}
            className="bg-white border border-[var(--border)] rounded-2xl p-4 flex items-center gap-3 shadow-[var(--shadow-sm)]"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums leading-none">{value}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <Card padding="none">
        {/* Toolbar */}
        <div className="p-4 border-b border-[var(--border)] flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2 flex-1 min-w-[200px] focus-within:border-[var(--brand)] transition-colors">
            <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.stocks.product}
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")}>
                <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </button>
            )}
          </div>

          {/* Category filter */}
          <div className="relative">
            <select
              value={activeCategoryIdx}
              onChange={(e) => setActiveCategoryIdx(Number(e.target.value))}
              className="appearance-none bg-white border border-[var(--border)] rounded-xl px-3 py-2 pr-8 text-sm text-[var(--text-secondary)] outline-none cursor-pointer hover:border-blue-300 transition-colors"
            >
              {CATEGORIES.map((c, idx) => (
                <option key={idx} value={idx}>{c}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 bg-[var(--background)] border border-[var(--border)] rounded-xl p-1">
            {(["all", "critical", "low", "expiring", "ok"] as FilterStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-lg transition-all",
                  filterStatus === s
                    ? "bg-white text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
              >
                {statusConfig[s].label}
                {s === "critical" && criticalCount > 0 && (
                  <span className="ml-1 bg-red-100 text-red-600 text-[10px] font-bold px-1 py-0.5 rounded-full">
                    {criticalCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div
            className="h-9 px-3 flex items-center gap-1.5 text-sm font-medium text-[#15803d] bg-[#f0fdf4] border border-[#86efac] rounded-xl"
            title={t.stocks.scannerReady}
          >
            <ScanLine className="w-4 h-4" />
            {t.stocks.scannerReady}
          </div>
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => { setStockScanBarcode(""); setShowNewProduct(true); }}
          >
            {t.stocks.newProduct}
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-slate-50/60">
                {[
                  { key: "name", label: t.stocks.product },
                  { key: "category", label: t.stocks.sortBy },
                  { key: "stock", label: t.stocks.stock },
                  { key: "price", label: t.stocks.salePrice },
                  { key: null, label: t.stocks.status.all },
                  { key: null, label: t.stocks.expiry },
                  { key: null, label: "" },
                ].map(({ key, label }) => (
                  <th
                    key={label}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide",
                      key && "cursor-pointer hover:text-[var(--text-secondary)] select-none"
                    )}
                    onClick={() => key && toggleSort(key as SortKey)}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      {key && sortKey === key && (
                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((product, i) => {
                const status = stockStatus(product);
                const stockPercent = Math.min(
                  Math.round((product.stock / (product.minStock * 2)) * 100),
                  100
                );
                const daysLeft = product.expiryDate
                  ? Math.ceil(
                      (new Date(product.expiryDate).getTime() - Date.now()) / 86400000
                    )
                  : null;

                return (
                  <tr
                    key={product.id}
                    className={cn(
                      "border-b border-[var(--border-subtle)] last:border-0 hover:bg-slate-50/50 cursor-pointer transition-colors",
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                    )}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-sm shrink-0">
                          {getCategoryEmoji(product.category)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{product.name}</p>
                          <p className="text-[11px] text-[var(--text-muted)] font-mono">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{product.category}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              status === "critical" ? "bg-red-500" :
                              status === "low" ? "bg-amber-400" : "bg-emerald-400"
                            )}
                            style={{ width: `${stockPercent}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                          {product.stock}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">/ {product.minStock} min</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)] tabular-nums">
                      {hasActiveMarkdown(product) ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-[var(--text-muted)] line-through">{formatCurrency(product.price)}</span>
                          <span className="text-red-600 font-bold flex items-center gap-0.5">
                            <TrendingDown className="w-3 h-3" />{formatCurrency(getEffectivePrice(product))}
                          </span>
                        </div>
                      ) : (
                        formatCurrency(product.price)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusConfig[status].badge} size="sm">
                        {statusConfig[status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {daysLeft !== null ? (
                        <span
                          className={cn(
                            "text-xs font-medium tabular-nums",
                            daysLeft <= 3 ? "text-red-500" :
                            daysLeft <= 7 ? "text-amber-500" : "text-[var(--text-muted)]"
                          )}
                        >
                          {daysLeft <= 0 ? t.stocks.expired : `D-${daysLeft}`}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {hasActiveMarkdown(product) ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveMarkdown(product); }}
                            className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            {t.stocks.removeMarkdown}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); openMarkdownModal(product); }}
                            className="px-2.5 py-1 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-0.5"
                          >
                            <Tag className="w-3 h-3" /> {t.stocks.addMarkdown}
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); toast(`${t.stocks.restockAction} : ${product.name}`, "info"); }}
                          className="px-2.5 py-1 text-xs font-medium text-[var(--brand)] bg-[var(--brand-light)] rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          {t.stocks.restock}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-[var(--text-muted)]">{t.stocks.noProductFound}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Product detail side panel */}
      {selectedProduct && (
        <ProductDetailPanel
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* New product modal */}
      {showNewProduct && (
        <NewProductModal
          prefillBarcode={stockScanBarcode}
          onClose={() => { setShowNewProduct(false); setStockScanBarcode(""); document.body.focus(); }}
          onSave={(data) => { handleNewProduct(data); }}
        />
      )}

      {/* Markdown modal */}
      {markdownProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeMarkdownModal}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">{t.stocks.markdownTitle} — {markdownProduct.name}</h3>
              </div>
              <button onClick={closeMarkdownModal} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">{t.stocks.normalPrice}</span>
                <span className="font-semibold tabular-nums">{formatCurrency(markdownProduct.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">{t.stocks.costPriceLabel}</span>
                <span className="font-semibold tabular-nums">{formatCurrency(markdownProduct.costPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">{t.stocks.stockLabel}</span>
                <span className="font-semibold tabular-nums">{markdownProduct.stock} {markdownProduct.unit}</span>
              </div>
              {markdownProduct.expiryDate && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">{t.stocks.expiration}</span>
                  <span className="font-semibold">{formatDate(markdownProduct.expiryDate)}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.stocks.newMarkdownPrice}</label>
                <input
                  type="number"
                  value={markdownPrice}
                  onChange={(e) => setMarkdownPrice(e.target.value)}
                  placeholder={String(Math.round(markdownProduct.price * 0.5))}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm tabular-nums outline-none focus:border-amber-500"
                />
                {markdownPrice && parseInt(markdownPrice) > 0 && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {t.stocks.discount} {Math.round((1 - parseInt(markdownPrice) / markdownProduct.price) * 100)}% · {t.stocks.potentialLoss} {formatCurrency((markdownProduct.price - parseInt(markdownPrice)) * markdownProduct.stock)}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.stocks.reason}</label>
                <select
                  value={markdownReason}
                  onChange={(e) => setMarkdownReason(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-amber-500 bg-white"
                >
                  <option value="expiry">{t.stocks.reasonExpired}</option>
                  <option value="near_expiry">{t.stocks.reasonNearExpiry}</option>
                  <option value="clearance">{t.stocks.reasonClearance}</option>
                  <option value="promo">{t.stocks.reasonPromo}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.stocks.noteOptional}</label>
                <input
                  value={markdownNote}
                  onChange={(e) => setMarkdownNote(e.target.value)}
                  placeholder={t.stocks.reasonDetailPh}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={closeMarkdownModal}>{t.common.cancel}</Button>
              <Button className="flex-1" onClick={handleSetMarkdown} disabled={settingMarkdown || !markdownPrice}>
                {settingMarkdown ? t.stocks.applying : t.stocks.applyMarkdown}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function ProductDetailPanel({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [history, setHistory] = useState<ApiStockMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const margin = product.price - product.costPrice;
  const marginRate = Math.round((margin / product.price) * 100);
  const daysLeft = product.expiryDate
    ? Math.ceil(
        (new Date(product.expiryDate).getTime() - Date.now()) / 86400000
      )
    : null;

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    stockApi.listMovements(1, 100, product.id)
      .then((res) => {
        if (!cancelled) setHistory(res.data);
      })
      .catch(() => {
        // fallback: empty history
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => { cancelled = true; };
  }, [product.id]);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-screen w-[380px] bg-white shadow-[var(--shadow-lg)] z-50 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--text-primary)]">{t.stocks.productDetail}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Product header */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-slate-50 border border-[var(--border)] rounded-2xl flex items-center justify-center text-3xl shrink-0">
              {getCategoryEmoji(product.category)}
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] text-base leading-snug">
                {product.name}
              </h3>
              <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">{product.sku}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{product.category}</p>
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t.stocks.salePrice, value: formatCurrency(product.price), color: "text-[var(--brand)]" },
              { label: t.stocks.costPrice, value: formatCurrency(product.costPrice), color: "text-[var(--text-primary)]" },
              { label: t.stocks.grossMargin, value: formatCurrency(margin), color: "text-emerald-600" },
              { label: t.stocks.marginRate, value: `${marginRate}%`, color: "text-emerald-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
                <p className={`text-base font-bold tabular-nums ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Stock */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">{t.stocks.stock}</p>
            <div className="flex items-end justify-between mb-2">
              <span className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">{product.stock}</span>
              <span className="text-xs text-[var(--text-muted)]">{t.stocks.min} {product.minStock} {product.unit}s</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  product.stock <= product.minStock * 0.3 ? "bg-red-500" :
                  product.stock <= product.minStock ? "bg-amber-400" : "bg-emerald-400"
                )}
                style={{ width: `${Math.min((product.stock / (product.minStock * 2)) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Additional info */}
          <div className="space-y-2">
            {[
              { label: t.stocks.supplier, value: product.supplier ?? "—" },
              { label: t.stocks.barcode, value: product.barcode },
              { label: t.stocks.unit, value: product.unit },
              ...(daysLeft !== null
                ? [{ label: t.stocks.expiryDate, value: `${formatDate(product.expiryDate!)} (D-${daysLeft})` }]
                : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-2 border-b border-[var(--border-subtle)] last:border-0">
                <span className="text-xs text-[var(--text-muted)]">{label}</span>
                <span className="text-xs font-medium text-[var(--text-primary)]">{value}</span>
              </div>
            ))}
          </div>

          {/* Product history */}
          <div>
            <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">{t.stocks.historyTitle}</h4>
            <div className="bg-slate-50 rounded-xl p-3 max-h-[260px] overflow-y-auto">
              {historyLoading ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-4">{t.common.loading}</p>
              ) : history.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-4">{t.stocks.noHistory}</p>
              ) : (
                <div className="space-y-2">
                  {history.map((m) => (
                    <div key={m.id} className="flex items-start justify-between text-xs py-1 border-b border-[var(--border-subtle)] last:border-0">
                      <div className="flex-1">
                        <p className="font-medium text-[var(--text-primary)]">
                          {m.type === "in" ? "+" : m.type === "out" ? "" : ""}
                          {m.quantity} {product.unit}
                        </p>
                        <p className="text-[var(--text-muted)]">
                          {formatDate(m.createdAt)} — {movementReasonLabel(t, m.reason)}
                        </p>
                        {m.reference && <p className="text-[var(--text-muted)]">{t.stocks.reference}: {m.reference}</p>}
                        {m.notes && <p className="text-[var(--text-muted)]">{m.notes}</p>}
                      </div>
                      <span className={cn(
                        "font-bold tabular-nums shrink-0",
                        m.type === "in" ? "text-emerald-600" : m.type === "out" ? "text-red-600" : "text-amber-600"
                      )}>
                        {m.type === "in" ? "+" : m.type === "out" ? "-" : ""}{Math.abs(m.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border)] flex gap-2">
          <Button variant="secondary" className="flex-1" size="md" onClick={() => toast(t.stocks.stockDetail, "info")}>
            {t.common.edit}
          </Button>
          <Button className="flex-1" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => toast(`${t.stocks.restockAction} : ${product.name}`, "success")}>
            {t.stocks.restockAction}
          </Button>
        </div>

        {/* Print Label */}
        <div className="px-4 pb-4">
          <Button
            variant="secondary"
            className="w-full"
            size="md"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => printProductLabel(product, t)}
          >
            {t.stocks.printLabel}
          </Button>
        </div>
      </div>
    </>
  );
}

// ========================================
// FONCTION: Imprimer étiquette produit
// ========================================
function printProductLabel(product: Product, t: ReturnType<typeof useI18n>["t"]) {
  const win = window.open("", "_blank", "width=400,height=300");
  if (!win) return;

  const price = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0 })
    .format(product.price)
    .replace(/\u202F|\u00A0/g, " ");

  win.document.write(`
    <html>
      <head>
        <title>${t.stocks.labelTitle} - ${product.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { width: 200px; padding: 8px; font-family: Arial, sans-serif; }
          .label { border: 1px solid #000; padding: 8px; text-align: center; }
          .store { font-size: 10px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 6px; }
          .name { font-size: 12px; font-weight: bold; margin-bottom: 4px; line-height: 1.2; }
          .barcode-wrap { margin: 6px 0; }
          .barcode-wrap svg { width: 100%; height: 40px; }
          .sku { font-size: 9px; color: #666; margin-bottom: 4px; font-family: monospace; }
          .price { font-size: 16px; font-weight: bold; }
          .unit { font-size: 9px; color: #666; }
          @media print { body { width: auto; } }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
      </head>
      <body>
        <div class="label">
          <div class="store">KABRAK Supermarket</div>
          <div class="name">${product.name}</div>
          <div class="sku">${product.sku}</div>
          <div class="barcode-wrap">
            <svg id="barcode"></svg>
          </div>
          <div class="price">${price} FCFA</div>
          <div class="unit">${product.unit}</div>
        </div>
        <script>
          try {
            JsBarcode("#barcode", "${product.barcode || product.sku}", {
              format: "CODE128",
              width: 2,
              height: 40,
              displayValue: true,
              fontSize: 10,
              margin: 0
            });
          } catch(e) {
            document.getElementById('barcode').innerHTML = '<div style="font-size:10px">Code: ${product.sku}</div>';
          }
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          };
        </script>
      </body>
    </html>
  `);
  win.document.close();
}

function movementReasonLabel(t: ReturnType<typeof useI18n>["t"], reason?: string) {
  if (!reason) return t.stocks.movementReasonOther;
  switch (reason) {
    case "sale": return t.stocks.movementReasonSale;
    case "purchase": return t.stocks.movementReasonPurchase;
    case "refund": return t.stocks.movementReasonRefund;
    case "adjustment": return t.stocks.movementReasonAdjustment;
    case "expiry": return t.stocks.movementReasonExpiry;
    case "damage": return t.stocks.movementReasonDamage;
    case "theft": return t.stocks.movementReasonTheft;
    default: return t.stocks.movementReasonOther;
  }
}

function getCategoryEmoji(category: string): string {
  return "";
}
