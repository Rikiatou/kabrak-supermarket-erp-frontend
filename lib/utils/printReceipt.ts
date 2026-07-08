import type { ApiTransaction } from "@/lib/api";
import { STORE_INFO, getStoreInfo } from "@/app/pos/store-info";
import type { ClientConfig } from "@/lib/license/types";
import { formatCurrency } from "@/lib/utils";

/**
 * Réimprimer un ticket de vente à partir d'une transaction existante.
 * Utilise un iframe caché pour éviter les bloqueurs de popup.
 */
export function reprintTicket(
  tx: ApiTransaction,
  options?: {
    config?: ClientConfig | null;
    cashierName?: string;
  }
) {
  const storeInfo = getStoreInfo(options?.config ?? null);

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
    return false;
  }

  const date = new Date(tx.date);
  const dateStr = date.toLocaleDateString("en-GB");
  const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const methodLabel =
    tx.paymentMethod === "cash" ? "CASH" :
    tx.paymentMethod === "card" ? "CARD" :
    tx.paymentMethod === "mobile" ? "MOBILE MONEY" :
    tx.paymentMethod === "orange" ? "ORANGE MONEY" :
    "SPLIT";

  const printItemsHtml = (tx.items || [])
    .map((item) => {
      const name = (item.product?.name || "Product").length > 28
        ? (item.product?.name || "Product").substring(0, 28) + "…"
        : (item.product?.name || "Product");
      const barcode = item.product?.barcode || "";
      const total = item.unitPrice * item.quantity;
      return `<tr>
        <td colspan="2" style="padding-top:1px">
          <div class="item-name">${barcode} ${name}</div>
          <table style="width:100%"><tr>
            <td class="item-detail" style="text-align:left">${item.quantity}.00 @ ${item.unitPrice.toLocaleString("fr-CM")}</td>
            <td class="item-detail" style="text-align:right;font-weight:bold;white-space:nowrap">${total.toLocaleString("fr-CM")}</td>
          </tr></table>
        </td>
      </tr>`;
    })
    .join("");

  const cashierName = options?.cashierName ||
    (tx.cashier ? `${tx.cashier.firstName} ${tx.cashier.lastName}` : "CASHIER");

  printDoc.write(`
    <html>
    <head>
      <title>Receipt ${tx.transactionNumber}</title>
      <style>
        @page { size: 80mm 297mm; margin: 0; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 76mm; max-width: 76mm; min-width: 76mm; margin: 0 auto; padding: 0; overflow: hidden; background: #fff; }
        body { padding: 2mm 2mm 4mm; font-family: 'Courier New', monospace; color: #000; font-size: 10px; line-height: 1.3; font-weight: bold; }
        h1 { font-size: 13px; text-align: center; margin: 0; font-weight: bold; letter-spacing: 0.5px; }
        .center { text-align: center; }
        .dashed { text-align: center; font-size: 9px; letter-spacing: 1px; margin: 2px 0; white-space: nowrap; overflow: hidden; }
        .dashed::before { content: "--------------------------------"; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        td { padding: 0; vertical-align: top; overflow: hidden; }
        .total { font-size: 12px; font-weight: bold; white-space: nowrap; }
        .right { text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .small { font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .xsmall { font-size: 8px; }
        .item-name { font-size: 9px; font-weight: bold; white-space: normal; word-wrap: break-word; }
        .item-detail { font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media print {
          html, body { width: 76mm; max-width: 76mm; min-width: 76mm; padding: 2mm 2mm 4mm; overflow: hidden; background: #fff; }
          * { page-break-inside: avoid; break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <h1>${storeInfo.name}</h1>
      <p class="center small">${storeInfo.address}</p>
      <p class="center small">TEL: ${storeInfo.phone.replace(/^Tel:\s*/i, "")}</p>
      <p class="center xsmall">${date.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}).toUpperCase()} ${timeStr}</p>
      <p class="center xsmall">SALE #${tx.transactionNumber} S/P-${cashierName}</p>
      <div class="dashed"></div>
      <table>${printItemsHtml}</table>
      <div class="dashed"></div>
      <table>
        <tr><td class="small">SUBTOTAL</td><td class="right small">${tx.subtotal.toLocaleString("fr-CM")}</td></tr>
        ${tx.discount > 0 ? `<tr><td class="small">DISCOUNT</td><td class="right small">-${tx.discount.toLocaleString("fr-CM")}</td></tr>` : ""}
      </table>
      <div class="dashed"></div>
      <table>
        <tr><td class="total">TOTAL SALE</td><td class="right total">${tx.total.toLocaleString("fr-CM")}</td></tr>
        <tr><td class="small">PAID ${methodLabel}</td><td class="right small">${(tx.cashGiven ?? tx.total).toLocaleString("fr-CM")}</td></tr>
        ${tx.change != null && tx.change > 0 ? `<tr><td class="small">CHANGE</td><td class="right small">${tx.change.toLocaleString("fr-CM")}</td></tr>` : ""}
      </table>
      <div class="dashed"></div>
      <p class="center small" style="margin-top:3px">goods sold are not refundable</p>
      <p class="center small">Thanks for patronizing us</p>
      <p class="center xsmall">(REPRINT)</p>
      <p class="center xsmall">KABRAK ERP</p>
      <br/>
    </body>
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

  return true;
}
