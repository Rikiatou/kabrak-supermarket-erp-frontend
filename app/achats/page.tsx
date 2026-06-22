"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Star,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  X,
  FileText,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Truck,
  Printer,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/Toast";
import { NewSupplierModal } from "@/components/forms/NewSupplierModal";
import { NewOrderModal } from "@/components/forms/NewOrderModal";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { suppliers as mockSuppliers } from "@/lib/mock-data";
import { useSuppliers, usePurchaseOrders, useCreatePurchaseOrder, useProducts } from "@/lib/hooks/useApi";
import { suppliersApi, purchaseOrdersApi } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import type { Supplier } from "@/lib/types";

type OrderStatus = "draft" | "sent" | "received" | "cancelled";

const mockOrders = [
  {
    id: "BC-2026-0041",
    supplier: mockSuppliers[0],
    date: "2026-04-28",
    expectedDate: "2026-04-30",
    total: 340000,
    status: "sent" as OrderStatus,
    itemCount: 8,
  },
  {
    id: "BC-2026-0040",
    supplier: mockSuppliers[1],
    date: "2026-04-26",
    expectedDate: "2026-04-29",
    total: 185000,
    status: "received" as OrderStatus,
    itemCount: 5,
  },
  {
    id: "BC-2026-0039",
    supplier: mockSuppliers[3],
    date: "2026-04-24",
    expectedDate: "2026-05-05",
    total: 620000,
    status: "sent" as OrderStatus,
    itemCount: 12,
  },
  {
    id: "BC-2026-0038",
    supplier: mockSuppliers[2],
    date: "2026-04-22",
    expectedDate: "2026-04-24",
    total: 98000,
    status: "received" as OrderStatus,
    itemCount: 3,
  },
  {
    id: "BC-2026-0037",
    supplier: mockSuppliers[0],
    date: "2026-04-20",
    expectedDate: "2026-04-22",
    total: 510000,
    status: "received" as OrderStatus,
    itemCount: 10,
  },
  {
    id: "BC-2026-0036",
    supplier: mockSuppliers[1],
    date: "2026-04-18",
    expectedDate: "2026-04-20",
    total: 75000,
    status: "cancelled" as OrderStatus,
    itemCount: 2,
  },
];

function useOrderStatusConfig(t: ReturnType<typeof useI18n>["t"]) {
  return {
    draft: { label: t.achats.status.draft, badge: "neutral" as const, icon: FileText },
    sent: { label: t.achats.status.sent, badge: "info" as const, icon: Clock },
    received: { label: t.achats.status.received, badge: "success" as const, icon: CheckCircle2 },
    cancelled: { label: t.achats.status.cancelled, badge: "danger" as const, icon: XCircle },
  };
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "w-3 h-3",
            star <= Math.floor(rating)
              ? "fill-amber-400 text-amber-400"
              : star <= rating
              ? "fill-amber-200 text-amber-200"
              : "fill-slate-200 text-slate-200"
          )}
        />
      ))}
      <span className="text-[11px] font-medium text-[var(--text-muted)] ml-1 tabular-nums">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

export default function AchatsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { suppliers: apiSuppliers } = useSuppliers();
  const { data: apiOrders, reload: reloadOrders } = usePurchaseOrders();
  const { create: createOrder, creating: creatingOrder } = useCreatePurchaseOrder();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"orders" | "suppliers" | "deliveries">("orders");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [orderSupplier, setOrderSupplier] = useState<Supplier | undefined>(undefined);

  // Delivery note state
  const { products: allProducts } = useProducts();
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [deliveryRef, setDeliveryRef] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [deliverySupplierId, setDeliverySupplierId] = useState("");
  const [deliveryProductSearch, setDeliveryProductSearch] = useState<string[]>([]);
  type DeliveryLine = { productId: string; qty: number; unitPrice: number };
  const [deliveryLines, setDeliveryLines] = useState<DeliveryLine[]>([
    { productId: "", qty: 1, unitPrice: 0 },
  ]);
  const [printDelivery, setPrintDelivery] = useState<null | {
    ref: string; date: string; supplier: string; lines: Array<{ name: string; qty: number; unitPrice: number; total: number }>; grandTotal: number;
  }>(null);

  const addDeliveryLine = () => setDeliveryLines((l) => [...l, { productId: "", qty: 1, unitPrice: 0 }]);
  const removeDeliveryLine = (i: number) => setDeliveryLines((l) => l.filter((_, idx) => idx !== i));
  const updateDeliveryLine = (i: number, field: keyof DeliveryLine, value: string | number) =>
    setDeliveryLines((l) => l.map((line, idx) => idx === i ? { ...line, [field]: value } : line));

  const deliveryGrandTotal = deliveryLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);

  const resetDeliveryForm = () => {
    setDeliveryRef(""); setDeliveryDate(new Date().toISOString().split("T")[0]);
    setDeliverySupplierId(""); setDeliveryLines([{ productId: "", qty: 1, unitPrice: 0 }]);
  };

  const handleSaveDelivery = useCallback(async () => {
    if (!deliverySupplierId) { toast("Select a supplier", "warning"); return; }
    const validLines = deliveryLines.filter((l) => l.productId && l.qty > 0 && l.unitPrice > 0);
    if (validLines.length === 0) { toast("Add at least one product with quantity and price", "warning"); return; }
    setSavingDelivery(true);
    try {
      await purchaseOrdersApi.createDirect({
        supplierId: deliverySupplierId,
        expectedDate: deliveryDate,
        invoiceNumber: deliveryRef || undefined,
        notes: deliveryRef ? `Bordereau ref: ${deliveryRef}` : undefined,
        items: validLines.map((l) => ({ productId: l.productId, quantity: l.qty, unitCost: l.unitPrice })),
      });
      toast(`Delivery note saved — stock updated for ${validLines.length} product(s)`, "success");
      reloadOrders();
      setShowDeliveryForm(false);
      resetDeliveryForm();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to save delivery note", "warning");
    } finally {
      setSavingDelivery(false);
    }
  }, [deliverySupplierId, deliveryDate, deliveryRef, deliveryLines, reloadOrders, toast]);

  const handlePrintDelivery = (order: typeof orders[0]) => {
    const sup = suppliers.find((s) => s.id === order.supplier.id) || order.supplier;
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    const rows = Array.from({ length: 20 }, (_, i) => `
      <tr>
        <td style="border:1px solid #ccc;padding:4px 6px;font-size:11px;">&nbsp;</td>
        <td style="border:1px solid #ccc;padding:4px 6px;text-align:center;font-size:11px;">&nbsp;</td>
        <td style="border:1px solid #ccc;padding:4px 6px;text-align:right;font-size:11px;">&nbsp;</td>
        <td style="border:1px solid #ccc;padding:4px 6px;text-align:right;font-size:11px;">&nbsp;</td>
      </tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>Delivery Note ${order.id}</title>
      <style>
        body{font-family:Arial,sans-serif;width:780px;margin:20px auto;color:#000}
        h2{text-align:center;font-size:16px;border:2px solid #000;padding:6px;margin:8px 0}
        .meta{display:flex;justify-content:space-between;margin-bottom:8px;font-size:12px}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th{background:#eee;border:1px solid #999;padding:5px 6px;font-size:11px;text-align:left}
        .totals{margin-top:12px;text-align:right;font-size:13px;font-weight:bold}
        .sig{display:flex;justify-content:space-between;margin-top:40px;font-size:12px}
        .sig div{border-top:1px solid #000;padding-top:4px;width:180px;text-align:center}
        @media print{button{display:none}}
      </style></head><body>
      <div class="meta">
        <div><strong>Supplier:</strong> ${sup.name}</div>
        <div><strong>Date:</strong> ${order.date}</div>
        <div><strong>Ref #:</strong> <strong>${order.id}</strong></div>
      </div>
      <h2>DELIVERY NOTE — BORDEREAU DE LIVRAISON</h2>
      <table>
        <thead><tr>
          <th style="width:50%">DESIGNATION</th>
          <th style="width:12%;text-align:center">QTE</th>
          <th style="width:19%;text-align:right">P.U. (FCFA)</th>
          <th style="width:19%;text-align:right">P. TOTAL (FCFA)</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals">TOTAL HT: _____________________ FCFA</div>
      <div class="sig">
        <div>CLIENT</div><div>LIVREUR</div>
      </div>
      <br/><button onclick="window.print()" style="margin-top:16px;padding:8px 20px;font-size:13px;cursor:pointer">Print PDF</button>
    </body></html>`);
    w.document.close();
  };

  // Convertir les suppliers API au format frontend, fallback sur mock
  const suppliers: Supplier[] = apiSuppliers.length > 0
    ? apiSuppliers.map((s) => ({
        id: s.id,
        name: s.name,
        contact: s.contact,
        phone: s.phone,
        email: s.email || "",
        address: s.address || "",
        paymentTerms: s.paymentTerms,
        rating: s.rating,
        totalOrders: s._count?.purchaseOrders || 0,
        pendingOrders: 0,
      }))
    : mockSuppliers;

  const openNewOrder = (supplier?: Supplier) => {
    setOrderSupplier(supplier);
    setShowNewOrder(true);
  };
  const [supplierList, setSupplierList] = useState<Supplier[]>([]);

  // Sync supplierList avec suppliers du backend
  useEffect(() => {
    if (suppliers.length > 0) {
      setSupplierList(suppliers);
    }
  }, [suppliers]);

  const handleNewSupplier = async (data: Omit<Supplier, "id" | "rating" | "totalOrders" | "pendingOrders">) => {
    try {
      const created = await suppliersApi.create({
        name: data.name,
        contact: data.contact,
        phone: data.phone,
        email: data.email || undefined,
        address: data.address,
        paymentTerms: data.paymentTerms,
      });
      const newSup: Supplier = {
        id: created.id,
        name: created.name,
        contact: created.contact || "",
        phone: created.phone || "",
        email: created.email || "",
        address: created.address || "",
        paymentTerms: created.paymentTerms || "",
        rating: created.rating || 0,
        totalOrders: 0,
        pendingOrders: 0,
      };
      setSupplierList((prev) => [newSup, ...prev]);
      toast(`${t.achats.supplierAdded} ${data.name}`, "success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t.achats.errorAdd;
      toast(msg, "warning");
      // Fallback local
      const newSup: Supplier = { ...data, id: `s${Date.now()}`, rating: 0, totalOrders: 0, pendingOrders: 0 };
      setSupplierList((prev) => [newSup, ...prev]);
    }
  };

  // Convertir les orders API au format frontend, fallback sur mock
  const orders = apiOrders && apiOrders.length > 0
    ? apiOrders.map((o) => {
        const supplier = suppliers.find((s) => s.id === o.supplierId);
        return {
          id: o.orderNumber,
          supplier: supplier || { id: o.supplierId, name: t.achats.suppliers, contact: "", phone: "", email: "", address: "", paymentTerms: "", rating: 0, totalOrders: 0, pendingOrders: 0 },
          date: new Date(o.date).toISOString().split("T")[0],
          expectedDate: new Date(o.expectedDate).toISOString().split("T")[0],
          total: o.total,
          status: o.status as OrderStatus,
          itemCount: o.items?.length || 0,
        };
      })
    : mockOrders;

  const totalSpend = orders
    .filter((o) => o.status === "received")
    .reduce((s, o) => s + o.total, 0);
  const pendingOrdersCount = orders.filter((o) => o.status === "sent").length;

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      !search ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.supplier.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredSuppliers = suppliers.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.contact.toLowerCase().includes(search.toLowerCase())
  );

  const orderStatusConfig = useOrderStatusConfig(t);

  return (
    <AppShell title={t.achats.title} subtitle={t.achats.subtitle}>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: t.achats.activeSuppliers, value: suppliers.length },
          { label: t.achats.pendingOrders, value: pendingOrdersCount },
          { label: t.achats.monthlyPurchases, value: formatCurrency(totalSpend) },
          { label: t.achats.avgDelivery, value: `2.4 ${t.achats.days}` },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-[var(--shadow-sm)]"
          >
            <p className="text-xl font-semibold text-[var(--text-primary)] tabular-nums leading-none">{value}</p>
            <p className="text-[12px] text-[var(--text-muted)] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tab + toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1 bg-white border border-[var(--border)] rounded-xl p-1 shadow-[var(--shadow-sm)]">
          {[
            { key: "orders", label: t.achats.purchaseOrders },
            { key: "deliveries", label: "Delivery Notes" },
            { key: "suppliers", label: t.achats.suppliers },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as "orders" | "suppliers" | "deliveries")}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-lg transition-all",
                activeTab === key
                  ? "bg-[var(--brand)] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white border border-[var(--border)] rounded-xl px-3 py-2 flex-1 min-w-[200px] focus-within:border-[var(--brand)] transition-colors shadow-[var(--shadow-sm)]">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === "orders" ? t.achats.orderNumber : t.achats.suppliers}
            className="flex-1 bg-transparent text-sm placeholder:text-[var(--text-muted)] outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>
          )}
        </div>

        {activeTab === "orders" && (
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}
              className="appearance-none bg-white border border-[var(--border)] rounded-xl px-3 py-2 pr-8 text-sm text-[var(--text-secondary)] outline-none cursor-pointer shadow-[var(--shadow-sm)]"
            >
              <option value="all">{t.achats.status.all}</option>
              <option value="draft">{t.achats.status.draft}</option>
              <option value="sent">{t.achats.status.sent}</option>
              <option value="received">{t.achats.status.received}</option>
              <option value="cancelled">{t.achats.status.cancelled}</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        <Button
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            if (activeTab === "suppliers") setShowNewSupplier(true);
            else if (activeTab === "deliveries") setShowDeliveryForm(true);
            else openNewOrder();
          }}
        >
          {activeTab === "orders" ? t.achats.newOrder : activeTab === "deliveries" ? "New Delivery" : t.achats.newSupplier}
        </Button>
      </div>

      {/* Orders table */}
      {activeTab === "orders" && (
        <Card padding="none">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-slate-50/60">
                {[t.achats.orderNumber, t.achats.suppliers, t.achats.orderDate, t.achats.expectedDelivery, t.achats.items, t.achats.amount, t.common.status, ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const config = orderStatusConfig[order.status];
                const StatusIcon = config.icon;
                return (
                  <tr
                    key={order.id}
                    className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-medium text-[var(--text-primary)]">
                        {order.id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[var(--brand-light)] flex items-center justify-center text-[10px] font-bold text-[var(--brand)] shrink-0">
                          {order.supplier.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {order.supplier.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)] tabular-nums">
                      {order.date}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)] tabular-nums">
                      {order.expectedDate}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                        <Package className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        {order.itemCount} {t.achats.items}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={config.badge} size="sm">
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => toast(`${order.id} — ${order.supplier.name}`, "info")}
                          className="px-2.5 py-1 text-xs font-medium text-[var(--brand)] bg-[var(--brand-light)] rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          {t.common.view}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Delivery Notes list */}
      {activeTab === "deliveries" && (() => {
        const deliveries = orders.filter((o) => o.status === "received");
        return (
          <Card padding="none">
            {deliveries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Truck className="w-10 h-10 text-[var(--text-muted)] mb-3 opacity-40" />
                <p className="text-sm font-medium text-[var(--text-secondary)]">No delivery notes yet</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Click "New Delivery" to record a received delivery</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-slate-50/60">
                    {["Ref / Order #", "Supplier", "Date", "Products", "Total", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((d) => (
                    <tr key={d.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono font-medium text-[var(--text-primary)]">{d.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-[10px] font-bold text-emerald-700 shrink-0">
                            {d.supplier.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-[var(--text-primary)]">{d.supplier.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)] tabular-nums">{d.date}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                          <Package className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          {d.itemCount} items
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-[var(--text-primary)] tabular-nums">{formatCurrency(d.total)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handlePrintDelivery(d)}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                          <Printer className="w-3 h-3" />
                          Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        );
      })()}

      {/* Delivery Note Form panel */}
      {showDeliveryForm && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40" onClick={() => setShowDeliveryForm(false)} />
          <div className="fixed right-0 top-0 h-screen w-[540px] bg-white shadow-[var(--shadow-lg)] z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--text-primary)] text-sm">New Delivery Note</h2>
                  <p className="text-xs text-[var(--text-muted)]">Bordereau de Livraison — stock auto-updated on save</p>
                </div>
              </div>
              <button onClick={() => setShowDeliveryForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Row 1: Supplier + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">Supplier *</label>
                  <select
                    value={deliverySupplierId}
                    onChange={(e) => setDeliverySupplierId(e.target.value)}
                    className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand)] bg-white"
                  >
                    <option value="">— Select supplier —</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">Date *</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
                  />
                </div>
              </div>

              {/* Ref number */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">Bordereau Reference #</label>
                <input
                  type="text"
                  value={deliveryRef}
                  onChange={(e) => setDeliveryRef(e.target.value)}
                  placeholder="e.g. 0020182"
                  className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
                />
              </div>

              {/* Items table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Products *</label>
                  <button onClick={addDeliveryLine} className="flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:text-blue-700 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add line
                  </button>
                </div>

                {/* Header */}
                <div className="grid grid-cols-[1fr_72px_90px_90px_32px] gap-1.5 mb-1">
                  {["Product", "QTE", "P.U. (FCFA)", "P. TOTAL", ""].map((h) => (
                    <span key={h} className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide px-1">{h}</span>
                  ))}
                </div>

                <div className="space-y-1.5">
                  {deliveryLines.map((line, i) => {
                    const lineTotal = line.qty * line.unitPrice;
                    return (
                      <div key={i} className="grid grid-cols-[1fr_72px_90px_90px_32px] gap-1.5 items-center">
                        <select
                          value={line.productId}
                          onChange={(e) => updateDeliveryLine(i, "productId", e.target.value)}
                          className="border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--brand)] bg-white truncate"
                        >
                          <option value="">— select —</option>
                          {allProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input
                          type="number" min="1" value={line.qty}
                          onChange={(e) => updateDeliveryLine(i, "qty", Math.max(1, parseInt(e.target.value) || 1))}
                          className="border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-center outline-none focus:border-[var(--brand)] tabular-nums"
                        />
                        <input
                          type="number" min="0" value={line.unitPrice}
                          onChange={(e) => updateDeliveryLine(i, "unitPrice", parseFloat(e.target.value) || 0)}
                          className="border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-right outline-none focus:border-[var(--brand)] tabular-nums"
                        />
                        <div className="text-xs font-semibold text-[var(--text-primary)] text-right tabular-nums px-1">
                          {lineTotal > 0 ? formatCurrency(lineTotal) : "—"}
                        </div>
                        <button
                          onClick={() => removeDeliveryLine(i)}
                          disabled={deliveryLines.length === 1}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-[var(--text-muted)] hover:text-red-500 transition-colors disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Grand total */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border)]">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">TOTAL GENERAL HT</span>
                  <span className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{formatCurrency(deliveryGrandTotal)}</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                <p className="text-xs text-emerald-700 font-medium">
                  Stock auto-update: saving this delivery note will immediately add the quantities to each product's current stock and create stock movement entries.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-[var(--border)] flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => { setShowDeliveryForm(false); resetDeliveryForm(); }}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSaveDelivery} disabled={savingDelivery}>
                {savingDelivery ? "Saving…" : "Save & Update Stock"}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Suppliers grid */}
      {activeTab === "suppliers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {supplierList.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.contact.toLowerCase().includes(search.toLowerCase())).map((supplier) => (
            <div
              key={supplier.id}
              onClick={() => setSelectedSupplier(supplier)}
              className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow)] hover:border-blue-200 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-lg font-bold text-slate-600 shrink-0">
                  {supplier.name.charAt(0)}
                </div>
                <StarRating rating={supplier.rating} />
              </div>
              <h3 className="font-semibold text-[var(--text-primary)] text-sm">{supplier.name}</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{supplier.contact}</p>

              <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[11px] text-[var(--text-muted)]">{t.achats.totalOrders}</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                    {supplier.totalOrders}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--text-muted)]">{t.achats.pending}</p>
                  <p className={cn("text-sm font-semibold tabular-nums", supplier.pendingOrders > 0 ? "text-amber-600" : "text-[var(--text-primary)]")}>
                    {supplier.pendingOrders}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--text-muted)]">{t.achats.paymentTerms}</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{supplier.paymentTerms}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--text-muted)]">{t.common.name}</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {supplier.address.split(",").pop()?.trim()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supplier detail panel */}
      {selectedSupplier && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40" onClick={() => setSelectedSupplier(null)} />
          <div className="fixed right-0 top-0 h-screen w-[380px] bg-white shadow-[var(--shadow-lg)] z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="font-semibold text-[var(--text-primary)]">{t.achats.supplierFile}</h2>
              <button
                onClick={() => setSelectedSupplier(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-3xl font-bold text-slate-600 mx-auto mb-3">
                  {selectedSupplier.name.charAt(0)}
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">{selectedSupplier.name}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">{selectedSupplier.contact}</p>
                <div className="flex justify-center mt-2">
                  <StarRating rating={selectedSupplier.rating} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <Phone className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-sm">{selectedSupplier.phone}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <Mail className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-sm">{selectedSupplier.email}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-sm">{selectedSupplier.address}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: t.achats.totalOrders, value: selectedSupplier.totalOrders },
                  { label: t.achats.pending, value: selectedSupplier.pendingOrders },
                  { label: t.achats.paymentTerms, value: selectedSupplier.paymentTerms },
                  { label: t.achats.rating, value: `${selectedSupplier.rating}/5` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[11px] text-[var(--text-muted)] mb-1">{label}</p>
                    <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-[var(--border)] flex gap-2">
              <Button variant="secondary" className="flex-1" size="md" icon={<TrendingUp className="w-4 h-4" />} onClick={() => toast(`${t.achats.orderHistory} — ${selectedSupplier.name}`, "info")}>
                {t.achats.orderHistory}
              </Button>
              <Button className="flex-1" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => { setSelectedSupplier(null); openNewOrder(selectedSupplier); }}>
                {t.achats.newOrder}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* New supplier modal */}
      {showNewSupplier && (
        <NewSupplierModal
          onClose={() => setShowNewSupplier(false)}
          onSave={handleNewSupplier}
        />
      )}

      {/* New order modal */}
      {showNewOrder && (
        <NewOrderModal
          onClose={() => { setShowNewOrder(false); setOrderSupplier(undefined); }}
          onSave={async (order) => {
            try {
              const orderData = {
                supplierId: order.supplier.id,
                expectedDate: new Date(order.expectedDate).toISOString(),
                notes: order.notes,
                items: order.lines
                  .filter((l) => l.productId && l.quantity > 0)
                  .map((l) => ({
                    productId: l.productId,
                    quantity: l.quantity,
                    unitCost: l.unitCost,
                  })),
              };

              let result;
              
              // Si "Direct Receive" est coché, utiliser createDirect pour mettre à jour le stock automatiquement
              if (order.directReceive) {
                result = await purchaseOrdersApi.createDirect({
                  ...orderData,
                  invoiceNumber: order.invoiceNumber,
                });
                toast(
                  `${t.achats.orderReceived} ${result.orderNumber} — ${order.supplier.name} — ${formatCurrency(order.total)} — ${t.achats.invoice}: ${order.invoiceNumber}`,
                  "success"
                );
              } else {
                // Sinon, créer juste un bon de commande (sans mettre à jour le stock)
                result = await createOrder(orderData);
                toast(
                  `${t.achats.orderCreated} ${result.orderNumber} — ${order.supplier.name} — ${formatCurrency(order.total)}`,
                  "success"
                );
              }

              reloadOrders();
            } catch (error) {
              toast("Erreur: " + (error instanceof Error ? error.message : "Erreur inconnue"), "warning");
            }
          }}
          defaultSupplier={orderSupplier}
          allowDirectReceive={true}
        />
      )}
    </AppShell>
  );
}
