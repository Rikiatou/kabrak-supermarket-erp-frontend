"use client";

import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { formatCurrency } from "@/lib/utils";
import type { ApiZReport } from "@/lib/api";

function formatDateTime(date: string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function ZReportReceipt({
  report,
  onClose,
}: {
  report: ApiZReport;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const z = t.caisses?.zReport || {
    title: "Z-REPORT",
    closingReport: "RAPPORT DE CLÔTURE",
    station: "Caisse",
    operator: "Opérateur",
    opened: "Ouvert",
    closed: "Fermé",
    grossSales: "Ventes brutes",
    returnsAndCredits: "Retours & avoirs",
    totalDiscount: "Réductions totales",
    totalTax: "Taxe totale",
    netSales: "Ventes nettes",
    nonTaxableSales: "Ventes non taxables",
    receiptsByMethod: "Encaissements par mode de paiement",
    cash: "Espèces",
    card: "Carte",
    mobile: "Mobile Money",
    split: "Paiement mixte",
    totalReceipts: "Total encaissements",
    changeGiven: "Monnaie rendue",
    openingCash: "Fonds d'ouverture",
    cashReceived: "Espèces reçues",
    cashDrawerTotal: "Total caisse",
    totalExpected: "Total attendu",
    expectedCash: "Caisse attendue",
    closingCash: "Caisse comptée",
    difference: "Écart",
    customerCount: "Nombre de clients",
    averageSale: "Vente moyenne",
    notes: "Notes",
    print: "Imprimer",
    close: "Fermer",
    noNotes: "Aucune note",
  };

  const handlePrint = () => {
    const printContent = document.getElementById("z-report-print");
    if (!printContent) return;
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Z-Report ${report.registerName}</title>
          <style>
            * { font-family: 'Courier New', monospace; font-size: 12px; }
            body { padding: 16px; max-width: 380px; margin: 0 auto; }
            h1 { font-size: 16px; text-align: center; margin: 0 0 4px; }
            h2 { font-size: 14px; text-align: center; margin: 0 0 8px; }
            .center { text-align: center; }
            .row { display: flex; justify-content: space-between; padding: 2px 0; }
            .section { border-top: 1px dashed #000; margin-top: 8px; padding-top: 8px; }
            .bold { font-weight: bold; }
            .large { font-size: 14px; }
            .muted { color: #666; }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 250);
  };

  // Expected cash = opening + cash received - change given (calcul correct)
  const expectedCash = (report.openingCash ?? 0) + (report.cashReceived ?? report.receiptsByMethod?.cash ?? 0) - (report.changeGiven ?? 0);
  const countedCash = report.closingCash ?? 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[var(--border)] px-5 py-3 flex items-center justify-between z-10">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            {z.title} — {report.registerName}
          </h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={<Printer className="w-3.5 h-3.5" />} onClick={handlePrint}>
              {z.print}
            </Button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
              <X className="w-4 h-4 text-[var(--text-muted)]" />
            </button>
          </div>
        </div>

        {/* Printable area */}
        <div id="z-report-print" className="p-5 space-y-4">
          {/* Title */}
          <div className="text-center">
            <h1 className="text-base font-bold tracking-wider">{z.title}</h1>
            <p className="text-xs text-[var(--text-muted)]">{z.closingReport}</p>
          </div>

          {/* Shift info */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">{z.station}:</span>
              <span className="font-semibold">{report.registerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">{z.operator}:</span>
              <span className="font-semibold">{report.employeeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">{z.opened}:</span>
              <span className="tabular-nums">{formatDateTime(report.openedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">{z.closed}:</span>
              <span className="tabular-nums">{formatDateTime(report.closedAt)}</span>
            </div>
          </div>

          {/* Sales summary */}
          <div className="border-t border-dashed border-[var(--border)] pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>{z.grossSales}</span>
              <span className="font-semibold tabular-nums">{formatCurrency(report.grossSales)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{z.returnsAndCredits}</span>
              <span className="font-semibold tabular-nums">{formatCurrency(report.returnsAndCredits)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{z.totalDiscount}</span>
              <span className="font-semibold tabular-nums text-red-600">-{formatCurrency(report.totalDiscount)}</span>
            </div>
            {report.totalTax > 0 && (
              <div className="flex justify-between text-sm">
                <span>{z.totalTax}</span>
                <span className="font-semibold tabular-nums">{formatCurrency(report.totalTax)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>{z.nonTaxableSales}</span>
              <span className="font-semibold tabular-nums">{formatCurrency(report.nonTaxableSales)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-[var(--border-subtle)] pt-1.5">
              <span>{z.netSales}</span>
              <span className="tabular-nums">{formatCurrency(report.netSales)}</span>
            </div>
          </div>

          {/* Receipts by method */}
          <div className="border-t border-dashed border-[var(--border)] pt-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">
              {z.receiptsByMethod}
            </p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span>{z.cash}</span>
                <span className="font-semibold tabular-nums">{formatCurrency(report.receiptsByMethod.cash)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{z.card}</span>
                <span className="font-semibold tabular-nums">{formatCurrency(report.receiptsByMethod.card)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{z.mobile}</span>
                <span className="font-semibold tabular-nums">{formatCurrency(report.receiptsByMethod.mobile)}</span>
              </div>
              {report.receiptsByMethod.split > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{z.split}</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(report.receiptsByMethod.split)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t border-[var(--border-subtle)] pt-1.5">
                <span>{z.totalReceipts}</span>
                <span className="tabular-nums">{formatCurrency(report.totalReceipts)}</span>
              </div>
            </div>
          </div>

          {/* Cash drawer */}
          <div className="border-t border-dashed border-[var(--border)] pt-3 space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">
              {z.cashDrawerTotal}
            </p>
            <div className="flex justify-between text-sm">
              <span>{z.openingCash}</span>
              <span className="tabular-nums">{formatCurrency(report.openingCash)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-[var(--border-subtle)] pt-1.5">
              <span>{z.cashDrawerTotal}</span>
              <span className="tabular-nums">{formatCurrency(expectedCash)}</span>
            </div>
          </div>

          {/* Cash reconciliation — Expected + Counted only */}
          {report.closingCash !== null && (
            <div className="border-t border-dashed border-[var(--border)] pt-3 space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                {t.caisses.close}
              </p>
              <div className="flex justify-between text-sm">
                <span>{z.expectedCash}</span>
                <span className="tabular-nums font-semibold">{formatCurrency(expectedCash)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-[var(--border-subtle)] pt-1.5">
                <span>{z.closingCash}</span>
                <span className="tabular-nums">{formatCurrency(countedCash)}</span>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="border-t border-dashed border-[var(--border)] pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>{z.customerCount}</span>
              <span className="font-semibold tabular-nums">{report.customerCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{z.averageSale}</span>
              <span className="font-semibold tabular-nums">{formatCurrency(report.averageSale)}</span>
            </div>
          </div>

          {/* Notes */}
          {report.notes && (
            <div className="border-t border-dashed border-[var(--border)] pt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">{z.notes}</p>
              <p className="text-xs text-[var(--text-secondary)]">{report.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-dashed border-[var(--border)] pt-3 text-center">
            <p className="text-[10px] text-[var(--text-muted)]">
              {report.customerCount} {z.customerCount.toLowerCase()} — {formatCurrency(report.netSales)}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              {z.title} #{report.shiftId.slice(-6).toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
