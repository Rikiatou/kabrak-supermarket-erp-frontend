"use client";

import { useState, useEffect, useCallback } from "react";
import { RotateCcw, Search, ArrowLeft, Trash2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/context";
import { useToast } from "@/components/ui/Toast";
import { returnsApi, transactionsApi, productsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ApiTransaction } from "@/lib/api";

interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function ReturnsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTx, setSelectedTx] = useState<ApiTransaction | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [reason, setReason] = useState("");
  const [resolution, setResolution] = useState<"refund" | "exchange" | "store_credit">("refund");
  const [refundMethod, setRefundMethod] = useState("cash");
  const [clientName, setClientName] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recentReturns, setRecentReturns] = useState<any[]>([]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await transactionsApi.list(1, 20);
      setTransactions(res.data || []);
    } catch {
      toast("Erreur chargement transactions", "warning");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadReturns = useCallback(async () => {
    try {
      const res = await returnsApi.list();
      setRecentReturns(Array.isArray(res) ? res : (res as any).data || []);
    } catch {
      // API might not have list endpoint
    }
  }, []);

  useEffect(() => {
    loadTransactions();
    loadReturns();
  }, [loadTransactions, loadReturns]);

  const filteredTx = transactions.filter((tx) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return tx.transactionNumber?.toLowerCase().includes(s) || tx.id?.toLowerCase().includes(s);
  });

  const selectTransaction = (tx: ApiTransaction) => {
    setSelectedTx(tx);
    const items: ReturnItem[] = (tx.items || []).map((item) => ({
      productId: item.productId || "",
      productName: item.product?.name || "Product",
      quantity: 0,
      unitPrice: item.unitPrice,
      total: 0,
    }));
    setReturnItems(items);
  };

  const updateItem = (idx: number, qty: number) => {
    setReturnItems((items) =>
      items.map((item, i) => {
        if (i !== idx) return item;
        const q = Math.max(0, Math.min(qty, txItemMaxQty(idx)));
        return { ...item, quantity: q, total: q * item.unitPrice };
      })
    );
  };

  const txItemMaxQty = (idx: number) => {
    if (!selectedTx?.items) return 999;
    return selectedTx.items[idx]?.quantity || 999;
  };

  const totalRefund = returnItems.reduce((s, i) => s + i.total, 0);

  const handleSubmit = async () => {
    if (!selectedTx) {
      toast("Sélectionnez une transaction", "warning");
      return;
    }
    if (returnItems.every((i) => i.quantity === 0)) {
      toast("Sélectionnez au moins un article à retourner", "warning");
      return;
    }
    if (!reason) {
      toast("Indiquez un motif de retour", "warning");
      return;
    }

    setSubmitting(true);
    try {
      await returnsApi.create({
        originalTransactionId: selectedTx.id,
        clientName: clientName || undefined,
        reason,
        resolution,
        note,
        refundMethod: resolution === "refund" ? refundMethod : undefined,
        items: returnItems.filter((i) => i.quantity > 0).map((i) => ({
          productId: i.productId || undefined,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total,
        })),
      });
      toast("Retour enregistré avec succès", "success");
      // Reset
      setSelectedTx(null);
      setReturnItems([]);
      setReason("");
      setClientName("");
      setNote("");
      loadReturns();
    } catch (e: any) {
      toast(e?.message || "Erreur enregistrement retour", "warning");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#f0f2f5] overflow-hidden">
      {/* Topbar */}
      <div className="h-11 bg-white border-b border-[#e5e7eb] flex items-center px-5 gap-4 shrink-0 shadow-sm">
        <button
          onClick={() => router.push("/pos")}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
            <RotateCcw className="w-4 h-4 text-white" />
          </div>
          <span className="text-[14px] font-bold text-[#111827]">Retours Produits</span>
        </div>
        <span className="text-[13px] font-medium text-[#6b7280] ml-2">{user?.firstName} {user?.lastName}</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Transaction search */}
        <div className="w-[40%] flex flex-col bg-white border-r border-[#e5e7eb] shrink-0">
          <div className="p-4 border-b border-[#e5e7eb]">
            <h2 className="text-sm font-bold text-[#111827] mb-3">1. Rechercher la transaction</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="N° transaction..."
                className="w-full pl-10 pr-4 py-2.5 border border-[#e5e7eb] rounded-xl text-sm outline-none focus:border-[#f97316]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-[#9ca3af]">Chargement...</div>
            ) : filteredTx.length === 0 ? (
              <div className="p-4 text-center text-sm text-[#9ca3af]">Aucune transaction</div>
            ) : (
              filteredTx.map((tx) => (
                <button
                  key={tx.id}
                  onClick={() => selectTransaction(tx)}
                  className={`w-full text-left p-3 border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors ${
                    selectedTx?.id === tx.id ? "bg-orange-50 border-l-4 border-l-orange-500" : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">#{tx.transactionNumber || tx.id.slice(-6)}</p>
                      <p className="text-xs text-[#9ca3af]">{new Date(tx.date).toLocaleString("fr-FR")}</p>
                      <p className="text-xs text-[#6b7280] mt-0.5">{tx.items?.length || 0} article(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#111827]">{formatCurrency(tx.total)}</p>
                      <p className="text-xs text-[#9ca3af] capitalize">{tx.paymentMethod}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Return form */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedTx ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <RotateCcw className="w-16 h-16 text-[#d1d5db] mx-auto mb-4" />
                <p className="text-sm text-[#9ca3af]">Sélectionnez une transaction à gauche</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Transaction info */}
                <div className="bg-white rounded-xl p-4 border border-[#e5e7eb]">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-[#9ca3af]">Transaction</p>
                      <p className="text-sm font-bold text-[#111827]">#{selectedTx.transactionNumber || selectedTx.id.slice(-6)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#9ca3af]">Total original</p>
                      <p className="text-sm font-bold text-[#111827]">{formatCurrency(selectedTx.total)}</p>
                    </div>
                  </div>
                </div>

                {/* Items to return */}
                <div className="bg-white rounded-xl p-4 border border-[#e5e7eb]">
                  <h3 className="text-sm font-bold text-[#111827] mb-3">2. Articles à retourner</h3>
                  {returnItems.length === 0 ? (
                    <p className="text-sm text-[#9ca3af]">Aucun article dans cette transaction</p>
                  ) : (
                    <div className="space-y-2">
                      {returnItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-[#f9fafb]">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#111827]">{item.productName}</p>
                            <p className="text-xs text-[#9ca3af]">{formatCurrency(item.unitPrice)} / unité</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#9ca3af]">Qté max: {txItemMaxQty(idx)}</span>
                            <input
                              type="number"
                              min={0}
                              max={txItemMaxQty(idx)}
                              value={item.quantity || ""}
                              onChange={(e) => updateItem(idx, parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className="w-20 px-2 py-1.5 border border-[#e5e7eb] rounded-lg text-sm text-center outline-none focus:border-[#f97316]"
                            />
                          </div>
                          <div className="w-24 text-right">
                            <p className="text-sm font-bold text-[#111827]">{formatCurrency(item.total)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {totalRefund > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#e5e7eb] flex justify-between">
                      <span className="text-sm font-bold text-[#111827]">Total à rembourser</span>
                      <span className="text-lg font-bold text-orange-600">{formatCurrency(totalRefund)}</span>
                    </div>
                  )}
                </div>

                {/* Return details */}
                <div className="bg-white rounded-xl p-4 border border-[#e5e7eb] space-y-3">
                  <h3 className="text-sm font-bold text-[#111827]">3. Détails du retour</h3>

                  <div>
                    <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Client (optionnel)</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Nom du client"
                      className="w-full mt-1 px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm outline-none focus:border-[#f97316]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Motif du retour</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Ex: Produit défectueux, erreur..."
                      className="w-full mt-1 px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm outline-none focus:border-[#f97316]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Résolution</label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {(["refund", "exchange", "store_credit"] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setResolution(r)}
                          className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                            resolution === r
                              ? "border-orange-500 bg-orange-50 text-orange-600"
                              : "border-[#e5e7eb] text-[#6b7280] hover:bg-[#f9fafb]"
                          }`}
                        >
                          {r === "refund" ? "Remboursement" : r === "exchange" ? "Échange" : "Avoir"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {resolution === "refund" && (
                    <div>
                      <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Méthode de remboursement</label>
                      <select
                        value={refundMethod}
                        onChange={(e) => setRefundMethod(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm outline-none focus:border-[#f97316] bg-white"
                      >
                        <option value="cash">Espèces</option>
                        <option value="mobile">Mobile Money</option>
                        <option value="orange">Orange Money</option>
                        <option value="card">Carte</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Note (optionnel)</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Notes supplémentaires..."
                      rows={2}
                      className="w-full mt-1 px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm outline-none focus:border-[#f97316] resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="p-4 border-t border-[#e5e7eb] bg-white">
                <Button
                  className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={totalRefund === 0 || !reason || submitting}
                  onClick={handleSubmit}
                  icon={submitting ? <RotateCcw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                >
                  {submitting ? "Enregistrement..." : `Valider le retour (${formatCurrency(totalRefund)})`}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
