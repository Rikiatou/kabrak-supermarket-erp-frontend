"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Printer,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Clock,
  User,
  X,
  Eye,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth/context";
import { useLicense } from "@/lib/license/context";
import { transactionsApi, employeesApi, type ApiTransaction, type ApiEmployee } from "@/lib/api";
import { formatCurrency, formatDate, formatTime, cn } from "@/lib/utils";
import { reprintTicket } from "@/lib/utils/printReceipt";

const QUICK_DATES = [
  { label: "Aujourd'hui", days: 0 },
  { label: "Hier", days: 1 },
  { label: "7 jours", days: 7 },
  { label: "30 jours", days: 30 },
  { label: "Cette année", days: 365 },
];

const PAGE_SIZE = 50;

export default function ReprintPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const { config } = useLicense();

  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [cashierId, setCashierId] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Employees (for cashier filter)
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);

  // Preview modal
  const [previewTx, setPreviewTx] = useState<ApiTransaction | null>(null);
  const [printing, setPrinting] = useState<string | null>(null);

  // Load employees for filter
  useEffect(() => {
    (async () => {
      try {
        const res = await employeesApi.list();
        setEmployees(Array.isArray(res) ? res : (res as any)?.data || []);
      } catch {
        // ignore
      }
    })();
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await transactionsApi.list(page, PAGE_SIZE, cashierId || undefined, startDate, endDate);
      setTransactions(res.data || []);
      setTotal(res.meta?.total || 0);
      setTotalPages(res.meta?.totalPages || 1);
    } catch {
      toast("Erreur chargement transactions", "warning");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [page, cashierId, startDate, endDate, toast]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Filter by search (client-side on transaction number)
  const filteredTx = useMemo(() => {
    if (!search.trim()) return transactions;
    const s = search.toLowerCase();
    return transactions.filter(
      (tx) =>
        tx.transactionNumber?.toLowerCase().includes(s) ||
        tx.id?.toLowerCase().includes(s) ||
        tx.cashier?.firstName?.toLowerCase().includes(s) ||
        tx.cashier?.lastName?.toLowerCase().includes(s)
    );
  }, [transactions, search]);

  const setQuickDate = (days: number) => {
    const end = new Date();
    const start = new Date();
    if (days === 0) {
      // today only
    } else {
      start.setDate(start.getDate() - days);
    }
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
    setPage(1);
  };

  const handleReprint = async (tx: ApiTransaction) => {
    setPrinting(tx.id);
    // If items are missing, fetch full transaction
    let fullTx = tx;
    if (!tx.items || tx.items.length === 0) {
      try {
        fullTx = await transactionsApi.get(tx.id);
      } catch {
        toast("Erreur: détails transaction introuvables", "warning");
        setPrinting(null);
        return;
      }
    }
    const cashierName = fullTx.cashier
      ? `${fullTx.cashier.firstName} ${fullTx.cashier.lastName}`
      : user?.firstName || "CASHIER";
    const ok = reprintTicket(fullTx, { config, cashierName });
    if (ok) {
      toast("Ticket envoyé à l'imprimante", "success");
    } else {
      toast("Erreur impression — réessayer", "warning");
    }
    setTimeout(() => setPrinting(null), 1500);
  };

  const methodBadge = (method: string) => {
    const styles: Record<string, string> = {
      cash: "bg-emerald-100 text-emerald-700",
      card: "bg-blue-100 text-blue-700",
      mobile: "bg-purple-100 text-purple-700",
      orange: "bg-orange-100 text-orange-700",
      split: "bg-amber-100 text-amber-700",
    };
    const labels: Record<string, string> = {
      cash: "Espèces",
      card: "Carte",
      mobile: "Mobile",
      orange: "Orange",
      split: "Mixte",
    };
    return (
      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", styles[method] || "bg-slate-100 text-slate-700")}>
        {labels[method] || method}
      </span>
    );
  };

  return (
    <AppShell title="Réimpression de Tickets">
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-light)] flex items-center justify-center">
            <Printer className="w-5 h-5 text-[var(--brand)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Réimpression de Tickets</h1>
            <p className="text-xs text-[var(--text-muted)]">
              {total} transaction(s) — recherchez et réimprimez n'importe quel ticket
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-4 p-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Quick dates */}
            <div className="flex gap-1.5 flex-wrap">
              {QUICK_DATES.map((qd) => (
                <button
                  key={qd.days}
                  onClick={() => setQuickDate(qd.days)}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-[var(--brand-light)] hover:text-[var(--brand)] rounded-lg transition-colors"
                >
                  {qd.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Du
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="bg-white border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--brand)]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Au
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="bg-white border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--brand)]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Caissier</label>
              <select
                value={cashierId}
                onChange={(e) => { setCashierId(e.target.value); setPage(1); }}
                className="bg-white border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--brand)]"
              >
                <option value="">Tous</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase flex items-center gap-1">
                <Search className="w-3 h-3" /> N° Transaction / Caissier
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="bg-white border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--brand)]"
              />
            </div>
          </div>
        </Card>

        {/* Transaction list */}
        <Card padding="none">
          {loading ? (
            <div className="p-8 text-center text-sm text-[var(--text-muted)]">Chargement...</div>
          ) : filteredTx.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--text-muted)]">
              Aucune transaction trouvée pour cette période.
            </div>
          ) : (
            <>
              <div className="divide-y divide-[var(--border-subtle)]">
                {filteredTx.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                      <ShoppingCart className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          #{tx.transactionNumber || tx.id.slice(-6)}
                        </span>
                        {methodBadge(tx.paymentMethod)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-0.5">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {tx.cashier ? `${tx.cashier.firstName} ${tx.cashier.lastName}` : "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(tx.date)} {formatTime(tx.date)}
                        </span>
                        <span>{tx.items?.length || 0} art.</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold tabular-nums text-[var(--text-primary)]">
                        {formatCurrency(tx.total)}
                      </div>
                      {tx.discount > 0 && (
                        <div className="text-xs text-red-500 tabular-nums">-{formatCurrency(tx.discount)}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setPreviewTx(tx)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-slate-100 hover:text-[var(--text-primary)] transition-colors"
                        title="Aperçu"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReprint(tx)}
                        disabled={printing === tx.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand)] text-white rounded-lg text-xs font-semibold hover:opacity-80 disabled:opacity-50 transition-opacity"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        {printing === tx.id ? "..." : "Imprimer"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] bg-slate-50">
                  <span className="text-xs text-[var(--text-muted)]">
                    Page {page} / {totalPages} — {total} transaction(s)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Preview Modal */}
      {previewTx && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setPreviewTx(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-[var(--border)] px-5 py-3 flex items-center justify-between z-10">
              <h2 className="text-sm font-bold">
                Ticket #{previewTx.transactionNumber || previewTx.id.slice(-6)}
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Printer className="w-3.5 h-3.5" />}
                  onClick={() => handleReprint(previewTx)}
                  disabled={printing === previewTx.id}
                >
                  {printing === previewTx.id ? "..." : "Imprimer"}
                </Button>
                <button onClick={() => setPreviewTx(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Date:</span>
                  <span className="font-semibold">{formatDate(previewTx.date)} {formatTime(previewTx.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Caissier:</span>
                  <span className="font-semibold">
                    {previewTx.cashier ? `${previewTx.cashier.firstName} ${previewTx.cashier.lastName}` : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Paiement:</span>
                  <span className="font-semibold capitalize">{previewTx.paymentMethod}</span>
                </div>
              </div>
              <div className="border-t border-dashed border-[var(--border)] pt-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[var(--text-muted)]">
                      <th className="text-left pb-1">Article</th>
                      <th className="text-center pb-1">Qté</th>
                      <th className="text-right pb-1">Prix</th>
                      <th className="text-right pb-1">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewTx.items || []).map((item, i) => (
                      <tr key={i} className="border-t border-[var(--border-subtle)]">
                        <td className="py-1.5">{item.product?.name || "Product"}</td>
                        <td className="text-center py-1.5">{item.quantity}</td>
                        <td className="text-right py-1.5 tabular-nums">{formatCurrency(item.unitPrice)}</td>
                        <td className="text-right py-1.5 tabular-nums font-semibold">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </td>
                      </tr>
                    ))}
                    {(!previewTx.items || previewTx.items.length === 0) && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-[var(--text-muted)]">
                          Détails non chargés — cliquez Imprimer pour récupérer
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-dashed border-[var(--border)] pt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Sous-total</span>
                  <span className="tabular-nums">{formatCurrency(previewTx.subtotal)}</span>
                </div>
                {previewTx.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Remise</span>
                    <span className="tabular-nums">-{formatCurrency(previewTx.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-[var(--border-subtle)] pt-1">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(previewTx.total)}</span>
                </div>
                {previewTx.cashGiven != null && (
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>Reçu</span>
                    <span className="tabular-nums">{formatCurrency(previewTx.cashGiven)}</span>
                  </div>
                )}
                {previewTx.change != null && previewTx.change > 0 && (
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>Monnaie</span>
                    <span className="tabular-nums">{formatCurrency(previewTx.change)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
