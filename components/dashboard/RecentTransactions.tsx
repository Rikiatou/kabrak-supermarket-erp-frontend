"use client";

import { CreditCard, Banknote, Smartphone, RotateCcw, CheckCircle } from "lucide-react";
import { recentTransactions as mockTx } from "@/lib/mock-data";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatTime } from "@/lib/utils";
import { useRecentTransactions } from "@/lib/hooks/useApi";

const paymentIcons: Record<string, any> = {
  cash: Banknote,
  card: CreditCard,
  mobile: Smartphone,
};

const paymentLabels: Record<string, string> = {
  cash: "Espèces",
  card: "Carte",
  mobile: "Mobile Money",
};

export function RecentTransactions() {
  const { transactions } = useRecentTransactions(10);

  // Convertir les transactions du backend au format affichable
  const backendTx = transactions.map((tx) => ({
    id: tx.transactionNumber,
    date: tx.date,
    cashier: tx.cashier ? `${tx.cashier.firstName} ${tx.cashier.lastName}` : "Caissier",
    total: tx.total,
    paymentMethod: tx.paymentMethod as "cash" | "card" | "mobile",
    status: tx.status as "completed" | "refunded" | "pending",
  }));

  // Fallback sur mock si backend indisponible
  const displayTx = backendTx.length > 0 ? backendTx : mockTx;

  return (
    <div className="space-y-0">
      {displayTx.map((tx, i) => {
        const PayIcon = paymentIcons[tx.paymentMethod] || Banknote;
        const isRefunded = tx.status === "refunded";

        return (
          <div
            key={tx.id + i}
            className="flex items-center gap-3 py-3 border-b border-[var(--border-subtle)] last:border-0"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isRefunded ? "bg-red-50" : "bg-[var(--brand-light)]"
              }`}
            >
              {isRefunded ? (
                <RotateCcw className="w-4 h-4 text-red-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-[var(--brand)]" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-mono text-[var(--text-muted)]">
                  {tx.id.replace("TXN-", "#")}
                </span>
                <Badge variant={isRefunded ? "danger" : "success"} size="sm">
                  {isRefunded ? "Remboursé" : "Validé"}
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-muted)] truncate">{tx.cashier}</p>
            </div>

            <div className="text-right shrink-0">
              <p
                className={`text-sm font-semibold tabular-nums ${
                  isRefunded ? "text-red-500 line-through" : "text-[var(--text-primary)]"
                }`}
              >
                {formatCurrency(tx.total)}
              </p>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <PayIcon className="w-3 h-3 text-[var(--text-muted)]" />
                <span className="text-[11px] text-[var(--text-muted)]">
                  {paymentLabels[tx.paymentMethod] || tx.paymentMethod} · {formatTime(tx.date)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
