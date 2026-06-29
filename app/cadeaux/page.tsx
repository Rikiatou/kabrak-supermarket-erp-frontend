"use client";

import { useState, useMemo } from "react";
import {
  Gift,
  Plus,
  Search,
  Users,
  User,
  Package,
  X,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth/context";
import { useProducts } from "@/lib/hooks/useApi";
import { stockApi } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import type { ApiStockMovement } from "@/lib/api";

type RecipientType = "staff" | "other";

export default function CadeauxPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();

  const { products: apiProducts } = useProducts();

  // Historique des cadeaux — chargé depuis les mouvements de stock
  const [giftMovements, setGiftMovements] = useState<ApiStockMovement[]>([]);
  const [loadingGifts, setLoadingGifts] = useState(false);
  const [giftsLoaded, setGiftsLoaded] = useState(false);

  const loadGifts = async () => {
    if (giftsLoaded) return;
    setLoadingGifts(true);
    try {
      const res = await stockApi.listMovements(1, 200);
      const gifts = res.data.filter(
        (m) => m.reason === "gift_staff" || m.reason === "gift_other"
      );
      // Si cashier: ne voir que ses propres cadeaux
      const isPrivileged = ["boss", "manager", "accountant", "supervisor"].includes(user?.role ?? "");
      setGiftMovements(isPrivileged ? gifts : gifts.filter((m) => m.createdBy === user?.id));
    } catch {
      toast(t.gifts.loadError, "warning");
    } finally {
      setLoadingGifts(false);
      setGiftsLoaded(true);
    }
  };

  // Charger au montage
  useMemo(() => { loadGifts(); }, []); // eslint-disable-line

  // --- Modal state ---
  const [showModal, setShowModal] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [recipientType, setRecipientType] = useState<RecipientType>("staff");
  const [recipientName, setRecipientName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const filteredProducts = useMemo(() =>
    apiProducts
      .filter((p) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.barcode && p.barcode.includes(productSearch))
      )
      .slice(0, 8),
  [apiProducts, productSearch]);

  const selectedProduct = apiProducts.find((p) => p.id === selectedProductId);

  const resetModal = () => {
    setProductSearch("");
    setSelectedProductId("");
    setQuantity(1);
    setRecipientType("staff");
    setRecipientName("");
    setNotes("");
    setSaved(false);
  };

  const handleSave = async () => {
    if (!selectedProductId) { toast(t.gifts.selectProductRequired, "warning"); return; }
    if (quantity < 1) { toast(t.gifts.quantityRequired, "warning"); return; }
    if (!recipientName.trim()) { toast(t.gifts.recipientRequired, "warning"); return; }

    setSaving(true);
    try {
      await stockApi.createMovement({
        productId: selectedProductId,
        type: "out",
        quantity: -Math.abs(quantity), // négatif = sortie stock
        reason: recipientType === "staff" ? "gift_staff" : "gift_other",
        notes: `${recipientName.trim()}${notes.trim() ? ` — ${notes.trim()}` : ""}`,
        createdBy: user?.id,
      });

      setSaved(true);
      toast(t.gifts.savedSuccess, "success");

      // Recharger les cadeaux
      setGiftsLoaded(false);
      const res = await stockApi.listMovements(1, 200);
      const gifts = res.data.filter((m) => m.reason === "gift_staff" || m.reason === "gift_other");
      const isPrivileged = ["boss", "manager", "accountant", "supervisor"].includes(user?.role ?? "");
      setGiftMovements(isPrivileged ? gifts : gifts.filter((m) => m.createdBy === user?.id));
      setGiftsLoaded(true);

      setTimeout(() => {
        setShowModal(false);
        resetModal();
      }, 1400);
    } catch {
      toast(t.gifts.saveError, "warning");
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const totalGifts = giftMovements.length;
  const staffGifts = giftMovements.filter((m) => m.reason === "gift_staff").length;
  const otherGifts = giftMovements.filter((m) => m.reason === "gift_other").length;

  return (
    <AppShell title={t.gifts.title} subtitle={t.gifts.subtitle}>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: t.gifts.totalGifts, value: totalGifts, icon: <Gift className="w-5 h-5 text-violet-600" />, tone: "bg-violet-50" },
          { label: t.gifts.staffGifts, value: staffGifts, icon: <Users className="w-5 h-5 text-blue-600" />, tone: "bg-blue-50" },
          { label: t.gifts.otherGifts, value: otherGifts, icon: <User className="w-5 h-5 text-emerald-600" />, tone: "bg-emerald-50" },
        ].map((kpi) => (
          <Card key={kpi.label} padding="md">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", kpi.tone)}>
                {kpi.icon}
              </div>
              <div>
                <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums">{kpi.value}</p>
                <p className="text-xs text-[var(--text-muted)]">{kpi.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Header + bouton */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--text-muted)]">{t.gifts.listHint}</p>
        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => { resetModal(); setShowModal(true); }}
        >
          {t.gifts.recordGift}
        </Button>
      </div>

      {/* Liste */}
      {loadingGifts ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : giftMovements.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 text-center">
          <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center">
            <Gift className="w-8 h-8 text-violet-400" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-secondary)]">{t.gifts.emptyTitle}</p>
          <p className="text-xs text-[var(--text-muted)]">{t.gifts.emptyHint}</p>
        </div>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {[t.gifts.colDate, t.gifts.colProduct, t.gifts.colQty, t.gifts.colRecipientType, t.gifts.colRecipient, t.gifts.colRecordedBy].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {giftMovements.map((m) => {
                  const isStaff = m.reason === "gift_staff";
                  const productName = m.product?.name ?? m.productId;
                  const qty = Math.abs(m.quantity);
                  const employeeName = m.employee
                    ? `${m.employee.firstName} ${m.employee.lastName}`
                    : m.createdBy ?? "—";
                  // notes format: "recipient — extra notes"
                  const notesParts = (m.notes ?? "").split(" — ");
                  const recipientDisplay = notesParts[0] || "—";
                  const extraNotes = notesParts.slice(1).join(" — ");
                  return (
                    <tr key={m.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-hover)] transition-colors">
                      <td className="px-4 py-3 text-[13px] text-[var(--text-muted)] whitespace-nowrap">
                        {formatDate(m.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                          <span className="text-[13px] font-medium text-[var(--text-primary)]">{productName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] font-bold text-[var(--text-primary)] tabular-nums">
                        {qty}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={isStaff ? "info" : "success"} size="sm">
                          <span className="flex items-center gap-1">
                            {isStaff ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            {isStaff ? t.gifts.typeStaff : t.gifts.typeOther}
                          </span>
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[13px] text-[var(--text-primary)]">{recipientDisplay}</p>
                        {extraNotes && <p className="text-[11px] text-[var(--text-muted)]">{extraNotes}</p>}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                        {employeeName}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal enregistrer cadeau */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md pointer-events-auto flex flex-col max-h-[90vh]">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
                    <Gift className="w-5 h-5 text-violet-600" />
                  </div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">{t.gifts.modalTitle}</h2>
                </div>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
                  <X className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
              </div>

              {/* Success */}
              {saved ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <p className="text-base font-semibold text-[var(--text-primary)]">{t.gifts.savedSuccess}</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                  {/* Produit */}
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-2">
                      {t.gifts.product} *
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => { setProductSearch(e.target.value); setSelectedProductId(""); }}
                        placeholder={t.gifts.productSearchPh}
                        className="w-full pl-9 pr-3 py-2.5 border border-[var(--border)] rounded-xl text-[13px] outline-none focus:border-[var(--brand)]"
                      />
                    </div>
                    {selectedProduct && (
                      <div className="mt-2 flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2">
                        <Package className="w-4 h-4 text-violet-600 shrink-0" />
                        <span className="text-[13px] font-semibold text-violet-800">{selectedProduct.name}</span>
                        <span className="text-[12px] text-violet-600 ml-auto">Stock: {selectedProduct.stock}</span>
                      </div>
                    )}
                    {productSearch && !selectedProductId && filteredProducts.length > 0 && (
                      <div className="mt-1 border border-[var(--border)] rounded-xl overflow-hidden">
                        {filteredProducts.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => { setSelectedProductId(p.id); setProductSearch(p.name); }}
                            className="w-full text-left px-3 py-2.5 text-[13px] hover:bg-slate-50 flex items-center justify-between border-b border-[var(--border)] last:border-0"
                          >
                            <span>{p.name}</span>
                            <span className="text-[11px] text-[var(--text-muted)]">Stock: {p.stock}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quantité */}
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-2">
                      {t.gifts.quantity} *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[var(--brand)]"
                    />
                  </div>

                  {/* Type de bénéficiaire */}
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-2">
                      {t.gifts.recipientType} *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setRecipientType("staff")}
                        className={cn(
                          "flex items-center justify-center gap-2 h-11 rounded-xl border-2 text-[13px] font-semibold transition-all",
                          recipientType === "staff"
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-slate-50"
                        )}
                      >
                        <Users className="w-4 h-4" />
                        {t.gifts.typeStaff}
                      </button>
                      <button
                        onClick={() => setRecipientType("other")}
                        className={cn(
                          "flex items-center justify-center gap-2 h-11 rounded-xl border-2 text-[13px] font-semibold transition-all",
                          recipientType === "other"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-slate-50"
                        )}
                      >
                        <User className="w-4 h-4" />
                        {t.gifts.typeOther}
                      </button>
                    </div>
                  </div>

                  {/* Nom du bénéficiaire */}
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-2">
                      {recipientType === "staff" ? t.gifts.staffName : t.gifts.clientName} *
                    </label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder={recipientType === "staff" ? t.gifts.staffNamePh : t.gifts.clientNamePh}
                      className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[var(--brand)]"
                    />
                  </div>

                  {/* Notes optionnelles */}
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-2">
                      {t.gifts.notes}
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t.gifts.notesPh}
                      className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[var(--brand)]"
                    />
                  </div>
                </div>
              )}

              {/* Footer */}
              {!saved && (
                <div className="px-6 py-4 border-t border-[var(--border)] shrink-0 flex gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 h-11 rounded-xl border border-[var(--border)] text-[13px] font-semibold text-[var(--text-secondary)] hover:bg-slate-50"
                  >
                    {t.common.cancel}
                  </button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "..." : t.gifts.save}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
