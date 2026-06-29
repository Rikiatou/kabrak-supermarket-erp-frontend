"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  Package,
  TrendingDown,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/Toast";
import { useProducts, useStockAdjust } from "@/lib/hooks/useApi";
import { products as mockProducts } from "@/lib/mock-data";
import { formatCurrency, cn } from "@/lib/utils";

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
  const { products: apiProducts, reload: reloadProducts } = useProducts();
  const { adjust, adjusting } = useStockAdjust();
  const products = apiProducts.length > 0 ? apiProducts : mockProducts;

  const lossTypes = [
    { value: "damage", label: t.pertes.lossTypes.damage, color: "text-red-600 bg-red-50" },
    { value: "expiry", label: t.pertes.lossTypes.expiry, color: "text-amber-600 bg-amber-50" },
    { value: "theft", label: t.pertes.lossTypes.theft, color: "text-purple-600 bg-purple-50" },
    { value: "loss", label: t.pertes.lossTypes.loss, color: "text-slate-600 bg-slate-50" },
    { value: "other", label: t.pertes.lossTypes.other, color: "text-blue-600 bg-blue-50" },
  ];

  const [losses, setLosses] = useState<LossEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [lossType, setLossType] = useState("damage");
  const [reason, setReason] = useState("");

  const filteredProducts = products
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search))
    .slice(0, 10);

  const totalLossValue = losses.reduce((s, l) => s + l.value, 0);
  const totalLossCount = losses.length;

  const handleAddLoss = async () => {
    const product = products.find((p) => p.id === selectedProduct);
    if (!product || quantity < 1) return;

    // Validation: quantité ne peut pas dépasser le stock
    if (quantity > product.stock) {
      toast(t.pertes.insufficientStock.replace("{stock}", String(product.stock)), "warning");
      return;
    }

    try {
      // Ajuster le stock via le backend
      await adjust(product.id, Math.max(0, product.stock - quantity), `${lossType}: ${reason || t.pertes.lossTypes.loss}`);
      reloadProducts();
    } catch (e) {
      toast(t.pertes.stockAdjustmentError, "warning");
      return;
    }

    const entry: LossEntry = {
      id: `LOSS-${Date.now()}`,
      productName: product.name,
      productId: product.id,
      quantity,
      type: lossType,
      reason: reason || lossTypes.find((l) => l.value === lossType)?.label || t.pertes.lossTypes.loss,
      value: product.costPrice * quantity,
      date: new Date().toISOString(),
    };

    setLosses([entry, ...losses]);
    toast(`${t.pertes.lossSaved} ${product.name} ×${quantity} - ${formatCurrency(entry.value)}`, "warning");
    setShowModal(false);
    setSelectedProduct("");
    setQuantity(1);
    setReason("");
    setSearch("");
  };

  const lossTypeLabel = (type: string) => lossTypes.find((l) => l.value === type)?.label || type;
  const lossTypeColor = (type: string) => lossTypes.find((l) => l.value === type)?.color || "text-slate-600 bg-slate-50";

  return (
    <AppShell title={t.pertes.title} subtitle={t.pertes.subtitle}>
      <div className="space-y-4">
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
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
            {t.pertes.declareLoss}
          </Button>
        </div>

        {/* Losses table */}
        <Card className="overflow-hidden">
          {losses.length === 0 ? (
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
                    <th className="px-4 py-3"></th>
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
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setLosses(losses.filter((l) => l.id !== loss.id))}
                          className="p-1 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-red-500" />
                        </button>
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
      </div>

      {/* Modal: Declare loss */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{t.pertes.reportLoss}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Product search */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.pertes.product}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.pertes.searchProduct}
                  className="w-full pl-9 pr-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)]"
                />
              </div>
              {search && (
                <div className="mt-1.5 max-h-40 overflow-y-auto border border-[var(--border)] rounded-xl divide-y divide-[var(--border-subtle)]">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProduct(p.id);
                        setSearch(p.name);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--surface-hover)] text-sm flex justify-between items-center"
                    >
                      <span className="font-medium text-[var(--text-primary)]">{p.name}</span>
                      <span className="text-xs text-[var(--text-muted)]">Stock: {p.stock}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.pertes.quantityLost}</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm tabular-nums outline-none focus:border-[var(--brand)]"
              />
            </div>

            {/* Loss type */}
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

            {/* Reason */}
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

            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>
                {t.common.cancel}
              </Button>
              <Button className="flex-1" onClick={handleAddLoss} disabled={!selectedProduct || adjusting}>
                {adjusting ? t.common.processing : t.common.confirm}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
