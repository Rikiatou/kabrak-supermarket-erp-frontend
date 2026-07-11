"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  Package,
  TrendingDown,
  X,
  RotateCcw,
  Link2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/Toast";
import {
  useServerProductSearch,
  useStockAdjust,
  useReturns,
  useCreateReturn,
  useRecentTransactions,
  useLosses,
} from "@/lib/hooks/useApi";
import { formatCurrency, cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/context";

interface LossEntry {
  id: string;
  productName: string;
  productId: string;
  quantity: number;
  type: string;
  reason: string;
  value: number;
  date: string;
}

export default function PertesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  // Recherche server-side: cherche parmi TOUS les produits (18000+), pas seulement 50
  const { results: searchResults, search: serverSearch, bestsellers, refresh: reloadProducts } = useServerProductSearch();
  const { adjust, adjusting } = useStockAdjust();
  const { returns, reload: reloadReturns } = useReturns();
  const { create: createReturn, creating: creatingReturn } = useCreateReturn();
  const { transactions } = useRecentTransactions(50);
  const { losses: dbLosses, loading: lossesLoading, reload: reloadLosses } = useLosses();
  // Produits disponibles pour lookup (résultats recherche + bestsellers, dédupliqués)
  const products = useMemo(() => {
    const merged = [...searchResults, ...bestsellers];
    return merged.filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);
  }, [searchResults, bestsellers]);

  const [activeTab, setActiveTab] = useState<"losses" | "returns">(
    searchParams?.get("tab") === "returns" ? "returns" : "losses"
  );

  // Loss state
  const lossTypes = [
    { value: "damage", label: t.pertes.lossTypes.damage, color: "text-red-600 bg-red-50" },
    { value: "expiry", label: t.pertes.lossTypes.expiry, color: "text-amber-600 bg-amber-50" },
    { value: "theft", label: t.pertes.lossTypes.theft, color: "text-purple-600 bg-purple-50" },
    { value: "loss", label: t.pertes.lossTypes.loss, color: "text-slate-600 bg-slate-50" },
    { value: "other", label: t.pertes.lossTypes.other, color: "text-blue-600 bg-blue-50" },
  ];

  const [showLossModal, setShowLossModal] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedProductData, setSelectedProductData] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [lossType, setLossType] = useState("damage");
  const [reason, setReason] = useState("");
  const [lossItems, setLossItems] = useState<Array<{
    productId: string;
    productName: string;
    quantity: number;
    type: string;
    reason: string;
    value: number;
    stock: number;
  }>>([]);
  const [savingLosses, setSavingLosses] = useState(false);

  // Return state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [saleSearch, setSaleSearch] = useState("");
  const [linkedTransaction, setLinkedTransaction] = useState<any>(null);
  const [returnItems, setReturnItems] = useState<Array<{
    productId?: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    selected: boolean;
  }>>([]);
  const [returnReason, setReturnReason] = useState("defective");
  const [resolution, setResolution] = useState("refund");
  const [refundMethod, setRefundMethod] = useState("cash");
  const [clientName, setClientName] = useState("");

  // Recherche server-side déclenchée à chaque changement (query vide → bestsellers)
  useEffect(() => {
    serverSearch(search);
  }, [search, serverSearch]);

  // Liste affichée = résultats server-side (ou bestsellers si pas de recherche)
  const filteredProducts = (search.trim() ? searchResults : bestsellers).slice(0, 10);

  // Convertir les stock movements de la DB au format LossEntry
  const losses: LossEntry[] = useMemo(() => {
    return dbLosses.map((m: any) => {
      // Parse le reason: format "type: reason" (ex: "damage: Produit cassé")
      let type = 'other';
      let reason = m.reason || '';
      const match = (m.reason || '').match(/^(\w+):\s*(.*)$/);
      if (match) {
        type = match[1];
        reason = match[2];
      }
      const qty = Math.abs(m.quantity || 0);
      const costPrice = m.product?.costPrice || 0;
      return {
        id: m.id,
        productName: m.product?.name || 'Produit supprimé',
        productId: m.productId,
        quantity: qty,
        type,
        reason,
        value: qty * costPrice,
        date: m.createdAt || new Date().toISOString(),
      };
    });
  }, [dbLosses]);

  const totalLossValue = losses.reduce((s, l) => s + l.value, 0);
  const totalLossCount = losses.length;

  // Filter transactions by search
  const filteredTx = saleSearch
    ? transactions.filter((tx) =>
        tx.transactionNumber?.toLowerCase().includes(saleSearch.toLowerCase()) ||
        tx.cashier?.firstName?.toLowerCase().includes(saleSearch.toLowerCase()) ||
        tx.cashier?.lastName?.toLowerCase().includes(saleSearch.toLowerCase())
      ).slice(0, 5)
    : [];

  const handleAddLossItem = () => {
    const product = selectedProductData || (searchResults.find(p => p.id === selectedProduct) || bestsellers.find(p => p.id === selectedProduct));
    if (!product || quantity < 1) return;

    if (quantity > product.stock) {
      toast(t.pertes.insufficientStock.replace("{stock}", String(product.stock)), "warning");
      return;
    }

    // Vérifier si le produit est déjà dans la liste
    const existing = lossItems.find((l) => l.productId === product.id);
    const newEntry = {
      productId: product.id,
      productName: product.name,
      quantity,
      type: lossType,
      reason: reason || lossTypes.find((l) => l.value === lossType)?.label || t.pertes.lossTypes.loss,
      value: product.costPrice * quantity,
      stock: product.stock,
    };

    if (existing) {
      setLossItems(lossItems.map((l) =>
        l.productId === product.id
          ? { ...l, quantity: l.quantity + quantity, value: l.value + newEntry.value }
          : l
      ));
    } else {
      setLossItems([...lossItems, newEntry]);
    }

    // Reset la sélection produit pour en ajouter un autre
    setSelectedProduct("");
    setSelectedProductData(null);
    setQuantity(1);
    setReason("");
    setSearch("");
  };

  const removeLossItem = (productId: string) => {
    setLossItems(lossItems.filter((l) => l.productId !== productId));
  };

  const handleSaveAllLosses = async () => {
    if (lossItems.length === 0) return;

    setSavingLosses(true);
    let savedCount = 0;

    for (const item of lossItems) {
      try {
        await adjust(item.productId, Math.max(0, item.stock - item.quantity), `${item.type}: ${item.reason}`);
        savedCount++;
      } catch (e) {
        toast(t.pertes.stockAdjustmentError, "warning");
      }
    }

    if (savedCount > 0) {
      toast(`${savedCount} perte(s) enregistrée(s)`, "success");
      reloadProducts();
      reloadLosses();  // Recharger depuis la DB
    }

    setLossItems([]);
    setShowLossModal(false);
    setSavingLosses(false);
  };

  const handleLinkSale = (tx: any) => {
    setLinkedTransaction(tx);
    setSaleSearch(tx.transactionNumber);
    // Pre-fill return items from transaction items
    if (tx.items && tx.items.length > 0) {
      setReturnItems(tx.items.map((it: any) => ({
        productId: it.productId || it.product?.id,
        productName: it.product?.name || it.name || "Product",
        quantity: it.quantity,
        unitPrice: it.unitPrice || it.price || 0,
        total: it.total || (it.quantity * (it.unitPrice || it.price || 0)),
        selected: false,
      })));
    } else {
      setReturnItems([]);
    }
  };

  const totalRefund = returnItems
    .filter((it) => it.selected)
    .reduce((s, it) => s + it.total, 0);

  const handleSubmitReturn = async () => {
    const selectedItems = returnItems.filter((it) => it.selected);
    if (selectedItems.length === 0) {
      toast(t.pertes.selectItems, "warning");
      return;
    }

    try {
      await createReturn({
        originalTransactionId: linkedTransaction?.id,
        clientName: clientName || undefined,
        reason: returnReason,
        resolution,
        refundMethod,
        items: selectedItems.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          total: it.total,
        })),
      });
      toast(t.pertes.returnSaved, "success");
      reloadReturns();
      reloadProducts();
      // Reset
      setShowReturnModal(false);
      setLinkedTransaction(null);
      setSaleSearch("");
      setReturnItems([]);
      setReturnReason("defective");
      setResolution("refund");
      setClientName("");
    } catch (e) {
      toast(t.pertes.returnError, "warning");
    }
  };

  const lossTypeLabel = (type: string) => lossTypes.find((l) => l.value === type)?.label || type;
  const lossTypeColor = (type: string) => lossTypes.find((l) => l.value === type)?.color || "text-slate-600 bg-slate-50";

  const returnReasons = [
    { value: "defective", label: t.pertes.returnReasons.defective },
    { value: "wrongItem", label: t.pertes.returnReasons.wrongItem },
    { value: "expired", label: t.pertes.returnReasons.expired },
    { value: "customerChange", label: t.pertes.returnReasons.customerChange },
    { value: "other", label: t.pertes.returnReasons.other },
  ];

  const resolutions = [
    { value: "refund", label: t.pertes.resolutions.refund },
    { value: "exchange", label: t.pertes.resolutions.exchange },
    { value: "storeCredit", label: t.pertes.resolutions.storeCredit },
  ];

  return (
    <AppShell title={t.pertes.title} subtitle={t.pertes.subtitle}>
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-[var(--surface)] rounded-xl p-1 border border-[var(--border)] w-fit">
          <button
            onClick={() => setActiveTab("losses")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
              activeTab === "losses"
                ? "bg-[var(--brand)] text-white"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            )}
          >
            <TrendingDown className="w-4 h-4" />
            {t.pertes.tabLosses}
          </button>
          <button
            onClick={() => setActiveTab("returns")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
              activeTab === "returns"
                ? "bg-[var(--brand)] text-white"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            )}
          >
            <RotateCcw className="w-4 h-4" />
            {t.pertes.tabReturns}
          </button>
        </div>

        {/* ============ LOSSES TAB ============ */}
        {activeTab === "losses" && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{t.pertes.totalLossValue}</p>
                    <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{formatCurrency(totalLossValue)}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{t.pertes.lossCount}</p>
                    <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{totalLossCount}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{t.pertes.affectedItems}</p>
                    <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
                      {new Set(losses.map((l) => l.productId)).size}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t.pertes.lossHistory}</h2>
                <p className="text-xs text-[var(--text-muted)]">{t.pertes.allLosses}</p>
              </div>
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setLossItems([]); setShowLossModal(true); }}>
                {t.pertes.declareLoss}
              </Button>
            </div>

            {/* Losses table */}
            <Card className="overflow-hidden">
              {lossesLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
                  <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--brand)] rounded-full animate-spin mb-3" />
                  <p className="text-sm">Chargement des pertes...</p>
                </div>
              ) : losses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
                  <AlertTriangle className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium">{t.pertes.noLosses}</p>
                  <p className="text-xs mt-1">{t.pertes.noLossesHint}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                        <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">{t.pertes.product}</th>
                        <th className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">{t.pertes.quantity}</th>
                        <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">{t.pertes.type}</th>
                        <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">{t.pertes.reason}</th>
                        <th className="text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">{t.pertes.value}</th>
                        <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">{t.pertes.date}</th>
                        <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">Heure</th>
                      </tr>
                    </thead>
                    <tbody>
                      {losses.map((loss) => (
                        <tr key={loss.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{loss.productName}</td>
                          <td className="px-4 py-3 text-sm text-center tabular-nums text-[var(--text-secondary)]">{loss.quantity}</td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex px-2 py-0.5 rounded-md text-xs font-medium", lossTypeColor(loss.type))}>
                              {lossTypeLabel(loss.type)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{loss.reason}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-red-600 tabular-nums text-right">{formatCurrency(loss.value)}</td>
                          <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                            {new Date(loss.date).toLocaleDateString("en-GB")}
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                            {new Date(loss.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[var(--background)] border-t border-[var(--border)]">
                        <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase">{t.pertes.total}</td>
                        <td className="px-4 py-3 text-sm font-bold text-red-600 tabular-nums text-right">{formatCurrency(totalLossValue)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}

        {/* ============ RETURNS TAB ============ */}
        {activeTab === "returns" && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <RotateCcw className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{t.pertes.returnsTitle}</p>
                    <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{returns.length}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{t.pertes.totalRefund}</p>
                    <p className="text-lg font-bold text-red-600 tabular-nums">
                      {formatCurrency(returns.reduce((s, r) => s + r.totalRefunded, 0))}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Package className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{t.pertes.stockRestocked}</p>
                    <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
                      {returns.reduce((s: number, r: any) => s + r.items.reduce((ss: number, it: any) => ss + it.quantity, 0), 0)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t.pertes.returnHistory}</h2>
                <p className="text-xs text-[var(--text-muted)]">{t.pertes.returnsSubtitle}</p>
              </div>
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowReturnModal(true)}>
                {t.pertes.newReturn}
              </Button>
            </div>

            {/* Returns list */}
            <Card className="overflow-hidden">
              {returns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
                  <RotateCcw className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium">{t.pertes.noReturns}</p>
                  <p className="text-xs mt-1">{t.pertes.noReturnsHint}</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {returns.map((ret) => (
                    <div key={ret.id} className="p-4 hover:bg-[var(--surface-hover)] transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="info" size="sm">#{ret.id.slice(-6).toUpperCase()}</Badge>
                          {ret.originalTransactionId && (
                            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                              <Link2 className="w-3 h-3" />
                              {t.pertes.linkedSale}: {ret.originalTransactionId.slice(-8)}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">
                          {new Date(ret.returnDate).toLocaleDateString("en-GB")}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {ret.items.map((it: any, i: number) => (
                          <span key={i} className="text-xs bg-[var(--surface)] px-2 py-1 rounded-lg">
                            {it.productName} ×{it.quantity} — {formatCurrency(it.total)}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex gap-3">
                          <span className="text-[var(--text-muted)]">{t.pertes.returnReason}: <span className="text-[var(--text-secondary)] font-medium">{ret.reason}</span></span>
                          <span className="text-[var(--text-muted)]">{t.pertes.resolution}: <span className="text-[var(--text-secondary)] font-medium">{ret.resolution}</span></span>
                        </div>
                        <span className="font-bold text-red-600 tabular-nums">{formatCurrency(ret.totalRefunded)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>

      {/* Modal: Declare loss */}
      {showLossModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowLossModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{t.pertes.reportLoss}</h3>
              <button onClick={() => setShowLossModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Liste des produits ajoutés */}
              {lossItems.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide block">
                    {t.pertes.product}s ({lossItems.length})
                  </label>
                  {lossItems.map((item) => (
                    <div key={item.productId} className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                      <Package className="w-4 h-4 text-red-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-semibold text-red-800 block truncate">{item.productName}</span>
                        <span className="text-[11px] text-red-600">x{item.quantity} · {lossTypeLabel(item.type)} · {formatCurrency(item.value)}</span>
                      </div>
                      <button
                        onClick={() => removeLossItem(item.productId)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-100 text-red-500 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Recherche produit */}
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.pertes.product}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setSelectedProduct(""); setSelectedProductData(null); }}
                    placeholder={t.pertes.searchProduct}
                    className="w-full pl-9 pr-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)]"
                  />
                </div>
                {(search || !selectedProduct) && filteredProducts.length > 0 && (
                  <div className="mt-1.5 max-h-40 overflow-y-auto border border-[var(--border)] rounded-xl divide-y divide-[var(--border-subtle)]">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProduct(p.id); setSelectedProductData(p); setSearch(p.name); }}
                        className="w-full text-left px-3 py-2 hover:bg-[var(--surface-hover)] text-sm flex justify-between items-center"
                      >
                        <span className="font-medium text-[var(--text-primary)]">{p.name}</span>
                        <span className="text-xs text-[var(--text-muted)]">Stock: {p.stock}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quantité + bouton ajouter */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.pertes.quantityLost}</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm tabular-nums outline-none focus:border-[var(--brand)]"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleAddLossItem}
                    disabled={!selectedProduct}
                    icon={<Plus className="w-4 h-4" />}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.pertes.lossType}</label>
                <div className="grid grid-cols-3 gap-2">
                  {lossTypes.map((lt) => (
                    <button
                      key={lt.value}
                      onClick={() => setLossType(lt.value)}
                      className={cn(
                        "px-2 py-2 rounded-lg text-xs font-medium border transition-all",
                        lossType === lt.value
                          ? "border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]"
                          : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                      )}
                    >
                      {lt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.pertes.reasonOptional}</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t.pertes.reasonPlaceholder}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)]"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-[var(--border)] flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowLossModal(false)}>
                {t.common.cancel}
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveAllLosses}
                disabled={lossItems.length === 0 || savingLosses || adjusting}
              >
                {savingLosses || adjusting ? t.common.processing : `${t.common.confirm} (${lossItems.length})`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New return */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowReturnModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{t.pertes.newReturn}</h3>
              <button onClick={() => setShowReturnModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Find original sale */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.pertes.findSale}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={saleSearch}
                  onChange={(e) => { setSaleSearch(e.target.value); setLinkedTransaction(null); }}
                  placeholder={t.pertes.findSalePh}
                  className="w-full pl-9 pr-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)]"
                />
              </div>
              {saleSearch && !linkedTransaction && filteredTx.length > 0 && (
                <div className="mt-1.5 max-h-40 overflow-y-auto border border-[var(--border)] rounded-xl divide-y divide-[var(--border-subtle)]">
                  {filteredTx.map((tx) => (
                    <button
                      key={tx.id}
                      onClick={() => handleLinkSale(tx)}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--surface-hover)] text-sm"
                    >
                      <div className="flex justify-between">
                        <span className="font-mono font-medium text-[var(--text-primary)]">#{tx.transactionNumber}</span>
                        <span className="font-bold tabular-nums">{formatCurrency(tx.total)}</span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {tx.cashier ? `${tx.cashier.firstName} ${tx.cashier.lastName}` : ""} · {new Date(tx.date).toLocaleDateString("en-GB")}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {linkedTransaction && (
                <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-emerald-700">{t.pertes.saleFound}: </span>
                    <span className="text-sm font-mono">#{linkedTransaction.transactionNumber}</span>
                    <span className="text-sm ml-2">{formatCurrency(linkedTransaction.total)}</span>
                  </div>
                  <button
                    onClick={() => { setLinkedTransaction(null); setSaleSearch(""); setReturnItems([]); }}
                    className="text-xs text-[var(--text-muted)] hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Select items to return */}
            {returnItems.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.pertes.selectItems}</label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {returnItems.map((it, idx) => (
                    <div key={idx} className={cn(
                      "flex items-center gap-3 p-2.5 rounded-xl border transition-all",
                      it.selected ? "border-[var(--brand)] bg-[var(--brand-light)]" : "border-[var(--border)]"
                    )}>
                      <input
                        type="checkbox"
                        checked={it.selected}
                        onChange={(e) => {
                          const newItems = [...returnItems];
                          newItems[idx].selected = e.target.checked;
                          setReturnItems(newItems);
                        }}
                        className="w-4 h-4 accent-[var(--brand)]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{it.productName}</p>
                        <p className="text-xs text-[var(--text-muted)]">{it.quantity} × {formatCurrency(it.unitPrice)}</p>
                      </div>
                      <span className="text-sm font-bold tabular-nums">{formatCurrency(it.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Return reason */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.pertes.returnReason}</label>
              <div className="grid grid-cols-3 gap-2">
                {returnReasons.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setReturnReason(r.value)}
                    className={cn(
                      "px-2 py-2 rounded-lg text-xs font-medium border transition-all",
                      returnReason === r.value
                        ? "border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]"
                        : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.pertes.resolution}</label>
              <div className="grid grid-cols-3 gap-2">
                {resolutions.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setResolution(r.value)}
                    className={cn(
                      "px-2 py-2 rounded-lg text-xs font-medium border transition-all",
                      resolution === r.value
                        ? "border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]"
                        : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Refund method (only if refund) */}
            {resolution === "refund" && (
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.pertes.refundMethod}</label>
                <div className="grid grid-cols-3 gap-2">
                  {["cash", "mobile", "storeCredit"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setRefundMethod(m)}
                      className={cn(
                        "px-2 py-2 rounded-lg text-xs font-medium border transition-all capitalize",
                        refundMethod === m
                          ? "border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]"
                          : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                      )}
                    >
                      {m === "cash" ? t.common.cash : m === "mobile" ? t.common.mobile : t.pertes.resolutions.storeCredit}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Client name */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.pertes.clientName}</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={t.pertes.clientNamePh}
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)]"
              />
            </div>

            {/* Total refund */}
            {totalRefund > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
                <span className="text-sm font-semibold text-red-700">{t.pertes.totalRefund}</span>
                <span className="text-xl font-bold text-red-600 tabular-nums">{formatCurrency(totalRefund)}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowReturnModal(false)}>
                {t.common.cancel}
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmitReturn}
                disabled={creatingReturn || returnItems.filter((it) => it.selected).length === 0}
              >
                {creatingReturn ? t.common.processing : t.common.confirm}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
