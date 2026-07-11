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
    totalDiscount: "Remises",
    netSales: "Ventes nettes",
    receiptsByMethod: "Encaissements",
    cash: "Espèces",
    card: "Carte",
    mobile: "Mobile Money",
    orange: "Orange Money",
    totalReceipts: "Total",
    openingCash: "Fonds d'ouverture",
    customerCount: "Clients",
    print: "Imprimer",
    close: "Fermer",
  };

  const rbm = report.receiptsByMethod ?? { cash: 0, card: 0, mobile: 0, orange: 0, split: 0, invoice: 0 } as any;
  const totalDiscount = report.totalDiscount ?? 0;
  const hasInvoice = (rbm as any).invoice > 0;

  const handlePrint = () => {
    const row = (label: string, value: string, bold = false) =>
      `<div style="display:flex;justify-content:space-between;padding:1px 0;${bold ? "font-weight:bold;" : ""}"><span>${label}</span><span>${value}</span></div>`;

    let html = `
      <div style="text-align:center;margin-bottom:6px">
        <div style="font-size:20px;font-weight:bold;letter-spacing:2px">${z.title}</div>
        <div style="font-size:14px">${report.registerName}</div>
      </div>
      <div style="border-top:1px dashed #000;padding-top:5px">
        ${row(z.operator, report.employeeName)}
        ${row(z.opened, formatDateTime(report.openedAt))}
        ${row(z.closed, formatDateTime(report.closedAt))}
      </div>
      <div style="border-top:1px dashed #000;margin-top:5px;padding-top:5px">
        ${row(z.grossSales, formatCurrency(report.grossSales))}
        ${totalDiscount > 0 ? row("- " + z.totalDiscount, formatCurrency(totalDiscount)) : ""}
        <div style="border-top:1px solid #000;margin-top:3px;padding-top:3px">
          ${row(z.netSales, formatCurrency(report.netSales), true)}
        </div>
      </div>
      <div style="border-top:1px dashed #000;margin-top:5px;padding-top:5px">
        <div style="font-weight:bold;text-transform:uppercase;font-size:13px;margin-bottom:3px">${z.receiptsByMethod}</div>
        ${row(z.cash, formatCurrency(rbm.cash))}
        ${rbm.card > 0 ? row(z.card, formatCurrency(rbm.card)) : ""}
        ${hasInvoice ? row("Factures", formatCurrency((rbm as any).invoice)) : ""}
        ${rbm.mobile > 0 ? row(z.mobile, formatCurrency(rbm.mobile)) : ""}
        ${(rbm as any).orange > 0 ? row(z.orange || "Orange Money", formatCurrency((rbm as any).orange)) : ""}
        <div style="border-top:1px solid #000;margin-top:3px;padding-top:3px">
          ${row(z.totalReceipts, formatCurrency(report.totalReceipts), true)}
        </div>
      </div>
      <div style="border-top:1px dashed #000;margin-top:5px;padding-top:5px">
        ${row(z.openingCash, formatCurrency(report.openingCash))}
        ${row(z.customerCount, String(report.customerCount))}
      </div>`;

    // Articles vendus (ticket)
    if (report.soldProducts && report.soldProducts.length > 0) {
      html += `<div style="border-top:1px dashed #000;margin-top:5px;padding-top:5px">
        <div style="font-weight:bold;text-transform:uppercase;font-size:13px;margin-bottom:3px">Articles vendus (${report.soldProducts.length})</div>`;
      for (const p of report.soldProducts) {
        const name = report.transactions?.flatMap((t) => t.items || []).find((it) => it.productId === p.productId)?.productName || p.productId;
        html += `<div style="display:flex;justify-content:space-between;font-size:11px;padding:1px 0">
          <span>${name.substring(0, 28)}</span>
          <span>x${p.quantity} ${formatCurrency(p.total)}</span>
        </div>`;
      }
      html += `</div>`;
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
            @page { size: 80mm auto; margin: 0; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
            html, body { width: 80mm; max-width: 80mm; min-width: 80mm; margin: 0; padding: 0; background: #fff; }
            body { padding: 2mm 2mm 4mm; font-family: 'Courier New', monospace; color: #000; font-size: 13px; line-height: 1.5; font-weight: bold; }
            body > div > div { max-width: 76mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            @media print {
              html, body { width: 80mm; max-width: 80mm; min-width: 80mm; padding: 2mm 2mm 4mm; overflow: hidden; background: #fff; }
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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[var(--border)] px-5 py-3 flex items-center justify-between z-10">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            {z.title} — {report.registerName}
          </h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={<Printer className="w-3.5 h-3.5" />} onClick={handlePrint}>
              {z.print}
            </Button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>
        </div>

        {/* Report content — compact */}
        <div id="z-report-print" className="p-5 space-y-3">
          {/* Title */}
          <div className="text-center">
            <h1 className="text-base font-bold tracking-wider">{z.title}</h1>
            <p className="text-xs text-[var(--text-muted)]">{report.registerName}</p>
          </div>

          {/* Shift info */}
          <div className="border-t border-dashed border-[var(--border)] pt-3 space-y-1 text-xs">
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
            {totalDiscount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>- {z.totalDiscount}</span>
                <span className="font-semibold tabular-nums">{formatCurrency(totalDiscount)}</span>
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
              {hasInvoice && (
                <div className="flex justify-between text-sm">
                  <span>Factures</span>
                  <span className="font-semibold tabular-nums">{formatCurrency((rbm as any).invoice)}</span>
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
              <div className="flex justify-between text-sm font-bold border-t border-[var(--border-subtle)] pt-1.5">
                <span>{z.totalReceipts}</span>
                <span className="tabular-nums">{formatCurrency(report.totalReceipts)}</span>
              </div>
            </div>
          </div>

          {/* Opening cash + customer count */}
          <div className="border-t border-dashed border-[var(--border)] pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>{z.openingCash}</span>
              <span className="font-semibold tabular-nums">{formatCurrency(report.openingCash)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{z.customerCount}</span>
              <span className="font-semibold tabular-nums">{report.customerCount}</span>
            </div>
          </div>
        </div>

        {/* Sold products detail */}
        {report.soldProducts && report.soldProducts.length > 0 && (
          <div className="border-t border-[var(--border)] px-5 py-3 max-h-[300px] overflow-y-auto">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">
              Articles vendus ({report.soldProducts.length})
            </p>
            <div className="space-y-1">
              {report.soldProducts.map((p, i) => {
                const name = report.transactions
                  ?.flatMap((t) => t.items || [])
                  .find((it) => it.productId === p.productId)?.productName || p.productId;
                return (
                  <div key={i} className="flex justify-between text-xs py-0.5 border-b border-dashed border-[var(--border-subtle)] last:border-0">
                    <span className="truncate flex-1 mr-2">{name}</span>
                    <span className="tabular-nums text-[var(--text-muted)]">x{p.quantity}</span>
                    <span className="tabular-nums font-semibold ml-3 w-20 text-right">{formatCurrency(p.total)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transactions detail */}
        {report.transactions && report.transactions.length > 0 && (
          <div className="border-t border-[var(--border)] px-5 py-3 max-h-[250px] overflow-y-auto">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">
              Transactions ({report.transactions.length})
            </p>
            <div className="space-y-1.5">
              {report.transactions.map((tx) => (
                <div key={tx.id} className="text-xs border-b border-dashed border-[var(--border-subtle)] last:border-0 pb-1.5">
                  <div className="flex justify-between font-medium">
                    <span>{tx.transactionNumber}</span>
                    <span className="tabular-nums">{formatCurrency(tx.total)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>{new Date(tx.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {tx.paymentMethod}</span>
                    <span>{tx.items?.length || 0} article(s)</span>
                  </div>
                  {tx.items && tx.items.length > 0 && (
                    <div className="mt-1 pl-2 space-y-0.5">
                      {tx.items.map((it, j) => (
                        <div key={j} className="flex justify-between text-[11px] text-[var(--text-secondary)]">
                          <span className="truncate flex-1 mr-2">{it.productName || it.productId}</span>
                          <span className="tabular-nums">x{it.quantity} · {formatCurrency(it.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-[var(--border)] px-5 py-3 flex justify-end gap-2">
          <Button size="sm" variant="secondary" icon={<Printer className="w-3.5 h-3.5" />} onClick={handlePrint}>
            {z.print}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            {z.close}
          </Button>
        </div>
      </div>
    </div>
  );
}
