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
    orange: "Orange Money",
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

  // Valeurs par defaut pour eviter tout plantage si un champ manque (rapport journalier, ancien shift...)
  const rbm = report.receiptsByMethod ?? { cash: 0, card: 0, mobile: 0, orange: 0, split: 0 } as any;

  // Calcul: Opening Cash + Cash Received - Change Given = Expected Cash in Drawer
  const cashReceived = report.cashReceived ?? rbm.cash ?? 0;
  const changeGiven = report.changeGiven ?? 0;
  const expectedCash = (report.openingCash ?? 0) + cashReceived - changeGiven;
  const countedCash = report.closingCash ?? 0;
  const diff = countedCash - expectedCash;

  const handlePrint = () => {
    const row = (label: string, value: string, bold = false) =>
      `<div style="display:flex;justify-content:space-between;padding:1px 0;${bold ? "font-weight:bold;" : ""}"><span>${label}</span><span>${value}</span></div>`;

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
        ${report.returnsAndCredits > 0 ? row("- " + z.returnsAndCredits, formatCurrency(report.returnsAndCredits)) : ""}
        ${(report.invoicePayments?.total || 0) > 0 ? row("+ Avances factures", formatCurrency(report.invoicePayments!.total)) : ""}
        <div style="border-top:1px solid #000;margin-top:2px;padding-top:2px">
          ${row(z.netSales, formatCurrency(report.netSales), true)}
        </div>
      </div>
      <div style="border-top:1px dashed #000;margin-top:4px;padding-top:4px">
        <div style="font-weight:bold;text-transform:uppercase;font-size:10px;margin-bottom:2px">${z.receiptsByMethod}</div>
        ${row(z.cash, formatCurrency(rbm.cash))}
        ${rbm.card > 0 ? row(z.card, formatCurrency(rbm.card)) : ""}
        ${rbm.mobile > 0 ? row(z.mobile, formatCurrency(rbm.mobile)) : ""}
        ${(rbm as any).orange > 0 ? row(z.orange || "Orange Money", formatCurrency((rbm as any).orange)) : ""}
        ${rbm.split > 0 ? row(z.split, formatCurrency(rbm.split)) : ""}
        <div style="border-top:1px solid #000;margin-top:2px;padding-top:2px">
          ${row(z.totalReceipts, formatCurrency(report.totalReceipts), true)}
        </div>
      </div>
      <div style="border-top:1px dashed #000;margin-top:4px;padding-top:4px">
        <div style="font-weight:bold;text-transform:uppercase;font-size:10px;margin-bottom:2px">${z.cashDrawerTotal}</div>
        ${row(z.openingCash, formatCurrency(report.openingCash))}
        ${row("+ " + z.cashReceived, formatCurrency(cashReceived))}
        ${changeGiven > 0 ? row("- " + z.changeGiven, formatCurrency(changeGiven)) : ""}
        <div style="border-top:1px solid #000;margin-top:2px;padding-top:2px">
          ${row(z.expectedCash, formatCurrency(expectedCash), true)}
        </div>
        ${report.closingCash !== null ? row(z.closingCash, formatCurrency(countedCash), true) : ""}
        ${report.closingCash !== null && diff !== 0 ? row(z.difference, (diff > 0 ? "+" : "") + formatCurrency(diff), true) : ""}
      </div>
      <div style="border-top:1px dashed #000;margin-top:4px;padding-top:4px">
        ${row(z.customerCount, String(report.customerCount))}
      </div>`;

    if (report.notes) {
      html += `
      <div style="border-top:1px dashed #000;margin-top:4px;padding-top:4px">
        <div style="font-weight:bold;text-transform:uppercase;font-size:10px;margin-bottom:2px">${z.notes}</div>
        <div style="font-size:11px;white-space:pre-wrap">${report.notes}</div>
      </div>`;
    }

    html += `<div style="text-align:center;margin-top:8px;font-size:10px">*** END ***</div><br/>`;

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
            @page { size: 80mm 297mm; margin: 0; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
            html, body { width: 80mm; max-width: 80mm; min-width: 80mm; margin: 0; padding: 0; overflow: hidden; background: #fff; }
            body { padding: 2mm 2mm 4mm; font-family: 'Courier New', monospace; color: #000; font-size: 10px; line-height: 1.35; font-weight: bold; }
            /* Chaque ligne fait exactement la largeur du papier, les montants ne sont jamais coupés */
            body > div > div { max-width: 76mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            @media print {
              html, body { width: 80mm; max-width: 80mm; min-width: 80mm; padding: 2mm 2mm 4mm; overflow: hidden; background: #fff; }
              * { page-break-inside: avoid; break-inside: avoid; }
              .no-print { display: none !important; }
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

        {/* Report content */}
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

          {/* Sales summary — compact */}
          <div className="border-t border-dashed border-[var(--border)] pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>{z.grossSales}</span>
              <span className="font-semibold tabular-nums">{formatCurrency(report.grossSales)}</span>
            </div>
            {report.returnsAndCredits > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>- {z.returnsAndCredits}</span>
                <span className="tabular-nums">{formatCurrency(report.returnsAndCredits)}</span>
              </div>
            )}
            {(report.invoicePayments?.total || 0) > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>+ Avances factures</span>
                <span className="tabular-nums">{formatCurrency(report.invoicePayments!.total)}</span>
              </div>
            )}
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
                <span className="font-semibold tabular-nums">{formatCurrency(rbm.cash)}</span>
              </div>
              {rbm.card > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{z.card}</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(rbm.card)}</span>
                </div>
              )}
              {rbm.mobile > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{z.mobile}</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(rbm.mobile)}</span>
                </div>
              )}
              {(rbm as any).orange > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{z.orange || "Orange Money"}</span>
                  <span className="font-semibold tabular-nums">{formatCurrency((rbm as any).orange)}</span>
                </div>
              )}
              {rbm.split > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{z.split}</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(rbm.split)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t border-[var(--border-subtle)] pt-1.5">
                <span>{z.totalReceipts}</span>
                <span className="tabular-nums">{formatCurrency(report.totalReceipts)}</span>
              </div>
            </div>
          </div>

          {/* Cash drawer — avec détail du calcul */}
          <div className="border-t border-dashed border-[var(--border)] pt-3 space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">
              {z.cashDrawerTotal}
            </p>
            <div className="flex justify-between text-sm">
              <span>{z.openingCash}</span>
              <span className="tabular-nums">{formatCurrency(report.openingCash)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>+ {z.cashReceived}</span>
              <span className="tabular-nums">{formatCurrency(cashReceived)}</span>
            </div>
            {changeGiven > 0 && (
              <div className="flex justify-between text-sm">
                <span>- {z.changeGiven}</span>
                <span className="tabular-nums">{formatCurrency(changeGiven)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t border-[var(--border-subtle)] pt-1.5">
              <span>= {z.expectedCash}</span>
              <span className="tabular-nums">{formatCurrency(expectedCash)}</span>
            </div>
            {report.closingCash !== null && (
              <>
                <div className="flex justify-between text-sm font-bold pt-1">
                  <span>{z.closingCash}</span>
                  <span className="tabular-nums">{formatCurrency(countedCash)}</span>
                </div>
                {diff !== 0 && (
                  <div className="flex justify-between text-sm font-bold">
                    <span>{z.difference}</span>
                    <span className={`tabular-nums ${diff > 0 ? "text-blue-600" : "text-red-600"}`}>
                      {diff > 0 ? "+" : ""}{formatCurrency(diff)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Stats */}
          <div className="border-t border-dashed border-[var(--border)] pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>{z.customerCount}</span>
              <span className="font-semibold tabular-nums">{report.customerCount}</span>
            </div>
          </div>

          {/* Notes */}
          {report.notes && (
            <div className="border-t border-dashed border-[var(--border)] pt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">{z.notes}</p>
              <p className="text-xs text-[var(--text-secondary)]">{report.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
