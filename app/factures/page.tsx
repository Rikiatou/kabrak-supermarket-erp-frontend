"use client";

import { useState, useRef } from "react";
import {
  FileText,
  Download,
  Search,
  Plus,
  X,
  QrCode,
  Send,
  Printer,
  Wallet,
  CheckCircle2,
  Clock,
  ScanLine,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, cn } from "@/lib/utils";
import { exportToCSV } from "@/lib/export";
import { useInvoices, useCreateInvoice, useUpdateInvoiceStatus, useAddPayment, useProducts } from "@/lib/hooks/useApi";
import type { ApiInvoicePayment } from "@/lib/api";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { useLicense } from "@/lib/license/context";

interface InvoiceItem {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate?: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  paidAmount: number;
  balance: number;
  status: "draft" | "sent" | "partial" | "paid" | "overdue" | "cancelled";
  payments: Payment[];
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  date: string;
  note?: string;
}

const mockInvoices: Invoice[] = [
  {
    id: "1",
    number: "FAC-2026-0001",
    date: "2026-06-18",
    dueDate: "2026-07-18",
    clientName: "Restaurant Le Baobab",
    clientPhone: "+237 6 91 23 45 67",
    clientEmail: "contact@baobab.cm",
    items: [
      { description: "Scented rice 25kg", quantity: 10, unitPrice: 18000, total: 180000 },
      { description: "Vegetable oil 5L", quantity: 5, unitPrice: 12000, total: 60000 },
    ],
    subtotal: 240000,
    tax: 37200,
    total: 277200,
    paidAmount: 277200,
    balance: 0,
    status: "paid",
    payments: [
      { id: "p1", amount: 277200, method: "mobile", date: "2026-06-18", note: "Full payment MTN MoMo" },
    ],
  },
  {
    id: "2",
    number: "FAC-2026-0002",
    date: "2026-06-17",
    dueDate: "2026-07-17",
    clientName: "Hotel Mont Febe",
    clientPhone: "+237 6 72 34 56 78",
    clientEmail: "achats@montfebe.cm",
    items: [
      { description: "Boissons diverses", quantity: 1, unitPrice: 350000, total: 350000 },
    ],
    subtotal: 350000,
    tax: 54250,
    total: 404250,
    paidAmount: 150000,
    balance: 254250,
    status: "partial",
    payments: [
      { id: "p2", amount: 150000, method: "cash", date: "2026-06-17", note: "Cash deposit" },
    ],
  },
];

export default function FacturesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { config: licenseConfig } = useLicense();
  const supermarketName = licenseConfig?.supermarketName || "KABRAK MARKET";
  const supermarketAddress = licenseConfig?.address || "KABRAK Retail - Yaounde, Cameroon";
  const supermarketPhone = licenseConfig?.phone ? `Tel: ${licenseConfig.phone}` : "Tel: +237 233 332 600";
  const logoUrl = licenseConfig?.logoUrl || "";
  const rccmNumber = (licenseConfig as any)?.rccmNumber || "";
  const taxNumber = (licenseConfig as any)?.taxNumber || "";
  const invoiceFooter = licenseConfig?.invoiceFooter || `${supermarketName} - ${supermarketAddress} - ${supermarketPhone}`;

  const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: t.factures.status.draft, color: "bg-slate-100 text-slate-600" },
    sent: { label: t.factures.status.sent, color: "bg-blue-100 text-blue-700" },
    partial: { label: t.factures.status.partial, color: "bg-amber-100 text-amber-700" },
    paid: { label: t.factures.status.paid, color: "bg-emerald-100 text-emerald-700" },
    overdue: { label: t.factures.status.overdue, color: "bg-red-100 text-red-700" },
    cancelled: { label: t.factures.status.cancelled, color: "bg-slate-100 text-slate-400" },
  };

  const paymentMethodLabels: Record<string, string> = {
    cash: t.common.cash,
    card: t.common.card,
    mobile: t.common.mobile,
    bank: t.common.bank,
    check: t.common.check,
  };
  const { data: apiInvoices, reload } = useInvoices();
  const { create: createInvoice, creating: creatingInvoice } = useCreateInvoice();
  const { update: updateStatus } = useUpdateInvoiceStatus();
  const { addPayment, adding: addingPayment } = useAddPayment();
  const { products } = useProducts();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNote, setPaymentNote] = useState("");

  // Convertir les factures API au format frontend, fallback sur mock
  const invoices: Invoice[] = apiInvoices && apiInvoices.invoices && apiInvoices.invoices.length > 0
    ? apiInvoices.invoices.map((inv) => ({
        id: inv.id,
        number: inv.number,
        date: new Date(inv.date).toISOString().split("T")[0],
        dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split("T")[0] : undefined,
        clientName: inv.clientName,
        clientPhone: inv.clientPhone,
        clientEmail: inv.clientEmail || "",
        items: (inv.items || []).map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          total: it.total,
        })),
        subtotal: inv.subtotal,
        tax: inv.tax,
        total: inv.total,
        paidAmount: inv.paidAmount ?? 0,
        balance: inv.balance ?? inv.total - (inv.paidAmount ?? 0),
        status: inv.status as Invoice["status"],
        payments: (inv.payments || []).map((p: ApiInvoicePayment) => ({
          id: p.id,
          amount: p.amount,
          method: p.method,
          date: new Date(p.date).toISOString().split("T")[0],
          note: p.note,
        })),
      }))
    : mockInvoices;
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [advancePayment, setAdvancePayment] = useState("");
  const [advanceMethod, setAdvanceMethod] = useState("cash");
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);

  // Scanner barcode dans invoice
  const [scanSearch, setScanSearch] = useState("");
  const scanRef = useRef<HTMLInputElement>(null);

  const handleInvoiceScan = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || !scanSearch.trim()) return;
    const code = scanSearch.trim();
    const found = products.find(
      (p) => p.barcode === code || p.sku?.toLowerCase() === code.toLowerCase()
    );
    if (found) {
      // Vérifier si le produit est déjà dans la facture
      const existingIdx = items.findIndex((i) => i.productId === found.id);
      if (existingIdx >= 0) {
        // Augmenter la quantité
        const newItems = [...items];
        newItems[existingIdx].quantity += 1;
        newItems[existingIdx].total = newItems[existingIdx].quantity * newItems[existingIdx].unitPrice;
        setItems(newItems);
      } else {
        // Ajouter une nouvelle ligne
        const lastIdx = items.length - 1;
        if (items[lastIdx].productId) {
          // La dernière ligne est déjà remplie → ajouter une nouvelle
          setItems([...items, {
            productId: found.id,
            description: found.name,
            quantity: 1,
            unitPrice: found.price,
            total: found.price,
          }]);
        } else {
          // Remplir la dernière ligne vide
          selectProduct(lastIdx, found.id);
        }
      }
      setScanSearch("");
      scanRef.current?.focus();
      toast(`${found.name} — ${formatCurrency(found.price)}`, "success");
    } else {
      toast(t.factures.barcodeNotFound.replace("{code}", code), "warning");
      setScanSearch("");
    }
  };

  const filtered = invoices.filter(
    (i) =>
      i.number.toLowerCase().includes(search.toLowerCase()) ||
      i.clientName.toLowerCase().includes(search.toLowerCase())
  );

  const updateItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    if (field === "quantity" || field === "unitPrice") {
      newItems[idx].total = newItems[idx].quantity * newItems[idx].unitPrice;
    }
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  // When a product is selected from dropdown, auto-fill the line
  const selectProduct = (idx: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const newItems = [...items];
    newItems[idx] = {
      productId: product.id,
      description: product.name,
      quantity: 1,
      unitPrice: product.price,
      total: product.price,
    };
    setItems(newItems);
  };

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const tax = 0; // No tax — removed per client request
  const total = subtotal;

  const handleCreate = async () => {
    if (!clientName || items.length === 0) return;
    const validItems = items.filter((i) => i.description);
    const result = await createInvoice({
      clientName,
      clientPhone,
      clientEmail: clientEmail || undefined,
      items: validItems.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        productId: it.productId,
      })),
    });
    if (result) {
      // Si un acompte a été saisi, l'enregistrer comme premier versement
      const advance = parseFloat(advancePayment) || 0;
      if (advance > 0 && advance <= result.total) {
        try {
          await addPayment(result.id, {
            amount: advance,
            method: advanceMethod,
            note: "Acompte initial",
          });
          toast(`${t.factures.invoiceCreated}: ${result.number} — ${t.factures.advance}: ${formatCurrency(advance)}`, "success");
        } catch {
          toast(`${t.factures.invoiceCreated}: ${result.number} (${t.factures.advance} non enregistré)`, "warning");
        }
      } else {
        toast(`${t.factures.invoiceCreated}: ${result.number}`, "success");
      }
      reload();
    } else {
      toast(t.factures.invoiceCreatedLocal, "warning");
    }
    setShowModal(false);
    setClientName("");
    setClientPhone("");
    setClientEmail("");
    setAdvancePayment("");
    setAdvanceMethod("cash");
    setItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const openPaymentModal = (invoice: Invoice) => {
    setPaymentInvoice(invoice);
    setPaymentAmount("");
    setPaymentMethod("cash");
    setPaymentNote("");
  };

  const closePaymentModal = () => {
    setPaymentInvoice(null);
    setPaymentAmount("");
    setPaymentMethod("cash");
    setPaymentNote("");
  };

  const handleAddPayment = async () => {
    if (!paymentInvoice) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast(t.factures.invalidAmount, "warning");
      return;
    }
    if (amount > paymentInvoice.balance) {
      toast(`${t.factures.amountTooHigh} (${formatCurrency(paymentInvoice.balance)})`, "warning");
      return;
    }
    const result = await addPayment(paymentInvoice.id, {
      amount,
      method: paymentMethod,
      note: paymentNote || undefined,
    });
    if (result) {
      toast(`${t.factures.paymentSaved} ${formatCurrency(amount)}`, "success");
      reload();
      // Mettre à jour la facture affichée dans le modal
      setPaymentInvoice({
        ...paymentInvoice,
        paidAmount: result.invoice.paidAmount,
        balance: result.invoice.balance,
        status: result.invoice.status as Invoice["status"],
        payments: [
          ...paymentInvoice.payments,
          {
            id: result.payment.id,
            amount: result.payment.amount,
            method: result.payment.method,
            date: new Date(result.payment.date).toISOString().split("T")[0],
            note: result.payment.note,
          },
        ],
      });
      setPaymentAmount("");
      setPaymentNote("");
    } else {
      // Fallback local (backend indisponible)
      const newPayment: Payment = {
        id: `local-${Date.now()}`,
        amount,
        method: paymentMethod,
        date: new Date().toISOString().split("T")[0],
        note: paymentNote || undefined,
      };
      const newPaid = paymentInvoice.paidAmount + amount;
      const newBalance = paymentInvoice.total - newPaid;
      setPaymentInvoice({
        ...paymentInvoice,
        paidAmount: newPaid,
        balance: newBalance,
        status: newBalance <= 0 ? "paid" : "partial",
        payments: [...paymentInvoice.payments, newPayment],
      });
      toast(t.factures.paymentSavedLocal, "warning");
      setPaymentAmount("");
      setPaymentNote("");
    }
  };

  const generatePDF = async (invoice: Invoice) => {
    const pdf = new jsPDF();

    // Formatage simple pour jsPDF (sans caractères Unicode problématiques)
    const pdfCurrency = (n: number | null | undefined) => {
      if (n == null || isNaN(n as number)) return "0 FCFA";
      return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0 })
        .format(n)
        .replace(/\u202F|\u00A0/g, " ") // Remplacer espaces insécables
        .replace(/,/g, " ") + " FCFA";
    };
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - 2 * margin;

    // ── Header band ──
    pdf.setFillColor(30, 64, 175);
    pdf.rect(0, 0, pageWidth, 36, "F");

    // Logo (if available) or company name
    let headerTextX = margin;
    if (logoUrl) {
      try {
        // Fetch logo and convert to data URL if it's a URL
        let logoDataUrl = logoUrl;
        if (logoUrl.startsWith("http")) {
          const response = await fetch(logoUrl);
          const blob = await response.blob();
          logoDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
        const imgFormat = logoDataUrl.includes("image/png") ? "PNG" : "JPEG";
        pdf.addImage(logoDataUrl, imgFormat, margin, 6, 24, 24);
        headerTextX = margin + 30;
      } catch {}
    }

    // Company name + info
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(supermarketName, headerTextX, 14);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(supermarketAddress, headerTextX, 20);
    pdf.text(supermarketPhone, headerTextX, 25);
    if (rccmNumber) pdf.text(`RC: ${rccmNumber}`, headerTextX, 30);
    if (taxNumber) pdf.text(`Tax ID: ${taxNumber}`, headerTextX + 60, 30);

    // ── Invoice title + info (right side) ──
    pdf.setTextColor(30, 64, 175);
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text("INVOICE", pageWidth - margin - 35, 48);
    pdf.setTextColor(100, 100, 100);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(`N° ${invoice.number}`, pageWidth - margin - 35, 54);
    pdf.text(`Date: ${new Date(invoice.date).toLocaleDateString("en-GB")}`, pageWidth - margin - 35, 60);
    if (invoice.dueDate) {
      pdf.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString("en-GB")}`, pageWidth - margin - 35, 66);
    }

    // ── Client info box ──
    const clientBoxY = 78;
    pdf.setDrawColor(220, 220, 220);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(margin, clientBoxY, contentWidth, 28, 2, 2, "FD");
    pdf.setTextColor(60, 60, 60);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text("BILLED TO:", margin + 4, clientBoxY + 7);
    pdf.setFontSize(10);
    pdf.text(invoice.clientName, margin + 4, clientBoxY + 14);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(invoice.clientPhone, margin + 4, clientBoxY + 20);
    if (invoice.clientEmail) pdf.text(invoice.clientEmail, margin + 4, clientBoxY + 25);

    // QR Code (right side of client box)
    try {
      const qrData = `INV:${invoice.number};TOTAL:${invoice.total};CLIENT:${invoice.clientName}`;
      const qrDataUrl = await QRCode.toDataURL(qrData, { width: 60, margin: 1 });
      pdf.addImage(qrDataUrl, "PNG", pageWidth - margin - 22, clientBoxY + 3, 18, 18);
    } catch {}

    // ── Items table ──
    const tableY = 118;
    const colDesc = margin + 4;
    const colQty = margin + 115;
    const colPrice = margin + 145;
    const colTotal = pageWidth - margin - 4;

    // Header row
    pdf.setFillColor(30, 64, 175);
    pdf.rect(margin, tableY, contentWidth, 8, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text("Description", colDesc, tableY + 5.5);
    pdf.text("Qty", colQty, tableY + 5.5, { align: "center" });
    pdf.text("Unit Price", colPrice, tableY + 5.5, { align: "right" });
    pdf.text("Total", colTotal, tableY + 5.5, { align: "right" });

    // Item rows
    let y = tableY + 14;
    pdf.setTextColor(50, 50, 50);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    invoice.items.forEach((item, idx) => {
      if (idx > 0) {
        pdf.setDrawColor(235, 235, 235);
        pdf.line(margin, y - 4, pageWidth - margin, y - 4);
      }
      // Description (truncate to fit)
      pdf.text(item.description.substring(0, 55), colDesc, y);
      // Quantity
      pdf.text(String(item.quantity), colQty, y, { align: "center" });
      // Unit price
      pdf.text(pdfCurrency(item.unitPrice), colPrice, y, { align: "right" });
      // Total
      pdf.setFont("helvetica", "bold");
      pdf.text(pdfCurrency(item.total), colTotal, y, { align: "right" });
      pdf.setFont("helvetica", "normal");
      y += 9;
    });

    // ── Totals (no tax) ──
    y += 6;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin + 90, y, pageWidth - margin, y);
    y += 7;
    pdf.setFontSize(10);
    pdf.text("Total:", margin + 95, y);
    pdf.setFont("helvetica", "bold");
    pdf.text(pdfCurrency(invoice.total), pageWidth - margin - 4, y, { align: "right" });
    pdf.setFont("helvetica", "normal");

    // ── Payment summary ──
    y += 12;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin + 90, y, pageWidth - margin, y);
    y += 7;
    pdf.setFontSize(9);

    // Paid amount
    pdf.text("Amount paid:", margin + 95, y);
    pdf.setTextColor(22, 163, 74);
    pdf.setFont("helvetica", "bold");
    pdf.text(pdfCurrency(invoice.paidAmount), pageWidth - margin - 4, y, { align: "right" });
    y += 7;

    // Balance
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(50, 50, 50);
    pdf.text("Balance due:", margin + 95, y);
    pdf.setTextColor(invoice.balance > 0 ? 220 : 22, invoice.balance > 0 ? 38 : 163, invoice.balance > 0 ? 38 : 74);
    pdf.setFont("helvetica", "bold");
    pdf.text(pdfCurrency(invoice.balance), pageWidth - margin - 4, y, { align: "right" });
    y += 7;

    // Status
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Status: ${invoice.status.toUpperCase()}`, margin + 95, y);

    // ── Payment history ──
    if (invoice.payments.length > 0) {
      y += 10;
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, y - 3, contentWidth, 7, "F");
      pdf.setTextColor(60, 60, 60);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("PAYMENT HISTORY", margin + 4, y + 2);
      y += 9;

      pdf.setFontSize(7);
      pdf.text("Date", margin + 4, y);
      pdf.text("Method", margin + 55, y);
      pdf.text("Amount", pageWidth - margin - 4, y, { align: "right" });
      y += 4;
      pdf.setDrawColor(220, 220, 220);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 6;

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(80, 80, 80);
      invoice.payments.forEach((p) => {
        pdf.text(new Date(p.date).toLocaleDateString("en-GB"), margin + 4, y);
        pdf.text(paymentMethodLabels[p.method] || p.method, margin + 55, y);
        pdf.setFont("helvetica", "bold");
        pdf.text(pdfCurrency(p.amount), pageWidth - margin - 4, y, { align: "right" });
        pdf.setFont("helvetica", "normal");
        if (p.note) {
          y += 4;
          pdf.setFontSize(6);
          pdf.setTextColor(150, 150, 150);
          pdf.text(`  ${p.note.substring(0, 60)}`, margin + 4, y);
          pdf.setFontSize(7);
          pdf.setTextColor(80, 80, 80);
        }
        y += 7;
      });
    }

    // ── Footer ──
    y = Math.max(y + 10, 245);
    pdf.setTextColor(150, 150, 150);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.text("Goods sold are non refundable", pageWidth / 2, y, { align: "center" });
    pdf.text("Thanks for patronizing us", pageWidth / 2, y + 4, { align: "center" });
    pdf.text(invoiceFooter, pageWidth / 2, y + 9, { align: "center" });

    // Signature
    pdf.setDrawColor(180, 180, 180);
    pdf.line(margin, y + 20, margin + 45, y + 20);
    pdf.text("Signature & stamp", margin + 2, y + 26);

    pdf.save(`${invoice.number}.pdf`);
    toast(`${t.factures.pdfGenerated} ${invoice.number}.pdf`, "success");
  };

  // ── Print invoice via browser — A4 or ticket format ──
  const [printMenuInvoice, setPrintMenuInvoice] = useState<Invoice | null>(null);

  const printInvoice = (invoice: Invoice, format: "a4" | "ticket" = "a4") => {
    setPrintMenuInvoice(null);
    const win = window.open("", "_blank", format === "ticket" ? "width=380,height=600" : "width=800,height=600");
    if (!win) {
      toast(t.factures.allowPopups, "warning");
      return;
    }
    const itemsHtml = invoice.items.map((item) => `
      <tr>
        <td>${item.description}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${formatCurrency(item.unitPrice)}</td>
        <td style="text-align:right;font-weight:bold">${formatCurrency(item.total)}</td>
      </tr>
    `).join("");

    const paymentsHtml = invoice.payments.length > 0 ? `
      <h3 style="margin-top:20px;font-size:11px;color:#666">PAYMENT HISTORY</h3>
      <table class="pay-table">
        <thead><tr><th>Date</th><th>Method</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          ${invoice.payments.map((p) => `
            <tr>
              <td>${new Date(p.date).toLocaleDateString("en-GB")}</td>
              <td>${paymentMethodLabels[p.method] || p.method}</td>
              <td style="text-align:right;font-weight:bold">${formatCurrency(p.amount)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : "";

    if (format === "ticket") {
      // ── TICKET FORMAT (58mm thermal printer style) ──
      win.document.write(`
        <html><head><title>Invoice ${invoice.number}</title>
        <style>
          * { font-family: 'Courier New', monospace; margin: 0; padding: 0; }
          body { width: 280px; padding: 8px; color: #000; font-size: 11px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .dashed { border-top: 1px dashed #000; margin: 6px 0; }
          .small { font-size: 10px; }
          .right { text-align: right; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 2px 0; font-size: 10px; }
          .item-name { font-weight: bold; }
          .total-box { border: 2px solid #000; padding: 6px; margin: 6px 0; text-align: center; }
          .total-amount { font-size: 18px; font-weight: bold; }
          @media print { body { width: 58mm; padding: 2mm; } }
        </style></head><body>
          <div class="center bold" style="font-size:14px">${supermarketName}</div>
          <div class="center small">${supermarketAddress}</div>
          <div class="center small">${supermarketPhone}</div>
          ${rccmNumber ? `<div class="center small">RC: ${rccmNumber}</div>` : ""}
          <div class="dashed"></div>
          <div class="center bold">INVOICE</div>
          <div class="center small">N° ${invoice.number}</div>
          <div class="center small">${new Date(invoice.date).toLocaleDateString("en-GB")}</div>
          <div class="dashed"></div>
          <div class="small"><b>Client:</b> ${invoice.clientName}</div>
          ${invoice.clientPhone ? `<div class="small">${invoice.clientPhone}</div>` : ""}
          <div class="dashed"></div>
          <table>
            ${invoice.items.map((item) => `
              <tr>
                <td colspan="2" class="item-name">${item.description}</td>
              </tr>
              <tr>
                <td class="small">${item.quantity} x ${formatCurrency(item.unitPrice)}</td>
                <td class="right bold">${formatCurrency(item.total)}</td>
              </tr>
            `).join("")}
          </table>
          <div class="dashed"></div>
          <div class="total-box">
            <div class="small">TOTAL</div>
            <div class="total-amount">${formatCurrency(invoice.total)}</div>
          </div>
          <div class="small">Paid: ${formatCurrency(invoice.paidAmount)}</div>
          <div class="small">Balance: ${formatCurrency(invoice.balance)}</div>
          <div class="dashed"></div>
          <div class="center small">${invoiceFooter}</div>
          <div class="center small">Goods sold are non refundable</div>
        </body></html>
      `);
    } else {
      // ── A4 FORMAT (existing professional invoice) ──
      win.document.write(`
        <html><head><title>Invoice ${invoice.number}</title>
        <style>
          * { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          body { padding: 20px; color: #333; }
          .header { display: flex; justify-content: space-between; border-bottom: 3px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px; }
          .company { font-size: 18px; font-weight: bold; color: #1e40af; }
          .company-info { font-size: 11px; color: #666; margin-top: 3px; }
          .invoice-title { font-size: 24px; font-weight: bold; color: #1e40af; text-align: right; }
          .invoice-info { font-size: 11px; color: #666; text-align: right; margin-top: 5px; }
          .client-box { background: #f8fafc; border: 1px solid #ddd; border-radius: 5px; padding: 12px; margin-bottom: 20px; font-size: 12px; }
          .client-box b { font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th { background: #1e40af; color: white; padding: 8px; font-size: 11px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #eee; font-size: 12px; }
          .totals { margin-left: auto; width: 250px; font-size: 12px; }
          .totals td { border: none; padding: 4px 8px; }
          .total-row { background: #1e40af; color: white; font-weight: bold; font-size: 14px; }
          .pay-table th { background: #f1f5f9; color: #333; font-size: 10px; }
          .pay-table td { font-size: 11px; }
          .status { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
          .status-paid { background: #d1fae5; color: #065f46; }
          .status-partial { background: #fef3c7; color: #92400e; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
          .signature { margin-top: 30px; border-top: 1px solid #ccc; width: 200px; padding-top: 5px; font-size: 10px; color: #999; }
          @media print { body { padding: 10px; } @page { size: A4; margin: 15mm; } }
        </style></head><body>
          <div class="header">
            <div>
              ${logoUrl ? `<img src="${logoUrl}" style="max-height:50px;margin-bottom:5px"/><br/>` : ""}
              <div class="company">${supermarketName}</div>
              <div class="company-info">${supermarketAddress}</div>
              <div class="company-info">${supermarketPhone}</div>
              ${rccmNumber ? `<div class="company-info">RC: ${rccmNumber}</div>` : ""}
              ${taxNumber ? `<div class="company-info">Tax ID: ${taxNumber}</div>` : ""}
            </div>
            <div>
              <div class="invoice-title">INVOICE</div>
              <div class="invoice-info">N° ${invoice.number}</div>
              <div class="invoice-info">Date: ${new Date(invoice.date).toLocaleDateString("en-GB")}</div>
              ${invoice.dueDate ? `<div class="invoice-info">Due: ${new Date(invoice.dueDate).toLocaleDateString("en-GB")}</div>` : ""}
            </div>
          </div>
          <div class="client-box">
            <b>BILLED TO:</b><br/>
            <b>${invoice.clientName}</b><br/>
            ${invoice.clientPhone}<br/>
            ${invoice.clientEmail || ""}
          </div>
          <table>
            <thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <table class="totals">
            <tr class="total-row"><td>TOTAL</td><td style="text-align:right">${formatCurrency(invoice.total)}</td></tr>
            <tr><td>Amount paid</td><td style="text-align:right;color:#16a34a;font-weight:bold">${formatCurrency(invoice.paidAmount)}</td></tr>
            <tr><td>Balance due</td><td style="text-align:right;color:${invoice.balance > 0 ? '#dc2626' : '#16a34a'};font-weight:bold">${formatCurrency(invoice.balance)}</td></tr>
            <tr><td colspan="2" style="text-align:right"><span class="status status-${invoice.status}">${invoice.status}</span></td></tr>
          </table>
          ${paymentsHtml}
          <div class="signature">Signature & stamp</div>
          <div class="footer">${invoiceFooter}</div>
        </body></html>
      `);
    }
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const sendWhatsApp = (invoice: Invoice) => {
    const msg = `Hello ${invoice.clientName},%0A%0AHere is your invoice ${invoice.number} from ${supermarketName}.%0A%0ATotal amount: ${formatCurrency(invoice.total)}%0ADate: ${new Date(invoice.date).toLocaleDateString()}%0A%0AGoods sold are non refundable.%0AThanks for patronizing us!`;
    window.open(`https://wa.me/${invoice.clientPhone.replace(/[^0-9]/g, "")}?text=${msg}`, "_blank");
    toast(`${t.factures.whatsappOpened} ${invoice.clientName}`, "info");
  };

  const sendEmail = (invoice: Invoice) => {
    const subject = `Invoice ${invoice.number} - ${supermarketName}`;
    const body = `Hello ${invoice.clientName},\n\nPlease find attached your invoice ${invoice.number}.\n\nTotal amount: ${formatCurrency(invoice.total)}\nDate: ${new Date(invoice.date).toLocaleDateString()}\n\nGoods sold are non refundable.\nThanks for patronizing us.\n\n${supermarketName}`;
    window.location.href = `mailto:${invoice.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast(t.factures.emailPrepared.replace("{email}", invoice.clientEmail), "info");
  };

  return (
    <AppShell title={t.factures.title} subtitle={t.factures.subtitle}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.factures.search}
              className="w-full pl-9 pr-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)] bg-white"
            />
          </div>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
            {t.factures.newInvoice}
          </Button>
          <Button
            variant="secondary"
            icon={<Download className="w-4 h-4" />}
            onClick={() => {
              if (invoices.length === 0) {
                toast(t.factures.noInvoicesToExport, "warning");
                return;
              }
              exportToCSV(
                invoices.map((inv) => ({
                  Numero: inv.number,
                  Client: inv.clientName,
                  Date: new Date(inv.date).toLocaleDateString("en-GB"),
                  Echeance: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-GB") : "",
                  Total: inv.total,
                  Paye: inv.paidAmount,
                  Solde: inv.total - inv.paidAmount,
                  Statut: inv.status,
                })),
                `factures_${new Date().toISOString().slice(0, 10)}`,
                [
                  { key: "Numero", label: "Number" },
                  { key: "Client", label: "Client" },
                  { key: "Date", label: "Date" },
                  { key: "Echeance", label: "Due date" },
                  { key: "Total", label: "Total (FCFA)" },
                  { key: "Paye", label: "Paid (FCFA)" },
                  { key: "Solde", label: "Balance (FCFA)" },
                  { key: "Statut", label: "Status" },
                ],
              );
              toast(t.factures.csvExportDownloaded, "success");
            }}
          >
            Export CSV
          </Button>
        </div>

        {/* Invoices table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                  <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">{t.factures.invoiceNumber}</th>
                  <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">{t.factures.client}</th>
                  <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">{t.factures.date}</th>
                  <th className="text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">{t.factures.total}</th>
                  <th className="text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">{t.factures.paidAmount}</th>
                  <th className="text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">{t.factures.remainingBalance}</th>
                  <th className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">{t.common.status}</th>
                  <th className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 py-3">{t.factures.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-[var(--text-primary)]">{invoice.number}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{invoice.clientName}</td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{new Date(invoice.date).toLocaleDateString("en-GB")}</td>
                    <td className="px-4 py-3 text-sm font-bold text-[var(--text-primary)] tabular-nums text-right">{formatCurrency(invoice.total)}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-right text-emerald-600 font-medium">{formatCurrency(invoice.paidAmount)}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-right font-medium">
                      <span className={invoice.balance > 0 ? "text-red-600" : "text-emerald-600"}>{formatCurrency(invoice.balance)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("inline-flex px-2 py-0.5 rounded-md text-xs font-medium", statusConfig[invoice.status].color)}>
                        {statusConfig[invoice.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {invoice.balance > 0 && (
                          <button onClick={() => openPaymentModal(invoice)} className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1">
                            <Wallet className="w-3.5 h-3.5" />
                            {t.factures.addPayment}
                          </button>
                        )}
                        <button onClick={() => openPaymentModal(invoice)} title={t.factures.paymentTracking} className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors">
                          <Wallet className="w-4 h-4 text-amber-600" />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setPrintMenuInvoice(printMenuInvoice?.id === invoice.id ? null : invoice)}
                            title={t.factures.print || "Print"}
                            className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Printer className="w-4 h-4 text-blue-500" />
                          </button>
                          {printMenuInvoice?.id === invoice.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setPrintMenuInvoice(null)} />
                              <div className="absolute right-0 top-8 z-50 bg-white border border-[var(--border)] rounded-xl shadow-lg py-1 min-w-[140px]">
                                <button
                                  onClick={() => printInvoice(invoice, "a4")}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                                  {t.factures.printA4}
                                </button>
                                <button
                                  onClick={() => printInvoice(invoice, "ticket")}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Printer className="w-3.5 h-3.5 text-emerald-500" />
                                  {t.factures.printTicket}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        <button onClick={() => generatePDF(invoice)} title="PDF" className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                          <FileText className="w-4 h-4 text-red-500" />
                        </button>
                        <button onClick={() => sendWhatsApp(invoice)} title="WhatsApp" className="p-1.5 hover:bg-green-50 rounded-lg transition-colors">
                          <Send className="w-4 h-4 text-green-500" />
                        </button>
                        {invoice.clientEmail && (
                          <button onClick={() => sendEmail(invoice)} title="Email" className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors">
                            <Send className="w-4 h-4 text-blue-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Modal: Create invoice */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between sticky top-0 bg-white pb-2 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{t.factures.newInvoice}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Client info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.factures.client} *</label>
                <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder={t.factures.clientName} className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.factures.clientPhone}</label>
                <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+237 6XX XXX XXX" className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.factures.clientEmail || "Email"}</label>
                <input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="contact@email.cm" className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)]" />
              </div>
            </div>

            {/* Items — product picker from stock */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">{t.common.product}s</label>
                <button onClick={addItem} className="text-xs text-[var(--brand)] font-medium hover:underline">+ {t.factures.addItem}</button>
              </div>

              {/* Scanner barcode — search bar style comme POS */}
              <div className="mb-3">
                <div className="flex items-center gap-2 bg-[#f0fdf4] border-2 border-[#86efac] rounded-xl px-4 py-2.5 focus-within:border-[#16a34a] transition-all">
                  <ScanLine className="w-5 h-5 text-[#16a34a] shrink-0" />
                  <input
                    ref={scanRef}
                    type="text"
                    value={scanSearch}
                    onChange={(e) => setScanSearch(e.target.value)}
                    onKeyDown={handleInvoiceScan}
                    placeholder={t.factures.scanProductPh || "Scan or search product to add..."}
                    className="flex-1 bg-transparent text-[15px] text-[#111827] placeholder:text-[#9ca3af] outline-none"
                  />
                  {scanSearch && (
                    <button onClick={() => setScanSearch("")}>
                      <X className="w-4 h-4 text-[#9ca3af] hover:text-[#374151]" />
                    </button>
                  )}
                </div>
                {/* Dropdown résultats recherche */}
                {scanSearch && products.filter((p) =>
                  p.name.toLowerCase().includes(scanSearch.toLowerCase()) ||
                  p.barcode?.includes(scanSearch) ||
                  p.sku?.toLowerCase().includes(scanSearch.toLowerCase())
                ).length > 0 && (
                  <div className="mt-1 bg-white border border-[var(--border)] rounded-xl overflow-hidden shadow-md max-h-48 overflow-y-auto">
                    {products
                      .filter((p) =>
                        p.name.toLowerCase().includes(scanSearch.toLowerCase()) ||
                        p.barcode?.includes(scanSearch) ||
                        p.sku?.toLowerCase().includes(scanSearch.toLowerCase())
                      )
                      .slice(0, 8)
                      .map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            const existingIdx = items.findIndex((i) => i.productId === p.id);
                            if (existingIdx >= 0) {
                              const newItems = [...items];
                              newItems[existingIdx].quantity += 1;
                              newItems[existingIdx].total = newItems[existingIdx].quantity * newItems[existingIdx].unitPrice;
                              setItems(newItems);
                            } else {
                              const lastIdx = items.length - 1;
                              if (items[lastIdx].productId) {
                                setItems([...items, {
                                  productId: p.id,
                                  description: p.name,
                                  quantity: 1,
                                  unitPrice: p.price,
                                  total: p.price,
                                }]);
                              } else {
                                selectProduct(lastIdx, p.id);
                              }
                            }
                            setScanSearch("");
                            scanRef.current?.focus();
                            toast(`${p.name} — ${formatCurrency(p.price)}`, "success");
                          }}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 flex items-center justify-between border-b border-[var(--border)] last:border-0"
                        >
                          <span className="font-medium">{p.name}</span>
                          <span className="text-xs text-[var(--text-muted)]">{formatCurrency(p.price)} · {t.stocks.stock}: {p.stock}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="border border-[var(--border)] rounded-xl p-3 space-y-2">
                    {/* Row 1: Product selector dropdown */}
                    <div className="flex gap-2 items-center">
                      <select
                        value={item.productId || ""}
                        onChange={(e) => {
                          if (e.target.value) {
                            selectProduct(idx, e.target.value);
                          } else {
                            updateItem(idx, "productId", "");
                            updateItem(idx, "description", "");
                            updateItem(idx, "unitPrice", 0);
                            updateItem(idx, "total", 0);
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg text-sm outline-none focus:border-[var(--brand)] bg-white"
                      >
                        <option value="">— {t.common.search} {t.common.product} —</option>
                        {products
                          .map((p) => (
                            <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                              {p.name} ({p.sku}) — {formatCurrency(p.price)} · {t.stocks.stock}: {p.stock} {p.unit}
                            </option>
                          ))}
                      </select>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="p-2 hover:bg-red-50 rounded-lg shrink-0">
                          <X className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-red-500" />
                        </button>
                      )}
                    </div>
                    {/* Row 2: Qty, unit price, total (auto-filled but editable) */}
                    <div className="flex gap-2 items-center">
                      <input
                        value={item.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                        placeholder={t.common.description}
                        className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg text-sm outline-none focus:border-[var(--brand)]"
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 0)}
                        placeholder={t.common.quantity}
                        className="w-16 px-2 py-2 border border-[var(--border)] rounded-lg text-sm tabular-nums text-center outline-none focus:border-[var(--brand)]"
                      />
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, "unitPrice", parseInt(e.target.value) || 0)}
                        placeholder={t.common.price}
                        className="w-24 px-2 py-2 border border-[var(--border)] rounded-lg text-sm tabular-nums text-right outline-none focus:border-[var(--brand)]"
                      />
                      <span className="w-28 text-right text-sm font-semibold tabular-nums py-2">{formatCurrency(item.total)}</span>
                    </div>
                    {/* Stock warning */}
                    {item.productId && (() => {
                      const p = products.find((pr) => pr.id === item.productId);
                      if (!p) return null;
                      if (item.quantity > p.stock) {
                        return <p className="text-xs text-red-500">⚠ {t.stocks.noHistory}: stock = {p.stock} {p.unit}</p>;
                      }
                      return <p className="text-xs text-[var(--text-muted)]">{t.stocks.stock}: {p.stock} {p.unit} → {p.stock - item.quantity} {t.common.after}</p>;
                    })()}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between font-bold text-base pt-1 border-t border-[var(--border)]">
                <span>{t.factures.total}</span>
                <span className="tabular-nums text-[var(--brand)]">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Acompte (avance) */}
            <div className="border border-[var(--border)] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[var(--brand)]" />
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                  {t.factures.advance}
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min={0}
                  value={advancePayment}
                  onChange={(e) => setAdvancePayment(e.target.value)}
                  placeholder="0"
                  className="px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm tabular-nums outline-none focus:border-[var(--brand)]"
                />
                <select
                  value={advanceMethod}
                  onChange={(e) => setAdvanceMethod(e.target.value)}
                  className="px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)] bg-white"
                >
                  <option value="cash">{t.factures.cash}</option>
                  <option value="mobile">Mobile Money</option>
                  <option value="card">{t.factures.card}</option>
                  <option value="transfer">{t.factures.transfer}</option>
                </select>
              </div>
              {advancePayment && parseFloat(advancePayment) > 0 && (
                <div className="flex justify-between text-xs bg-amber-50 rounded-lg px-3 py-2">
                  <span className="text-amber-700">{t.factures.remainingBalance}:</span>
                  <span className="font-bold text-amber-700 tabular-nums">{formatCurrency(total - (parseFloat(advancePayment) || 0))}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>{t.common.cancel}</Button>
              <Button className="flex-1" onClick={handleCreate} disabled={!clientName}>{t.factures.create}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Suivi paiement */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closePaymentModal}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between sticky top-0 bg-white pb-2 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">{t.factures.paymentTracking} — {paymentInvoice.number}</h3>
              </div>
              <button onClick={closePaymentModal} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Résumé facture */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">{t.factures.total}</div>
                <div className="text-sm font-bold tabular-nums text-[var(--text-primary)]">{formatCurrency(paymentInvoice.total)}</div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <div className="text-xs text-emerald-600 uppercase tracking-wide flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t.factures.paidAmount}</div>
                <div className="text-sm font-bold tabular-nums text-emerald-700">{formatCurrency(paymentInvoice.paidAmount)}</div>
              </div>
              <div className={cn("rounded-xl p-3", paymentInvoice.balance > 0 ? "bg-red-50" : "bg-emerald-50")}>
                <div className={cn("text-xs uppercase tracking-wide flex items-center gap-1", paymentInvoice.balance > 0 ? "text-red-600" : "text-emerald-600")}>
                  {paymentInvoice.balance > 0 ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />} {t.factures.remainingBalance}
                </div>
                <div className={cn("text-sm font-bold tabular-nums", paymentInvoice.balance > 0 ? "text-red-700" : "text-emerald-700")}>{formatCurrency(paymentInvoice.balance)}</div>
              </div>
            </div>

            {/* Barre de progression */}
            <div>
              <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                <span>{t.factures.paymentProgress}</span>
                <span>{Math.round((paymentInvoice.paidAmount / paymentInvoice.total) * 100)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", paymentInvoice.balance <= 0 ? "bg-emerald-500" : "bg-amber-500")}
                  style={{ width: `${Math.min(100, (paymentInvoice.paidAmount / paymentInvoice.total) * 100)}%` }}
                />
              </div>
            </div>

            {/* Historique des paiements */}
            <div>
              <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">{t.factures.paymentHistory}</div>
              {paymentInvoice.payments.length === 0 ? (
                <div className="text-sm text-[var(--text-muted)] italic py-3 text-center bg-slate-50 rounded-xl">{t.factures.noPayments}</div>
              ) : (
                <div className="space-y-2">
                  {paymentInvoice.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[var(--text-primary)] tabular-nums">{formatCurrency(p.amount)}</div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {paymentMethodLabels[p.method] || p.method} · {new Date(p.date).toLocaleDateString("en-GB")}
                            {p.note && ` · ${p.note}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formulaire d'ajout paiement */}
            {paymentInvoice.balance > 0 ? (
              <div className="border-t border-[var(--border)] pt-4 space-y-3">
                <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">{t.factures.addPayment}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1.5 block">{t.common.amount}</label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder={String(paymentInvoice.balance)}
                      className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm tabular-nums outline-none focus:border-[var(--brand)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1.5 block">{t.common.method}</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)] bg-white"
                    >
                      <option value="cash">{t.common.cash}</option>
                      <option value="mobile">{t.common.mobile}</option>
                      <option value="card">{t.common.card}</option>
                      <option value="bank">{t.common.bank}</option>
                      <option value="check">{t.common.check}</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-[var(--text-muted)] mb-1.5 block">{t.common.notes}</label>
                    <input
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder={t.common.notes}
                      className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)]"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={closePaymentModal}>{t.common.close}</Button>
                  <Button className="flex-1" onClick={handleAddPayment} disabled={addingPayment || !paymentAmount}>
                    {addingPayment ? t.common.saving : t.factures.savePayment}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button variant="secondary" onClick={closePaymentModal}>{t.common.close}</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
