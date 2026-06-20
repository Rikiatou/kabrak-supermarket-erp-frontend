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
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, cn } from "@/lib/utils";
import { exportToCSV } from "@/lib/export";
import { useInvoices, useCreateInvoice, useUpdateInvoiceStatus, useAddPayment } from "@/lib/hooks/useApi";
import type { ApiInvoicePayment } from "@/lib/api";
import jsPDF from "jspdf";
import QRCode from "qrcode";

interface InvoiceItem {
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
      { description: "Riz parfumé 25kg", quantity: 10, unitPrice: 18000, total: 180000 },
      { description: "Huile végétale 5L", quantity: 5, unitPrice: 12000, total: 60000 },
    ],
    subtotal: 240000,
    tax: 37200,
    total: 277200,
    paidAmount: 277200,
    balance: 0,
    status: "paid",
    payments: [
      { id: "p1", amount: 277200, method: "mobile", date: "2026-06-18", note: "Paiement intégral MTN MoMo" },
    ],
  },
  {
    id: "2",
    number: "FAC-2026-0002",
    date: "2026-06-17",
    dueDate: "2026-07-17",
    clientName: "Hôtel Mont Fébé",
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
      { id: "p2", amount: 150000, method: "cash", date: "2026-06-17", note: "Acompte espèces" },
    ],
  },
];

export default function FacturesPage() {
  const { t } = useI18n();
  const { toast } = useToast();

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
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);

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

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const tax = Math.round(subtotal * 0.155);
  const total = subtotal + tax;

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
      })),
    });
    if (result) {
      toast(`${t.factures.invoiceCreated}: ${result.number}`, "success");
      reload();
    } else {
      toast(t.factures.invoiceCreatedLocal, "warning");
    }
    setShowModal(false);
    setClientName("");
    setClientPhone("");
    setClientEmail("");
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
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;

    // Header band
    pdf.setFillColor(30, 64, 175);
    pdf.rect(0, 0, pageWidth, 40, "F");

    // Logo / Company name
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont("helvetica", "bold");
    pdf.text("KABRAK MARKET", margin, 20);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text("Supermarket Pro - Yaoundé, Cameroun", margin, 28);
    pdf.text("Tel: +237 6XX XXX XXX | N° RC: CM/YDE/2024/B/123", margin, 34);

    // Invoice title
    pdf.setTextColor(30, 64, 175);
    pdf.setFontSize(28);
    pdf.setFont("helvetica", "bold");
    pdf.text("FACTURE", pageWidth - margin - 50, 55);

    // Invoice info
    pdf.setTextColor(100, 100, 100);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`N° ${invoice.number}`, pageWidth - margin - 50, 62);
    pdf.text(`Date: ${new Date(invoice.date).toLocaleDateString("fr-FR")}`, pageWidth - margin - 50, 68);

    // Client info box
    pdf.setDrawColor(220, 220, 220);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(margin, 80, pageWidth - 2 * margin, 35, 3, 3, "FD");
    pdf.setTextColor(60, 60, 60);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text("FACTURÉ À:", margin + 5, 88);
    pdf.setFontSize(11);
    pdf.text(invoice.clientName, margin + 5, 96);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(invoice.clientPhone, margin + 5, 103);
    if (invoice.clientEmail) pdf.text(invoice.clientEmail, margin + 5, 108);

    // QR Code (right side of client box)
    try {
      const qrData = `FACTURE:${invoice.number};TOTAL:${invoice.total};CLIENT:${invoice.clientName}`;
      const qrDataUrl = await QRCode.toDataURL(qrData, { width: 80, margin: 1 });
      pdf.addImage(qrDataUrl, "PNG", pageWidth - margin - 25, 82, 22, 22);
    } catch {}

    // Items table
    const tableY = 130;
    pdf.setFillColor(30, 64, 175);
    pdf.rect(margin, tableY, pageWidth - 2 * margin, 10, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text("Description", margin + 5, tableY + 7);
    pdf.text("Qté", margin + 110, tableY + 7, { align: "center" });
    pdf.text("Prix unit.", margin + 135, tableY + 7, { align: "right" });
    pdf.text("Total", pageWidth - margin - 5, tableY + 7, { align: "right" });

    let y = tableY + 18;
    pdf.setTextColor(50, 50, 50);
    pdf.setFont("helvetica", "normal");
    invoice.items.forEach((item, idx) => {
      if (idx > 0) {
        pdf.setDrawColor(235, 235, 235);
        pdf.line(margin, y - 5, pageWidth - margin, y - 5);
      }
      pdf.text(item.description.substring(0, 50), margin + 5, y);
      pdf.text(String(item.quantity), margin + 110, y, { align: "center" });
      pdf.text(formatCurrency(item.unitPrice), margin + 135, y, { align: "right" });
      pdf.setFont("helvetica", "bold");
      pdf.text(formatCurrency(item.total), pageWidth - margin - 5, y, { align: "right" });
      pdf.setFont("helvetica", "normal");
      y += 10;
    });

    // Totals
    y += 10;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin + 90, y, pageWidth - margin, y);
    y += 8;
    pdf.setFontSize(10);
    pdf.text("Sous-total:", margin + 95, y);
    pdf.text(formatCurrency(invoice.subtotal), pageWidth - margin - 5, y, { align: "right" });
    y += 8;
    pdf.text("TVA (15.5%):", margin + 95, y);
    pdf.text(formatCurrency(invoice.tax), pageWidth - margin - 5, y, { align: "right" });
    y += 10;
    pdf.setFillColor(30, 64, 175);
    pdf.rect(margin + 90, y - 6, pageWidth - margin - 90, 12, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("TOTAL TTC:", margin + 95, y + 2);
    pdf.text(formatCurrency(invoice.total), pageWidth - margin - 5, y + 2, { align: "right" });

    // Footer
    pdf.setTextColor(150, 150, 150);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text("Merci pour votre confiance!", pageWidth / 2, y + 30, { align: "center" });
    pdf.text("KABRAK Supermarket Pro - SIRET: CM-2024-12345 - Tel: +237 6XX XXX XXX", pageWidth / 2, y + 36, { align: "center" });
    pdf.text("Conditions de paiement: 30 jours. Litiges: Tribunal de Commerce de Yaoundé.", pageWidth / 2, y + 42, { align: "center" });

    // Signature area
    pdf.setDrawColor(180, 180, 180);
    pdf.line(margin, y + 55, margin + 50, y + 55);
    pdf.text("Signature & cachet", margin + 5, y + 62);

    pdf.save(`${invoice.number}.pdf`);
    toast(`${t.factures.pdfGenerated} ${invoice.number}.pdf`, "success");
  };

  const sendWhatsApp = (invoice: Invoice) => {
    const msg = `Bonjour ${invoice.clientName},%0A%0AVoici votre facture ${invoice.number} de KABRAK MARKET.%0A%0AMontant total: ${formatCurrency(invoice.total)}%0ADate: ${new Date(invoice.date).toLocaleDateString("fr-FR")}%0A%0AMerci pour votre confiance!`;
    window.open(`https://wa.me/${invoice.clientPhone.replace(/[^0-9]/g, "")}?text=${msg}`, "_blank");
    toast(`${t.factures.whatsappOpened} ${invoice.clientName}`, "info");
  };

  const sendEmail = (invoice: Invoice) => {
    const subject = `Facture ${invoice.number} - KABRAK MARKET`;
    const body = `Bonjour ${invoice.clientName},\n\nVeuillez trouver ci-joint votre facture ${invoice.number}.\n\nMontant total: ${formatCurrency(invoice.total)}\nDate: ${new Date(invoice.date).toLocaleDateString("fr-FR")}\n\nMerci pour votre confiance.\n\nKABRAK MARKET`;
    window.location.href = `mailto:${invoice.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast(`Email préparé pour ${invoice.clientEmail}`, "info");
  };

  return (
    <AppShell title={t.factures.title} subtitle={t.factures.subtitle}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 relative">
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
                toast("Aucune facture à exporter", "warning");
                return;
              }
              exportToCSV(
                invoices.map((inv) => ({
                  Numero: inv.number,
                  Client: inv.clientName,
                  Date: new Date(inv.date).toLocaleDateString("fr-FR"),
                  Echeance: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("fr-FR") : "",
                  Total: inv.total,
                  Paye: inv.paidAmount,
                  Solde: inv.total - inv.paidAmount,
                  Statut: inv.status,
                })),
                `factures_${new Date().toISOString().slice(0, 10)}`,
                [
                  { key: "Numero", label: "Numéro" },
                  { key: "Client", label: "Client" },
                  { key: "Date", label: "Date" },
                  { key: "Echeance", label: "Échéance" },
                  { key: "Total", label: "Total (FCFA)" },
                  { key: "Paye", label: "Payé (FCFA)" },
                  { key: "Solde", label: "Solde (FCFA)" },
                  { key: "Statut", label: "Statut" },
                ],
              );
              toast("Export CSV téléchargé", "success");
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
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{new Date(invoice.date).toLocaleDateString("fr-FR")}</td>
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
                        <button onClick={() => openPaymentModal(invoice)} title="Suivi paiement" className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors">
                          <Wallet className="w-4 h-4 text-amber-600" />
                        </button>
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
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Nouvelle facture A4</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Client info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">Client *</label>
                <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nom de l'entreprise" className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">Téléphone</label>
                <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+237 6XX XXX XXX" className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">Email</label>
                <input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="contact@email.cm" className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)]" />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Articles</label>
                <button onClick={addItem} className="text-xs text-[var(--brand)] font-medium hover:underline">+ Ajouter une ligne</button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                      placeholder="Description"
                      className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg text-sm outline-none focus:border-[var(--brand)]"
                    />
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 0)}
                      placeholder="Qté"
                      className="w-16 px-2 py-2 border border-[var(--border)] rounded-lg text-sm tabular-nums text-center outline-none focus:border-[var(--brand)]"
                    />
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, "unitPrice", parseInt(e.target.value) || 0)}
                      placeholder="Prix"
                      className="w-24 px-2 py-2 border border-[var(--border)] rounded-lg text-sm tabular-nums text-right outline-none focus:border-[var(--brand)]"
                    />
                    <span className="w-28 text-right text-sm font-semibold tabular-nums py-2">{formatCurrency(item.total)}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="p-2 hover:bg-red-50 rounded-lg">
                        <X className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-red-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Sous-total</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>TVA (15.5%)</span>
                <span className="tabular-nums">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1 border-t border-[var(--border)]">
                <span>Total TTC</span>
                <span className="tabular-nums text-[var(--brand)]">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Annuler</Button>
              <Button className="flex-1" onClick={handleCreate} disabled={!clientName}>Créer la facture</Button>
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
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Suivi paiement — {paymentInvoice.number}</h3>
              </div>
              <button onClick={closePaymentModal} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Résumé facture */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Total</div>
                <div className="text-sm font-bold tabular-nums text-[var(--text-primary)]">{formatCurrency(paymentInvoice.total)}</div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <div className="text-xs text-emerald-600 uppercase tracking-wide flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Payé</div>
                <div className="text-sm font-bold tabular-nums text-emerald-700">{formatCurrency(paymentInvoice.paidAmount)}</div>
              </div>
              <div className={cn("rounded-xl p-3", paymentInvoice.balance > 0 ? "bg-red-50" : "bg-emerald-50")}>
                <div className={cn("text-xs uppercase tracking-wide flex items-center gap-1", paymentInvoice.balance > 0 ? "text-red-600" : "text-emerald-600")}>
                  {paymentInvoice.balance > 0 ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />} Reste
                </div>
                <div className={cn("text-sm font-bold tabular-nums", paymentInvoice.balance > 0 ? "text-red-700" : "text-emerald-700")}>{formatCurrency(paymentInvoice.balance)}</div>
              </div>
            </div>

            {/* Barre de progression */}
            <div>
              <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                <span>Avancement paiement</span>
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
              <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Historique des paiements</div>
              {paymentInvoice.payments.length === 0 ? (
                <div className="text-sm text-[var(--text-muted)] italic py-3 text-center bg-slate-50 rounded-xl">Aucun paiement enregistré</div>
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
                            {paymentMethodLabels[p.method] || p.method} · {new Date(p.date).toLocaleDateString("fr-FR")}
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
                <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Enregistrer un paiement</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Montant</label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder={String(paymentInvoice.balance)}
                      className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm tabular-nums outline-none focus:border-[var(--brand)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Méthode</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)] bg-white"
                    >
                      <option value="cash">Espèces</option>
                      <option value="mobile">Mobile Money</option>
                      <option value="card">Carte</option>
                      <option value="bank">Virement</option>
                      <option value="check">Chèque</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Note (optionnel)</label>
                    <input
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder="Référence, remarque..."
                      className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)]"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={closePaymentModal}>Fermer</Button>
                  <Button className="flex-1" onClick={handleAddPayment} disabled={addingPayment || !paymentAmount}>
                    {addingPayment ? "Enregistrement..." : "Enregistrer le paiement"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button variant="secondary" onClick={closePaymentModal}>Fermer</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
