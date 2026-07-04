"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronRight,
  X,
  RotateCcw,
  CheckCircle2,
  Tag,
  ScanLine,
  Printer,
  Split,
  AlertTriangle,
  TrendingDown,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { products as mockProducts } from "@/lib/mock-data";
import { formatCurrency, cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { useProducts, useCreateTransaction } from "@/lib/hooks/useApi";
import { useAuth } from "@/lib/auth/context";
import { getEffectivePrice, hasActiveMarkdown, daysToExpiry } from "@/lib/api";
import type { Product, CartItem } from "@/lib/types";

const CATEGORIES = ["Tous", "Épicerie", "Boissons", "Produits laitiers", "Hygiène", "Boucherie", "Boulangerie", "Surgelés"];
const TAX_RATE = 0.155;

type PaymentMethod = "cash" | "card" | "mobile" | "split";
type CheckoutStep = "cart" | "payment" | "receipt";

interface SplitPayment {
  cash: number;
  mobile: number;
  card: number;
}

interface ReceiptData {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  method: PaymentMethod;
  cashGiven?: number;
  change?: number;
  split?: SplitPayment;
}

export default function POSPage() {
  const { t } = useI18n();
  const { products: apiProducts, loading } = useProducts();
  const { create: createTransaction, creating } = useCreateTransaction();
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(t.pos.categories.all);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("cart");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashGiven, setCashGiven] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [splitPayment, setSplitPayment] = useState<SplitPayment>({ cash: 0, mobile: 0, card: 0 });
  const [scanSound] = useState(() => {
    if (typeof Audio !== "undefined") {
      const audio = new Audio("data:audio/wav;base64,UklGRnoFAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoFAACAhYqFBAEBAQEBAAA=");
      return audio;
    }
    return null;
  });
  const searchRef = useRef<HTMLInputElement>(null);
  const beepRef = useRef<HTMLAudioElement>(null);

  // Utiliser les vrais produits du backend, fallback sur mock si backend down
  const products = apiProducts.length > 0 ? apiProducts : mockProducts;

  const filtered = products.filter((p) => {
    const matchCat = activeCategory === t.pos.categories.all || p.category === activeCategory;
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search);
    return matchCat && matchSearch;
  });

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) }
            : i
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  }, []);

  // Scan code-barres: quand on tape un code-barres exact + Entrée, ajouter directement
  const handleSearchSubmit = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && search.trim()) {
        // Chercher par code-barres exact
        const found = products.find(
          (p) => p.barcode === search.trim() || p.sku.toLowerCase() === search.trim().toLowerCase()
        );
        if (found && found.stock > 0) {
          addToCart(found);
          // BIP sonore
          if (beepRef.current) {
            beepRef.current.currentTime = 0;
            beepRef.current.play().catch(() => {});
          }
          setSearch("");
        }
      }
    },
    [search, products, addToCart]
  );

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId
            ? { ...i, quantity: Math.max(0, Math.min(i.quantity + delta, i.product.stock)) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountPercent(0);
    setCheckoutStep("cart");
  };

  const subtotal = cart.reduce((s, i) => s + getEffectivePrice(i.product) * i.quantity, 0);
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const taxable = subtotal - discountAmount;
  const tax = Math.round(taxable * TAX_RATE);
  const total = taxable + tax;
  const cashGivenNum = parseFloat(cashGiven.replace(/\s/g, "")) || 0;
  const change = cashGivenNum - total;

  const handleConfirmPayment = async () => {
    // ID caissier depuis l'auth, fallback sur le premier employé
    const defaultCashierId = user?.id || "cmqk34t550003j81mc4vb6bow";

    // Déterminer le montant payé et la monnaie selon le mode
    const splitTotal = splitPayment.cash + splitPayment.mobile + splitPayment.card;
    const isSplit = paymentMethod === "split";
    const effectiveCashGiven = isSplit ? splitPayment.cash : paymentMethod === "cash" ? cashGivenNum : total;
    const effectiveChange = isSplit ? 0 : paymentMethod === "cash" ? change : 0;

    // Pour le paiement mixte, on enregistre comme "cash" si cash dominant, sinon "card"
    const recordedMethod = isSplit ? (splitPayment.cash > 0 ? "cash" : "card") : paymentMethod;

    // Essayer d'enregistrer la vente dans le backend
    const tx = await createTransaction({
      cashierId: defaultCashierId,
      subtotal,
      discount: discountAmount,
      tax,
      total,
      paymentMethod: recordedMethod,
      cashGiven: effectiveCashGiven,
      change: effectiveChange,
      items: cart.map((item) => {
        const effPrice = getEffectivePrice(item.product);
        return {
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: effPrice,
          discount: Math.round(effPrice * item.quantity * (discountPercent / 100)),
          tax: Math.round(effPrice * item.quantity * TAX_RATE),
          total: Math.round(effPrice * item.quantity * (1 + TAX_RATE)),
        };
      }),
    });

    // Utiliser l'ID du backend si disponible, sinon générer
    const id = tx?.transactionNumber || `TXN-${Date.now()}`;
    setReceipt({
      id,
      items: [...cart],
      subtotal,
      discount: discountAmount,
      tax,
      total,
      method: paymentMethod,
      cashGiven: isSplit ? splitTotal : paymentMethod === "cash" ? cashGivenNum : undefined,
      change: isSplit ? 0 : paymentMethod === "cash" ? change : undefined,
      split: isSplit ? splitPayment : undefined,
    });
    setCheckoutStep("receipt");
  };

  const handleNewSale = () => {
    clearCart();
    setReceipt(null);
    setCheckoutStep("cart");
    setCashGiven("");
    setSplitPayment({ cash: 0, mobile: 0, card: 0 });
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  // Impression ticket de caisse (80mm)
  const handlePrintReceipt = useCallback(() => {
    if (!receipt) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR");
    const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const itemsHtml = receipt.items
      .map(
        (item) => {
          const effPrice = getEffectivePrice(item.product);
          const hasMd = hasActiveMarkdown(item.product);
          const label = hasMd
            ? `${item.product.name.substring(0, 22)} ×${item.quantity} (PROMO)`
            : `${item.product.name.substring(0, 24)} ×${item.quantity}`;
          return `<tr><td style="font-size:11px">${label}</td><td style="text-align:right;font-size:11px">${formatCurrency(effPrice * item.quantity)}</td></tr>`;
        }
      )
      .join("");

    const methodLabel =
      receipt.method === "split"
        ? "Paiement mixte"
        : receipt.method === "cash"
        ? "Espèces"
        : receipt.method === "card"
        ? "Carte"
        : "Mobile Money";

    printWindow.document.write(`
      <html>
      <head>
        <title>Ticket ${receipt.id}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { width: 72mm; margin: 4mm auto; font-family: 'Courier New', monospace; color: #000; }
          h1 { font-size: 14px; text-align: center; margin: 0 0 2px; }
          .center { text-align: center; }
          .dashed { border-top: 1px dashed #000; margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 1px 0; vertical-align: top; }
          .total { font-size: 14px; font-weight: bold; }
          .right { text-align: right; }
          .small { font-size: 10px; }
          @media print { body { width: 72mm; } }
        </style>
      </head>
      <body>
        <h1>KABRAK MARKET</h1>
        <p class="center small">${dateStr} — ${timeStr}</p>
        <p class="center small">Ticket: ${receipt.id}</p>
        <p class="center small">Caissier: ${user?.firstName || "Caisse"}</p>
        <div class="dashed"></div>
        <table>${itemsHtml}</table>
        <div class="dashed"></div>
        ${receipt.discount > 0 ? `<table><tr><td class="small">Remise</td><td class="right small">-${formatCurrency(receipt.discount)}</td></tr></table>` : ""}
        <table><tr><td class="small">TVA (15.5%)</td><td class="right small">${formatCurrency(receipt.tax)}</td></tr></table>
        <div class="dashed"></div>
        <table><tr><td class="total">TOTAL</td><td class="right total">${formatCurrency(receipt.total)}</td></tr></table>
        <div class="dashed"></div>
        <table>
          <tr><td class="small">${methodLabel}</td><td class="right small">${formatCurrency(receipt.total)}</td></tr>
          ${receipt.cashGiven != null ? `<tr><td class="small">Reçu</td><td class="right small">${formatCurrency(receipt.cashGiven)}</td></tr>` : ""}
          ${receipt.change != null ? `<tr><td class="small">Monnaie</td><td class="right small">${formatCurrency(receipt.change)}</td></tr>` : ""}
        </table>
        ${receipt.split ? `<table>
          <tr><td class="small">- Espèces</td><td class="right small">${formatCurrency(receipt.split.cash)}</td></tr>
          <tr><td class="small">- Mobile</td><td class="right small">${formatCurrency(receipt.split.mobile)}</td></tr>
          <tr><td class="small">- Carte</td><td class="right small">${formatCurrency(receipt.split.card)}</td></tr>
        </table>` : ""}
        <div class="dashed"></div>
        <p class="center small" style="margin-top:8px">Merci pour votre visite!</p>
        <p class="center small">KABRAK Supermarket Pro</p>
        <p class="center small">Tel: +237 6XX XXX XXX</p>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }, [receipt, user]);

  return (
    <AppShell title={t.pos.title} subtitle={t.pos.subtitle}>
      <div className="flex gap-4 h-[calc(100vh-64px-48px)]">

        {/* LEFT — Product catalog */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Search + categories */}
          <div className="bg-white border border-[var(--border)] rounded-2xl p-3 shadow-[var(--shadow-sm)]">
            <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2 mb-3 focus-within:border-[var(--brand)] transition-colors">
              <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchSubmit}
                placeholder={t.pos.searchProduct + " (ou scannez un code-barres)"}
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                autoFocus
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <X className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                </button>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-lg transition-all",
                    activeCategory === cat
                      ? "bg-[var(--brand)] text-white shadow-sm"
                      : "bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-[var(--text-muted)]">
                <Search className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">{t.common.noResults}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {filtered.map((product) => {
                  const inCart = cart.find((i) => i.product.id === product.id);
                  const outOfStock = product.stock === 0;
                  return (
                    <button
                      key={product.id}
                      onClick={() => !outOfStock && addToCart(product)}
                      disabled={outOfStock}
                      className={cn(
                        "relative text-left bg-white border rounded-xl p-3 transition-all duration-150 group",
                        outOfStock
                          ? "opacity-50 cursor-not-allowed border-[var(--border)]"
                          : inCart
                          ? "border-[var(--brand)] shadow-md shadow-blue-100"
                          : "border-[var(--border)] hover:border-blue-300 hover:shadow-[var(--shadow)] cursor-pointer active:scale-[0.98]"
                      )}
                    >
                      {inCart && (
                        <span className="absolute top-2 right-2 w-5 h-5 bg-[var(--brand)] text-white text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums">
                          {inCart.quantity}
                        </span>
                      )}
                      <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center mb-2 text-lg">
                        {getCategoryEmoji(product.category)}
                      </div>
                      <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 mb-1">
                        {product.name}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mb-2">{product.sku}</p>
                      <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                          {hasActiveMarkdown(product) && (
                            <span className="text-[10px] text-[var(--text-muted)] line-through tabular-nums leading-none">
                              {formatCurrency(product.price)}
                            </span>
                          )}
                          <span className={cn(
                            "text-sm font-bold tabular-nums leading-tight",
                            hasActiveMarkdown(product) ? "text-red-600" : "text-[var(--brand)]"
                          )}>
                            {formatCurrency(getEffectivePrice(product))}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "text-[10px] font-medium tabular-nums",
                            product.stock <= product.minStock / 4
                              ? "text-red-500"
                              : product.stock <= product.minStock
                              ? "text-amber-500"
                              : "text-[var(--text-muted)]"
                          )}
                        >
                          {outOfStock ? t.pos.outOfStock : `${product.stock} ${product.unit}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Cart / Checkout */}
        <div className="w-[340px] shrink-0 flex flex-col bg-white border border-[var(--border)] rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden">

          {checkoutStep === "receipt" && receipt ? (
            <ReceiptPanel receipt={receipt} onNewSale={handleNewSale} onPrint={handlePrintReceipt} />
          ) : checkoutStep === "payment" ? (
            <PaymentPanel
              total={total}
              subtotal={subtotal}
              discount={discountAmount}
              tax={tax}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              cashGiven={cashGiven}
              setCashGiven={setCashGiven}
              change={change}
              splitPayment={splitPayment}
              setSplitPayment={setSplitPayment}
              onBack={() => setCheckoutStep("cart")}
              onConfirm={handleConfirmPayment}
              canConfirm={
                (paymentMethod === "cash" && cashGivenNum >= total) ||
                paymentMethod === "card" ||
                paymentMethod === "mobile" ||
                (paymentMethod === "split" && splitPayment.cash + splitPayment.mobile + splitPayment.card >= total)
              }
              creating={creating}
            />
          ) : (
            <>
              {/* Cart header */}
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    {t.pos.currentOrder}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] tabular-nums">
                    {cart.length} {cart.length !== 1 ? t.pos.articles : t.pos.article}
                  </p>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group"
                  >
                    <Trash2 className="w-4 h-4 text-[var(--text-muted)] group-hover:text-red-500" />
                  </button>
                )}
              </div>

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto px-3 py-2">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] py-12">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
                      <Tag className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-[var(--text-secondary)]">{t.pos.emptyCart}</p>
                    <p className="text-xs mt-1">{t.pos.emptyCartHint}</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {cart.map((item) => {
                      const effPrice = getEffectivePrice(item.product);
                      const hasMarkdown = hasActiveMarkdown(item.product);
                      const expiryDays = daysToExpiry(item.product.expiryDate);
                      const isExpired = expiryDays !== null && expiryDays <= 0;
                      return (
                      <div
                        key={item.product.id}
                        className={cn(
                          "flex items-center gap-2 py-2.5 border-b border-[var(--border-subtle)] last:border-0",
                          isExpired && "bg-amber-50/50"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--text-primary)] truncate leading-snug flex items-center gap-1">
                            {item.product.name}
                            {hasMarkdown && (
                              <span className="inline-flex items-center gap-0.5 px-1 py-0 rounded text-[9px] font-bold bg-red-100 text-red-700 shrink-0">
                                <TrendingDown className="w-2.5 h-2.5" /> PROMO
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
                            {hasMarkdown ? (
                              <>
                                <span className="line-through text-[var(--text-muted)]">{formatCurrency(item.product.price)}</span>{" "}
                                <span className="text-red-600 font-medium">{formatCurrency(effPrice)}</span>
                                {" × "}{item.quantity}
                              </>
                            ) : (
                              <>{formatCurrency(item.product.price)} × {item.quantity}</>
                            )}
                          </p>
                          {isExpired && (
                            <p className="text-[10px] text-amber-600 font-medium flex items-center gap-0.5 mt-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> Produit expiré — vente avec markdown
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => updateQty(item.product.id, -1)}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-3 h-3 text-slate-600" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-[var(--text-primary)] tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(item.product.id, 1)}
                            disabled={item.quantity >= item.product.stock}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-3 h-3 text-slate-600" />
                          </button>
                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors ml-0.5"
                          >
                            <X className="w-3 h-3 text-slate-400 hover:text-red-500" />
                          </button>
                        </div>
                        <div className="w-16 text-right shrink-0">
                          <span className={cn("text-sm font-semibold tabular-nums", hasMarkdown ? "text-red-600" : "text-[var(--text-primary)]")}>
                            {formatCurrency(effPrice * item.quantity)}
                          </span>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Discount row */}
              {cart.length > 0 && (
                <div className="px-4 py-2 border-t border-[var(--border-subtle)] shrink-0">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-muted)] flex-1">{t.pos.globalDiscount}</span>
                    <div className="flex items-center gap-1">
                      {[0, 5, 10, 15].map((p) => (
                        <button
                          key={p}
                          onClick={() => setDiscountPercent(p)}
                          className={cn(
                            "px-2 py-1 text-[11px] font-medium rounded-lg transition-all",
                            discountPercent === p
                              ? "bg-[var(--brand)] text-white"
                              : "bg-slate-100 text-[var(--text-secondary)] hover:bg-slate-200"
                          )}
                        >
                          {p === 0 ? "—" : `${p}%`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Totals */}
              {cart.length > 0 && (
                <div className="px-4 py-3 bg-slate-50 border-t border-[var(--border)] shrink-0 space-y-1.5">
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>{t.pos.subtotal}</span>
                    <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-xs text-emerald-600">
                      <span>{t.pos.discount} ({discountPercent}%)</span>
                      <span className="tabular-nums">-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>{t.pos.tax}</span>
                    <span className="tabular-nums">{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-[var(--text-primary)] pt-1 border-t border-[var(--border)]">
                    <span>{t.pos.totalTTC}</span>
                    <span className="tabular-nums text-[var(--brand)]">{formatCurrency(total)}</span>
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="p-3 shrink-0">
                <Button
                  className="w-full h-11 text-sm"
                  disabled={cart.length === 0}
                  onClick={() => setCheckoutStep("payment")}
                  icon={<ChevronRight className="w-4 h-4" />}
                  iconPosition="right"
                >
                  {t.pos.checkout}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

// ── Payment Panel ──────────────────────────────────────────────────────────────

interface PaymentPanelProps {
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;
  cashGiven: string;
  setCashGiven: (v: string) => void;
  change: number;
  splitPayment: SplitPayment;
  setSplitPayment: (s: SplitPayment) => void;
  onBack: () => void;
  onConfirm: () => void;
  canConfirm: boolean;
  creating: boolean;
}

function PaymentPanel({
  total,
  subtotal,
  discount,
  tax,
  paymentMethod,
  setPaymentMethod,
  cashGiven,
  setCashGiven,
  change,
  splitPayment,
  setSplitPayment,
  onBack,
  onConfirm,
  canConfirm,
  creating,
}: PaymentPanelProps) {
  const { t } = useI18n();
  const cashGivenNum = parseFloat(cashGiven.replace(/\s/g, "")) || 0;
  const quickAmounts = [
    Math.ceil(total / 1000) * 1000,
    Math.ceil(total / 5000) * 5000,
    Math.ceil(total / 10000) * 10000,
  ].filter((v, i, a) => a.indexOf(v) === i);

  const splitTotal = splitPayment.cash + splitPayment.mobile + splitPayment.card;
  const splitRemaining = Math.max(0, total - splitTotal);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2 shrink-0">
        <button onClick={onBack} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
          <X className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t.pos.payment}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Amount due */}
        <div className="bg-[var(--brand)] text-white rounded-xl p-4 text-center">
          <p className="text-xs font-medium opacity-80 mb-1">{t.pos.amountDue}</p>
          <p className="text-3xl font-bold tabular-nums">{formatCurrency(total)}</p>
        </div>

        {/* Payment methods */}
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
            {t.pos.paymentMethod}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {(["cash", "card", "mobile", "split"] as PaymentMethod[]).map((m) => {
              const icons: Record<string, any> = {
                cash: Banknote,
                card: CreditCard,
                mobile: Smartphone,
                split: Split,
              };
              const labels: Record<string, string> = {
                cash: t.pos.cash,
                card: t.pos.card,
                mobile: t.pos.mobile,
                split: "Mixte",
              };
              const Icon = icons[m];
              return (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium",
                    paymentMethod === m
                      ? "border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {labels[m]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cash input */}
        {paymentMethod === "cash" && (
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
              {t.pos.amountGiven}
            </p>
            <input
              type="number"
              value={cashGiven}
              onChange={(e) => setCashGiven(e.target.value)}
              placeholder="0"
              className="w-full border border-[var(--border)] rounded-xl px-4 py-3 text-lg font-bold text-[var(--text-primary)] tabular-nums text-right outline-none focus:border-[var(--brand)] transition-colors bg-white"
            />
            <div className="flex gap-2 mt-2">
              {quickAmounts.map((a) => (
                <button
                  key={a}
                  onClick={() => setCashGiven(String(a))}
                  className="flex-1 py-2 text-xs font-semibold bg-slate-100 hover:bg-[var(--brand-light)] hover:text-[var(--brand)] rounded-lg transition-colors tabular-nums"
                >
                  {formatCurrency(a)}
                </button>
              ))}
            </div>
            {cashGivenNum > 0 && cashGivenNum >= total && (
              <div className="mt-3 bg-[var(--success-light)] rounded-xl p-3 text-center">
                <p className="text-xs text-emerald-600 font-medium mb-0.5">{t.pos.change}</p>
                <p className="text-xl font-bold text-emerald-700 tabular-nums">
                  {formatCurrency(change)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Split payment */}
        {paymentMethod === "split" && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
              Répartition du paiement
            </p>
            {[
              { key: "cash" as const, label: "Espèces", icon: Banknote },
              { key: "mobile" as const, label: "Mobile Money", icon: Smartphone },
              { key: "card" as const, label: "Carte", icon: CreditCard },
            ].map(({ key, label, icon: Icon }) => (
              <div key={key}>
                <label className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 mb-1">
                  <Icon className="w-3.5 h-3.5" /> {label}
                </label>
                <input
                  type="number"
                  value={splitPayment[key] || ""}
                  onChange={(e) =>
                    setSplitPayment({ ...splitPayment, [key]: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0"
                  className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--text-primary)] tabular-nums text-right outline-none focus:border-[var(--brand)] transition-colors bg-white"
                />
              </div>
            ))}
            <div className={cn(
              "rounded-xl p-3 text-center",
              splitRemaining === 0 ? "bg-[var(--success-light)]" : "bg-amber-50"
            )}>
              <p className={cn(
                "text-xs font-medium mb-0.5",
                splitRemaining === 0 ? "text-emerald-600" : "text-amber-600"
              )}>
                {splitRemaining === 0 ? "Montant complet" : "Reste à payer"}
              </p>
              <p className={cn(
                "text-xl font-bold tabular-nums",
                splitRemaining === 0 ? "text-emerald-700" : "text-amber-700"
              )}>
                {formatCurrency(splitRemaining)}
              </p>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>{t.pos.subtotal}</span>
            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>{t.pos.discount}</span>
              <span className="tabular-nums">-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>{t.pos.tax}</span>
            <span className="tabular-nums">{formatCurrency(tax)}</span>
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-[var(--border)] shrink-0">
        <Button
          className="w-full h-11 text-sm"
          disabled={!canConfirm || creating}
          onClick={onConfirm}
          icon={creating ? <RotateCcw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        >
          {creating ? "Traitement..." : t.pos.confirmPayment}
        </Button>
      </div>
    </div>
  );
}

// ── Receipt Panel ──────────────────────────────────────────────────────────────

function ReceiptPanel({
  receipt,
  onNewSale,
  onPrint,
}: {
  receipt: ReceiptData;
  onNewSale: () => void;
  onPrint: () => void;
}) {
  const { t } = useI18n();
  const methodLabels: Record<string, string> = { cash: t.pos.cash, card: t.pos.card, mobile: t.pos.mobile, split: "Mixte" };
  const now = new Date();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {/* Success header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-[var(--success-light)] rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">{t.pos.paymentConfirmed}</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">{receipt.id}</p>
        </div>

        {/* Receipt body */}
        <div className="bg-slate-50 rounded-xl p-4 font-mono text-xs space-y-1.5">
          <div className="text-center mb-3">
            <p className="font-bold text-sm">KABRAK MARKET</p>
            <p className="text-[var(--text-muted)]">
              {now.toLocaleDateString("fr-FR")} — {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="border-t border-dashed border-slate-300 my-2" />
          {receipt.items.map((item) => {
            const effPrice = getEffectivePrice(item.product);
            const hasMd = hasActiveMarkdown(item.product);
            return (
            <div key={item.product.id} className="flex justify-between">
              <span className="truncate flex-1 pr-2">
                {item.product.name.substring(0, 18)} ×{item.quantity}
                {hasMd && <span className="text-red-600 font-bold"> PROMO</span>}
              </span>
              <span className="tabular-nums shrink-0">{formatCurrency(effPrice * item.quantity)}</span>
            </div>
            );
          })}
          <div className="border-t border-dashed border-slate-300 my-2" />
          {receipt.discount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>{t.pos.discount}</span>
              <span className="tabular-nums">-{formatCurrency(receipt.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>{t.pos.tax}</span>
            <span className="tabular-nums">{formatCurrency(receipt.tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm mt-1">
            <span>TOTAL</span>
            <span className="tabular-nums">{formatCurrency(receipt.total)}</span>
          </div>
          <div className="border-t border-dashed border-slate-300 my-2" />
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>{t.pos.paymentMethod}</span>
            <span>{methodLabels[receipt.method]}</span>
          </div>
          {receipt.cashGiven != null && (
            <>
              <div className="flex justify-between">
                <span>{t.pos.amountGiven}</span>
                <span className="tabular-nums">{formatCurrency(receipt.cashGiven)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>{t.pos.change}</span>
                <span className="tabular-nums">{formatCurrency(receipt.change ?? 0)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-[var(--border)] flex gap-2 shrink-0">
        <Button variant="secondary" size="md" className="flex-1" icon={<Printer className="w-3.5 h-3.5" />} onClick={onPrint}>
          {t.common.print}
        </Button>
        <Button className="flex-1" onClick={onNewSale} icon={<Plus className="w-3.5 h-3.5" />}>
          {t.common.newSale}
        </Button>
      </div>
    </div>
  );
}

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    "Épicerie": "🧴",
    "Boissons": "🥤",
    "Produits laitiers": "🧀",
    "Hygiène": "🪥",
    "Boucherie": "🥩",
    "Boulangerie": "🍞",
    "Surgelés": "🧊",
  };
  return map[category] ?? "📦";
}
