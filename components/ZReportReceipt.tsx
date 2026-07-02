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
    // Construire le HTML du Z-Report avec styles inline (compatible imprimante thermique 80mm)
    const expectedCash = (report.openingCash ?? 0) + (report.cashReceived ?? report.receiptsByMethod?.cash ?? 0) - (report.changeGiven ?? 0);
    const countedCash = report.closingCash ?? 0;
    const diff = countedCash - expectedCash;

    const row = (label: string, value: string, bold = false) =>
      `<div style="display:flex;justify-content:space-between;padding:1px 0;${bold ? "font-weight:bold;" : ""}"><span>${label}</span><span>${value}</span></div>`;

    const section = (title: string, rowsHtml: string) =>
      `<div style="border-top:1px dashed #000;margin-top:4px;padding-top:4px">${title ? `<div style="font-weight:bold;text-transform:uppercase;font-size:10px;margin-bottom:2px">${title}</div>` : ""}${rowsHtml}</div>`;

    let html = `
      <div style="text-align:center;margin-bottom:4px">
        <div style="font-size:16px;font-weight:bold;letter-spacing:2px">${z.title}</div>
        <div style="font-size:11px">${z.closingReport}</div>
      </div>
      <div style="border-top:1px dashed #000;padding-top:4px">
        ${row(z.station, report.registerName)}
        ${row(z.operator, report.employeeName)}
        ${row(z.opened, formatDateTime(report.openedAt))}
        ${row(z.closed, formatDateTime(report.closedAt))}
      </div>
      <div style="border-top:1px dashed #000;margin-top:4px;padding-top:4px">
        ${row(z.grossSales, formatCurrency(report.grossSales))}
        ${row(z.returnsAndCredits, formatCurrency(report.returnsAndCredits))}
        ${row(z.totalDiscount, "-" + formatCurrency(report.totalDiscount))}
        ${report.totalTax > 0 ? row(z.totalTax, formatCurrency(report.totalTax)) : ""}
        ${row(z.nonTaxableSales, formatCurrency(report.nonTaxableSales))}
        <div style="border-top:1px solid #000;margin-top:2px;padding-top:2px">
          ${row(z.netSales, formatCurrency(report.netSales), true)}
        </div>
      </div>
      <div style="border-top:1px dashed #000;margin-top:4px;padding-top:4px">
        <div style="font-weight:bold;text-transform:uppercase;font-size:10px;margin-bottom:2px">${z.receiptsByMethod}</div>
        ${row(z.cash, formatCurrency(report.receiptsByMethod.cash))}
        ${row(z.card, formatCurrency(report.receiptsByMethod.card))}
        ${row(z.mobile, formatCurrency(report.receiptsByMethod.mobile))}
        ${report.receiptsByMethod.split > 0 ? row(z.split, formatCurrency(report.receiptsByMethod.split)) : ""}
        <div style="border-top:1px solid #000;margin-top:2px;padding-top:2px">
          ${row(z.totalReceipts, formatCurrency(report.totalReceipts), true)}
        </div>
      </div>
      <div style="border-top:1px dashed #000;margin-top:4px;padding-top:4px">
        <div style="font-weight:bold;text-transform:uppercase;font-size:10px;margin-bottom:2px">${z.cashDrawerTotal}</div>
        ${row(z.openingCash, formatCurrency(report.openingCash))}
        <div style="border-top:1px solid #000;margin-top:2px;padding-top:2px">
          ${row(z.cashDrawerTotal, formatCurrency(expectedCash), true)}
        </div>
      </div>`;

    if (report.closingCash !== null) {
      html += `
      <div style="border-top:1px dashed #000;margin-top:4px;padding-top:4px">
        <div style="font-weight:bold;text-transform:uppercase;font-size:10px;margin-bottom:2px">${t.caisses?.close || "CLOSE"}</div>
        ${row(z.expectedCash, formatCurrency(expectedCash))}
        ${row(z.closingCash, formatCurrency(countedCash), true)}
        ${diff !== 0 ? row(z.difference, (diff > 0 ? "+" : "") + formatCurrency(diff), true) : ""}
      </div>`;
    }

    html += `
      <div style="border-top:1px dashed #000;margin-top:4px;padding-top:4px">
        ${row(z.customerCount, String(report.customerCount))}
        ${row(z.averageSale, formatCurrency(report.averageSale))}
      </div>`;

    if (report.notes) {
      html += `
      <div style="border-top:1px dashed #000;margin-top:4px;padding-top:4px">
        <div style="font-weight:bold;text-transform:uppercase;font-size:10px;margin-bottom:2px">${z.notes}</div>
        <div style="font-size:11px;white-space:pre-wrap">${report.notes}</div>
      </div>`;
    }

    html += `<div style="text-align:center;margin-top:8px;font-size:10px">*** END OF REPORT ***</div><br/>`;

    // Utiliser un iframe caché (évite les bloqueurs de popup, compatible --kiosk-printing)
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    document.body.appendChild(printFrame);

    const printDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (!printDoc) {
      if (printFrame.parentNode) document.body.removeChild(printFrame);
      return;
    }

    printDoc.write(`
      <html>
        <head>
          <title>Z-Report ${report.registerName}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            html, body { width: 80mm; max-width: 80mm; margin: 0; padding: 0; }
            body { padding: 2mm 2mm 4mm; font-family: 'Courier New', monospace; color: #000; font-size: 12px; line-height: 1.4; font-weight: bold; }
            @media print {
              html, body { width: 80mm; max-width: 80mm; padding: 2mm 2mm 4mm; }
              * { page-break-inside: avoid; break-inside: avoid; }
            }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    printDoc.close();
    printFrame.contentWindow?.focus();
    setTimeout(() => {
      printFrame.contentWindow?.print();
      setTimeout(() => {
        if (printFrame.parentNode) document.body.removeChild(printFrame);
      }, 1000);
    }, 500);
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
