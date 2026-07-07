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
  AlertCircle,
  TrendingDown,
  Users,
  History,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";
import { Badge } from "@/components/ui/Badge";
import { products as mockProducts } from "@/lib/mock-data";
import { formatCurrency, cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { useProducts, useCreateTransaction, useCustomers, useRecentTransactions } from "@/lib/hooks/useApi";
import type { ApiCustomer, ApiTransaction } from "@/lib/api";
import { useAuth } from "@/lib/auth/context";
import { getEffectivePrice, hasActiveMarkdown, daysToExpiry } from "@/lib/api";
import type { Product, CartItem } from "@/lib/types";
import { STORE_INFO, getStoreInfo } from "./store-info";
import { useLicense } from "@/lib/license/context";

const TAX_RATE = 0.155;
// Stable backend category keys (match DB seed data) - order matches CATEGORIES labels
const CATEGORY_KEYS = ["Tous", "Grocery", "Beverages", "Dairy", "Hygiene", "Butchery", "Bakery", "Frozen"];

type PaymentMethod = "cash" | "card" | "mobile" | "orange" | "split";
type CheckoutStep = "cart" | "payment" | "receipt";

interface SplitPayment {
  cash: number;
  mobile: number;
  card: number;
  orange: number;
}

interface ReceiptData {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  method: PaymentMethod;
  cashier: string;
  discountReason?: string;
  cashGiven?: number;
  change?: number;
  split?: SplitPayment;
}

export default function POSPage() {
  const { t } = useI18n();
  const { products: apiProducts, loading } = useProducts();
  const { data: apiCustomers } = useCustomers();
  const { transactions: recentTransactions, reload: reloadRecentTransactions } = useRecentTransactions(10);
  const { create: createTransaction, creating } = useCreateTransaction();
  const { user } = useAuth();
  const { config: licenseConfig } = useLicense();
  const storeInfo = getStoreInfo(licenseConfig);
  const CATEGORIES = [
    t.common.catAll,
    t.common.catGrocery,
    t.common.catDrinks,
    t.common.catDairy,
    t.common.catHygiene,
    t.common.catButcher,
    t.common.catBakery,
    t.common.catFrozen,
  ];
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategoryIdx, setActiveCategoryIdx] = useState<number>(0);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("cart");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashGiven, setCashGiven] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<{ code: string; status: "success" | "not_found" | "out_of_stock" } | null>(null);
  const [cashierDiscountAmount, setCashierDiscountAmount] = useState(0);
  const [cashierDiscountReason, setCashierDiscountReason] = useState("");
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [splitPayment, setSplitPayment] = useState<SplitPayment>({ cash: 0, mobile: 0, card: 0, orange: 0 });
  const [selectedCustomer, setSelectedCustomer] = useState<ApiCustomer | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [autoPrint, setAutoPrint] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("kabrak_pos_auto_print") === "true";
  });
  const [scanSound] = useState(() => {
    if (typeof Audio !== "undefined") {
      const audio = new Audio("data:audio/wav;base64,UklGRnoFAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoFAACAhYqFBAEBAQEBAAA=");
      return audio;
    }
    return null;
  });
  const [successSound] = useState(() => {
    if (typeof Audio !== "undefined") {
      const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=");
      return audio;
    }
    return null;
  });
  const searchRef = useRef<HTMLInputElement>(null);
  const beepRef = useRef<HTMLAudioElement>(null);

  // Utiliser les vrais produits du backend, fallback sur mock si backend down
  const products = apiProducts.length > 0 ? apiProducts : mockProducts;

  const filtered = products.filter((p) => {
    const activeCategory = CATEGORY_KEYS[activeCategoryIdx];
    const matchCat = activeCategoryIdx === 0 || p.category === activeCategory;
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search);
    return matchCat && matchSearch;
  });

  const addToCart = useCallback((product: Product) => {
    if (product.stock <= 0) return; // Bloquer si stock épuisé
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        // Ne pas dépasser le stock disponible
        if (existing.quantity >= product.stock) return prev;
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

  // Scan via caméra (ZXing)
  const handleBarcodeScan = useCallback(
    (code: string) => {
      const found = products.find(
        (p) => p.barcode === code.trim() || p.sku.toLowerCase() === code.trim().toLowerCase()
      );
      if (found && found.stock > 0) {
        addToCart(found);
        if (beepRef.current) {
          beepRef.current.currentTime = 0;
          beepRef.current.play().catch(() => {});
        }
        setScanResult({ code, status: "success" });
        // Garder le scanner ouvert pour scanner plusieurs articles (mode caisse)
      } else if (found && found.stock <= 0) {
        setScanResult({ code, status: "out_of_stock" });
        if (beepRef.current) {
          beepRef.current.currentTime = 0;
          beepRef.current.play().catch(() => {});
        }
      } else {
        setScanResult({ code, status: "not_found" });
      }
    },
    [products, addToCart]
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
    setCashierDiscountAmount(0);
    setCashierDiscountReason("");
    setCheckoutStep("cart");
  };

  const subtotal = cart.reduce((s, i) => s + getEffectivePrice(i.product) * i.quantity, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const totalBeforeDiscount = subtotal + tax;
  const discount = Math.min(cashierDiscountAmount, totalBeforeDiscount);
  const total = totalBeforeDiscount - discount;
  const cashGivenNum = parseFloat(cashGiven.replace(/\s/g, "")) || 0;
  const change = cashGivenNum - total;

  // Vérifier si un article du panier a un stock insuffisant
  const stockIssues = cart.filter((i) => i.quantity > i.product.stock);
  const hasStockIssues = stockIssues.length > 0;

  // Raccourcis clavier pour le POS — utilise des refs pour éviter les re-renders
  const stateRef = useRef({ checkoutStep, cart, paymentMethod, cashGivenNum, total, splitPayment });
  stateRef.current = { checkoutStep, cart, paymentMethod, cashGivenNum, total, splitPayment };
  const confirmRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignorer les raccourcis si l'utilisateur tape dans un input (sauf le champ scan)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      const isSearchInput = isInput && target === searchRef.current;
      const s = stateRef.current;

      if (s.checkoutStep === "cart" && !isSearchInput && e.key === "Enter") {
        if (s.cart.length > 0) {
          e.preventDefault();
          setCheckoutStep("payment");
        }
        return;
      }

      if (s.checkoutStep === "payment") {
        if (["F1", "F2", "F3", "F4"].includes(e.key)) {
          e.preventDefault();
          const map: Record<string, PaymentMethod> = {
            F1: "cash",
            F2: "card",
            F3: "mobile",
            F4: "orange",
            F5: "split",
          };
          setPaymentMethod(map[e.key]);
          return;
        }

        if (e.key === "Escape") {
          e.preventDefault();
          setCheckoutStep("cart");
          return;
        }

        if (e.key === "Enter" && !isInput) {
          e.preventDefault();
          const splitTotal = s.splitPayment.cash + s.splitPayment.mobile + s.splitPayment.card + s.splitPayment.orange;
          const canConfirmNow =
            s.paymentMethod === "cash" ? s.cashGivenNum >= s.total :
            s.paymentMethod === "card" ? true :
            s.paymentMethod === "mobile" ? true :
            s.paymentMethod === "split" ? splitTotal >= s.total :
            false;
          if (canConfirmNow) {
            confirmRef.current();
          }
          return;
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPaymentMethod, setCheckoutStep]);

  // Mise à jour de l'écran client via localStorage (debounce 300ms)
  useEffect(() => {
    const state = {
      type: checkoutStep === "receipt" ? "thanks" : checkoutStep,
      items: cart.map((item) => {
        const effPrice = getEffectivePrice(item.product);
        return {
          name: item.product.name,
          quantity: item.quantity,
          price: effPrice,
          total: effPrice * item.quantity,
        };
      }),
      subtotal,
      discount,
      total,
      itemCount: cart.reduce((s, i) => s + i.quantity, 0),
      lastUpdate: Date.now(),
      customer: selectedCustomer
        ? {
            name: `${selectedCustomer.firstName} ${selectedCustomer.lastName}`,
            points: selectedCustomer.points,
          }
        : undefined,
    };
    // Debounce: attendre 300ms avant d'écrire pour éviter les écritures excessives
    const timer = setTimeout(() => {
      localStorage.setItem("kabrak_pos_display", JSON.stringify(state));
      window.dispatchEvent(new StorageEvent("storage", { key: "kabrak_pos_display" }));
    }, 300);
    return () => clearTimeout(timer);
  }, [cart, checkoutStep, subtotal, discount, total, selectedCustomer]);

  const handleConfirmPayment = async () => {
    // ID caissier depuis l'auth, fallback sur le premier employé
    const defaultCashierId = user?.id || "cmqk34t550003j81mc4vb6bow";

    // Déterminer le montant payé et la monnaie selon le mode
    const splitTotal = splitPayment.cash + splitPayment.mobile + splitPayment.card + splitPayment.orange;
    const isSplit = paymentMethod === "split";
    const effectiveCashGiven = isSplit ? splitPayment.cash : paymentMethod === "cash" ? cashGivenNum : total;
    const effectiveChange = isSplit ? 0 : paymentMethod === "cash" ? change : 0;

    // Pour le paiement mixte, on enregistre comme "cash" si cash dominant, sinon "card"
    const recordedMethod = isSplit ? (splitPayment.cash > 0 ? "cash" : "card") : paymentMethod;

    // Essayer d'enregistrer la vente dans le backend
    // Répartition proportionnelle de la remise sur les articles
    const totalForAllocation = subtotal;
    const allocatedDiscount = cart.map((item) => {
      const effPrice = getEffectivePrice(item.product);
      const lineTotal = effPrice * item.quantity;
      const ratio = totalForAllocation > 0 ? lineTotal / totalForAllocation : 0;
      return Math.round(discount * ratio);
    });
    // Ajuste pour éviter les erreurs d'arrondi
    const allocatedSum = allocatedDiscount.reduce((s, d) => s + d, 0);
    if (allocatedSum !== discount && cart.length > 0) {
      allocatedDiscount[0] += discount - allocatedSum;
    }

    const tx = await createTransaction({
      cashierId: defaultCashierId,
      subtotal,
      discount,
      tax,
      total,
      paymentMethod: recordedMethod,
      cashGiven: effectiveCashGiven,
      change: effectiveChange,
      customerId: selectedCustomer?.id,
      items: cart.map((item, idx) => {
        const effPrice = getEffectivePrice(item.product);
        return {
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: effPrice,
          discount: allocatedDiscount[idx],
          tax: 0,
          total: effPrice * item.quantity - allocatedDiscount[idx],
        };
      }),
    });

    // Utiliser l'ID du backend si disponible, sinon générer
    const id = tx?.transactionNumber || `TXN-${Date.now()}`;
    setReceipt({
      id,
      items: [...cart],
      subtotal,
      discount,
      tax,
      total,
      method: paymentMethod,
      cashier: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
      discountReason: cashierDiscountReason,
      cashGiven: isSplit ? splitTotal : paymentMethod === "cash" ? cashGivenNum : undefined,
      change: isSplit ? 0 : paymentMethod === "cash" ? change : undefined,
      split: isSplit ? splitPayment : undefined,
    });
    setCheckoutStep("receipt");

    // Son de confirmation de paiement
    if (successSound) {
      successSound.currentTime = 0;
      successSound.play().catch(() => {});
    }

    // Impression automatique si activée
    if (autoPrint) {
      setTimeout(() => {
        handlePrintReceipt();
      }, 400);
    }
  };

  // Mettre à jour la ref après la définition de handleConfirmPayment
  confirmRef.current = handleConfirmPayment;

  const handleNewSale = () => {
    clearCart();
    setReceipt(null);
    setCheckoutStep("cart");
    setCashGiven("");
    setSplitPayment({ cash: 0, mobile: 0, card: 0, orange: 0 });
    setCashierDiscountAmount(0);
    setCashierDiscountReason("");
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

    const methodLabel =
      receipt.method === "split"
        ? t.pos.split
        : receipt.method === "cash"
        ? t.pos.cash
        : receipt.method === "card"
        ? t.pos.card
        : receipt.method === "orange"
        ? t.pos.orange
        : t.pos.mobile;

    const printItemsHtml = receipt.items
      .map((item) => {
        const effPrice = getEffectivePrice(item.product);
        return `<tr>
          <td style="font-size:11px;vertical-align:top">${item.product.name}</td>
          <td style="text-align:center;font-size:11px;vertical-align:top">${item.quantity}</td>
          <td style="text-align:right;font-size:11px;vertical-align:top">${formatCurrency(effPrice)}</td>
          <td style="text-align:right;font-size:11px;vertical-align:top">${formatCurrency(effPrice * item.quantity)}</td>
        </tr>`;
      })
      .join("");

    printWindow.document.write(`
      <html>
      <head>
        <title>${t.pos.receipt} ${receipt.id}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; }
          html, body { width: 76mm; max-width: 76mm; min-width: 76mm; margin: 0 auto; padding: 0; overflow: hidden; }
          body { padding: 2mm 2mm 4mm; font-family: 'Courier New', monospace; color: #000; font-size: 10px; line-height: 1.3; font-weight: bold; }
          h1 { font-size: 13px; text-align: center; margin: 0 0 2px; }
          .center { text-align: center; }
          .dashed { border-top: 1px dashed #000; margin: 3px 0; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          td { padding: 1px 0; vertical-align: top; overflow: hidden; }
          .total { font-size: 12px; font-weight: bold; white-space: nowrap; }
          .right { text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .small { font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          @media print {
            html, body { width: 76mm; max-width: 76mm; min-width: 76mm; padding: 2mm 2mm 4mm; overflow: hidden; }
            * { page-break-inside: avoid; break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>${storeInfo.name}</h1>
        <p class="center small">${storeInfo.address}</p>
        <p class="center small">${storeInfo.phone}</p>
        <p class="center small">${dateStr} — ${timeStr}</p>
        <p class="center small">${t.pos.receipt}: ${receipt.id}</p>
        <p class="center small">${t.pos.cashier}: ${receipt.cashier}</p>
        <div class="dashed"></div>
        <table>
          <tr><td class="small" style="font-weight:bold">${t.pos.receiptItem}</td><td class="small" style="text-align:center;font-weight:bold">${t.pos.receiptQty}</td><td class="small" style="text-align:right;font-weight:bold">${t.pos.receiptUnit}</td><td class="small" style="text-align:right;font-weight:bold">${t.pos.receiptTotal}</td></tr>
          ${printItemsHtml}
        </table>
        <div class="dashed"></div>
        <table>
          <tr><td class="small">${t.pos.subtotal}</td><td class="right small">${formatCurrency(receipt.subtotal)}</td></tr>
          ${receipt.discount > 0 ? `<tr><td class="small">${t.pos.discount} ${receipt.discountReason ? `(${receipt.discountReason})` : ""}</td><td class="right small">-${formatCurrency(receipt.discount)}</td></tr>` : ""}
        </table>
        <div class="dashed"></div>
        <table><tr><td class="total">${t.pos.total.toUpperCase()}</td><td class="right total">${formatCurrency(receipt.total)}</td></tr></table>
        <div class="dashed"></div>
        <table>
          <tr><td class="small">${methodLabel}</td><td class="right small">${formatCurrency(receipt.total)}</td></tr>
          ${receipt.cashGiven != null ? `<tr><td class="small">${t.pos.amountGiven}</td><td class="right small">${formatCurrency(receipt.cashGiven)}</td></tr>` : ""}
          ${receipt.change != null ? `<tr><td class="small">${t.pos.change}</td><td class="right small">${formatCurrency(receipt.change)}</td></tr>` : ""}
        </table>
        ${receipt.split ? `<table>
          <tr><td class="small">- ${t.pos.cash}</td><td class="right small">${formatCurrency(receipt.split.cash)}</td></tr>
          <tr><td class="small">- ${t.pos.mobile}</td><td class="right small">${formatCurrency(receipt.split.mobile)}</td></tr>
          ${receipt.split.orange ? `<tr><td class="small">- ${t.pos.orange}</td><td class="right small">${formatCurrency(receipt.split.orange)}</td></tr>` : ""}
          <tr><td class="small">- ${t.pos.card}</td><td class="right small">${formatCurrency(receipt.split.card)}</td></tr>
        </table>` : ""}
        <div class="dashed"></div>
        <p class="center small" style="margin-top:8px">${storeInfo.receiptFooter || t.pos.thankYou}</p>
        <p class="center small">${storeInfo.name}</p>
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

  // Réimprimer un ticket à partir d'une transaction de l'historique
  const handleReprintTransaction = useCallback((tx: ApiTransaction) => {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    const date = new Date(tx.date);
    const dateStr = date.toLocaleDateString("fr-FR");
    const timeStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const methodLabel =
      tx.paymentMethod === "cash"
        ? t.pos.cash
        : tx.paymentMethod === "card"
        ? t.pos.card
        : tx.paymentMethod === "mobile"
        ? t.pos.mobile
        : tx.paymentMethod === "orange"
        ? t.pos.orange
        : t.pos.split;

    const printItemsHtml = (tx.items || [])
      .map((item) => {
        const unitPrice = item.unitPrice;
        return `<tr>
          <td style="font-size:11px;vertical-align:top">${item.product?.name || "Produit"}</td>
          <td style="text-align:center;font-size:11px;vertical-align:top">${item.quantity}</td>
          <td style="text-align:right;font-size:11px;vertical-align:top">${formatCurrency(unitPrice)}</td>
          <td style="text-align:right;font-size:11px;vertical-align:top">${formatCurrency(unitPrice * item.quantity)}</td>
        </tr>`;
      })
      .join("");

    printWindow.document.write(`
      <html>
      <head>
        <title>${t.pos.receipt} ${tx.transactionNumber}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; }
          html, body { width: 76mm; max-width: 76mm; min-width: 76mm; margin: 0 auto; padding: 0; overflow: hidden; }
          body { padding: 2mm 2mm 4mm; font-family: 'Courier New', monospace; color: #000; font-size: 10px; line-height: 1.3; font-weight: bold; }
          h1 { font-size: 13px; text-align: center; margin: 0 0 2px; }
          .center { text-align: center; }
          .dashed { border-top: 1px dashed #000; margin: 3px 0; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          td { padding: 1px 0; vertical-align: top; overflow: hidden; }
          .total { font-size: 12px; font-weight: bold; white-space: nowrap; }
          .right { text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .small { font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          @media print {
            html, body { width: 76mm; max-width: 76mm; min-width: 76mm; padding: 2mm 2mm 4mm; overflow: hidden; }
            * { page-break-inside: avoid; break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>${storeInfo.name}</h1>
        <p class="center small">${storeInfo.address}</p>
        <p class="center small">${storeInfo.phone}</p>
        <p class="center small">${dateStr} — ${timeStr}</p>
        <p class="center small">${t.pos.receipt}: ${tx.transactionNumber}</p>
        <div class="dashed"></div>
        <table>
          <tr><td class="small" style="font-weight:bold">${t.pos.receiptItem}</td><td class="small" style="text-align:center;font-weight:bold">${t.pos.receiptQty}</td><td class="small" style="text-align:right;font-weight:bold">${t.pos.receiptUnit}</td><td class="small" style="text-align:right;font-weight:bold">${t.pos.receiptTotal}</td></tr>
          ${printItemsHtml}
        </table>
        <div class="dashed"></div>
        <table>
          <tr><td class="small">${t.pos.subtotal}</td><td class="right small">${formatCurrency(tx.subtotal)}</td></tr>
          ${tx.discount > 0 ? `<tr><td class="small">${t.pos.discount}</td><td class="right small">-${formatCurrency(tx.discount)}</td></tr>` : ""}
        </table>
        <div class="dashed"></div>
        <table><tr><td class="total">${t.pos.total.toUpperCase()}</td><td class="right total">${formatCurrency(tx.total)}</td></tr></table>
        <div class="dashed"></div>
        <table>
          <tr><td class="small">${methodLabel}</td><td class="right small">${formatCurrency(tx.total)}</td></tr>
          ${tx.cashGiven != null ? `<tr><td class="small">${t.pos.amountGiven}</td><td class="right small">${formatCurrency(tx.cashGiven)}</td></tr>` : ""}
          ${tx.change != null ? `<tr><td class="small">${t.pos.change}</td><td class="right small">${formatCurrency(tx.change)}</td></tr>` : ""}
        </table>
        <div class="dashed"></div>
        <p class="center small" style="margin-top:8px">${storeInfo.receiptFooter || t.pos.thankYou}</p>
        <p class="center small">${storeInfo.name}</p>
        <p class="center small">(RÉIMPRESSION)</p>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }, [t]);

  return (
    <AppShell title={t.pos.title} subtitle={t.pos.subtitle}>
      <div className="flex gap-4 h-[calc(100vh-64px-48px)]">

        {/* LEFT — Product catalog */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Search + categories */}
          <div className="bg-white border border-[var(--border)] rounded-2xl p-3 shadow-[var(--shadow-sm)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2 focus-within:border-[var(--brand)] transition-colors">
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
              <button
                onClick={() => setShowScanner(true)}
                className="h-10 px-3 flex items-center gap-1.5 text-xs font-medium text-white bg-emerald-600 border border-emerald-700 rounded-xl hover:bg-emerald-700 transition-colors"
                title="Scanner avec la caméra"
              >
                <ScanLine className="w-4 h-4" />
                <span className="hidden sm:inline">Scanner</span>
              </button>
              <button
                onClick={() => {
                  reloadRecentTransactions();
                  setShowHistoryModal(true);
                }}
                className="h-10 px-3 flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] bg-white border border-[var(--border)] rounded-xl hover:bg-[var(--surface-hover)] transition-colors"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">{t.pos.salesHistory}</span>
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveCategoryIdx(idx)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-lg transition-all",
                    activeCategoryIdx === idx
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
            <ReceiptPanel
              receipt={receipt}
              onNewSale={handleNewSale}
              onPrint={handlePrintReceipt}
              autoPrint={autoPrint}
              onAutoPrintChange={(v) => {
                setAutoPrint(v);
                localStorage.setItem("kabrak_pos_auto_print", String(v));
              }}
            />
          ) : checkoutStep === "payment" ? (
            <PaymentPanel
              total={total}
              subtotal={subtotal}
              discount={discount}
              tax={tax}
              discountReason={cashierDiscountReason}
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
                paymentMethod === "orange" ||
                (paymentMethod === "split" && splitPayment.cash + splitPayment.mobile + splitPayment.card + splitPayment.orange >= total)
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
                  <button
                    onClick={() => setShowDiscountModal(true)}
                    className="flex items-center gap-2 w-full"
                  >
                    <Tag className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-muted)] flex-1 text-left">{t.pos.cashierDiscount}</span>
                    {cashierDiscountAmount > 0 ? (
                      <span className="text-xs font-semibold text-emerald-600 tabular-nums">-{formatCurrency(cashierDiscountAmount)}</span>
                    ) : (
                      <span className="text-[11px] text-[var(--brand)] font-medium">{t.pos.addDiscount}</span>
                    )}
                  </button>
                </div>
              )}

              {/* Customer selection */}
              {cart.length > 0 && (
                <div className="px-4 py-2 border-t border-[var(--border-subtle)] shrink-0">
                  <button
                    onClick={() => setShowCustomerSearch(true)}
                    className="flex items-center gap-2 w-full"
                  >
                    <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-muted)] flex-1 text-left">
                      {selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : t.pos.addCustomer}
                    </span>
                    {selectedCustomer ? (
                      <span className="text-[11px] text-emerald-600 font-medium">{t.pos.loyaltyPoints}: {selectedCustomer.points}</span>
                    ) : (
                      <span className="text-[11px] text-[var(--brand)] font-medium">{t.pos.selectCustomer}</span>
                    )}
                  </button>
                </div>
              )}

              {/* Totals */}
              {cart.length > 0 && (
                <div className="px-4 py-3 bg-slate-50 border-t border-[var(--border)] shrink-0 space-y-1.5">
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>{t.pos.subtotal}</span>
                    <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-xs text-emerald-600">
                      <span>{t.pos.discount} {cashierDiscountReason ? `(${cashierDiscountReason})` : ""}</span>
                      <span className="tabular-nums">-{formatCurrency(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-[var(--text-primary)] pt-1 border-t border-[var(--border)]">
                    <span>{t.pos.total}</span>
                    <span className="tabular-nums text-[var(--brand)]">{formatCurrency(total)}</span>
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="p-3 shrink-0 space-y-2">
                {hasStockIssues && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      Stock insuffisant: {stockIssues.map(i => `${i.product.name} (dispo: ${i.product.stock})`).join(", ")}
                    </span>
                  </div>
                )}
                <Button
                  className="w-full h-11 text-sm"
                  disabled={cart.length === 0 || hasStockIssues}
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
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => {
            setShowScanner(false);
            setScanResult(null);
          }}
          result={scanResult}
        />
      )}
      {showDiscountModal && (
        <DiscountModal
          current={cashierDiscountAmount}
          reason={cashierDiscountReason}
          subtotal={subtotal}
          onClose={() => setShowDiscountModal(false)}
          onApply={(amount, reason) => {
            setCashierDiscountAmount(amount);
            setCashierDiscountReason(reason);
            setShowDiscountModal(false);
          }}
        />
      )}
      {showCustomerSearch && (
        <CustomerSearchModal
          customers={apiCustomers || []}
          selected={selectedCustomer}
          onClose={() => setShowCustomerSearch(false)}
          onSelect={(c) => {
            setSelectedCustomer(c);
            setShowCustomerSearch(false);
          }}
          onClear={() => {
            setSelectedCustomer(null);
            setShowCustomerSearch(false);
          }}
        />
      )}
      {showHistoryModal && (
        <HistoryModal
          transactions={recentTransactions}
          onClose={() => setShowHistoryModal(false)}
          onReprint={(tx) => {
            handleReprintTransaction(tx);
            setShowHistoryModal(false);
          }}
        />
      )}
    </AppShell>
  );
}

// ── Discount Modal ─────────────────────────────────────────────────────────────

function DiscountModal({
  current,
  reason,
  subtotal,
  onClose,
  onApply,
}: {
  current: number;
  reason: string;
  subtotal: number;
  onClose: () => void;
  onApply: (amount: number, reason: string) => void;
}) {
  const { t } = useI18n();
  const [amount, setAmount] = useState(current);
  const [reasonText, setReasonText] = useState(reason);
  const max = subtotal;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-sm p-5">
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">{t.pos.discountTitle}</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 block">
              {t.pos.discountAmount}
            </label>
            <input
              type="number"
              value={amount || ""}
              onChange={(e) => setAmount(Math.max(0, Math.min(max, parseInt(e.target.value) || 0)))}
              className="w-full border border-[var(--border)] rounded-xl px-4 py-3 text-lg font-bold text-[var(--text-primary)] tabular-nums text-right outline-none focus:border-[var(--brand)] transition-colors bg-white"
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">{t.pos.maxDiscount}: {formatCurrency(max)}</p>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 block">
              {t.pos.discountReason}
            </label>
            <input
              type="text"
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder={t.pos.discountReasonPh}
              className="w-full border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand)] transition-colors bg-white"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>{t.common.cancel}</Button>
            <Button className="flex-1" onClick={() => onApply(amount, reasonText)}>{t.pos.applyDiscount}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Customer Search Modal ──────────────────────────────────────────────────────────────

function HistoryModal({
  transactions,
  onClose,
  onReprint,
}: {
  transactions: ApiTransaction[];
  onClose: () => void;
  onReprint: (tx: ApiTransaction) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-md p-5 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{t.pos.salesHistory}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto -mx-2 px-2">
          {transactions.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-8">{t.pos.noHistory}</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{tx.transactionNumber}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(tx.date).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })} · {tx.paymentMethod}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{formatCurrency(tx.total)}</p>
                    <button
                      onClick={() => onReprint(tx)}
                      className="p-2 text-[var(--brand)] hover:bg-[var(--brand-light)] rounded-lg transition-colors"
                      title={t.pos.reprint}
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3 pt-4 mt-2 border-t border-[var(--border)]">
          <Button variant="secondary" className="w-full" onClick={onClose}>{t.common.close}</Button>
        </div>
      </div>
    </div>
  );
}

// ── Customer Search Modal ──────────────────────────────────────────────────────────────

function CustomerSearchModal({
  customers,
  selected,
  onClose,
  onSelect,
  onClear,
}: {
  customers: ApiCustomer[];
  selected: ApiCustomer | null;
  onClose: () => void;
  onSelect: (c: ApiCustomer) => void;
  onClear: () => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const filtered = customers.filter(
    (c) =>
      c.firstName.toLowerCase().includes(query.toLowerCase()) ||
      c.lastName.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query) ||
      c.customerNumber.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-md p-5 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{t.pos.selectCustomer}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.pos.searchCustomer}
            className="w-full border border-[var(--border)] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand)] transition-colors bg-white"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto -mx-2 px-2">
          {selected && (
            <div className="mb-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-sm font-semibold text-emerald-800">
                {selected.firstName} {selected.lastName}
              </p>
              <p className="text-xs text-emerald-600">{selected.phone} · {selected.points} points</p>
            </div>
          )}
          {filtered.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-8">{t.pos.noCustomerFound}</p>
          ) : (
            <div className="space-y-1">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors",
                    selected?.id === c.id
                      ? "bg-[var(--brand-light)] border border-[var(--brand)]"
                      : "hover:bg-slate-50 border border-transparent"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{c.phone} · {c.customerNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--text-muted)]">{t.pos.loyaltyPoints}</p>
                    <p className="text-sm font-bold text-[var(--brand)] tabular-nums">{c.points}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3 pt-4 mt-2 border-t border-[var(--border)]">
          <Button variant="secondary" className="flex-1" onClick={onClear}>{t.pos.clearCustomer}</Button>
          <Button className="flex-1" onClick={onClose}>{t.common.confirm}</Button>
        </div>
      </div>
    </div>
  );
}

// ── Payment Panel ──────────────────────────────────────────────────────────────

interface PaymentPanelProps {
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  discountReason?: string;
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
  discountReason,
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

  const splitTotal = splitPayment.cash + splitPayment.mobile + splitPayment.card + splitPayment.orange;
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
            {(["cash", "card", "mobile", "orange", "split"] as PaymentMethod[]).map((m) => {
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
                  <span className="text-[10px] opacity-60 mt-0.5">
                    {m === "cash" ? "F1" : m === "card" ? "F2" : m === "mobile" ? "F3" : "F4"}
                  </span>
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
              { key: "orange" as const, label: "Orange Money", icon: Smartphone },
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
                {splitRemaining === 0 ? t.pos.paymentConfirmed : t.factures.remainingBalance}
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
              <span>{t.pos.discount} {discountReason ? `(${discountReason})` : ""}</span>
              <span className="tabular-nums">-{formatCurrency(discount)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-[var(--border)] shrink-0 space-y-2">
        <Button
          className="w-full h-11 text-sm"
          disabled={!canConfirm || creating}
          onClick={onConfirm}
          icon={creating ? <RotateCcw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        >
          {creating ? t.common.processing : t.pos.confirmPayment}
        </Button>
        <div className="flex justify-between text-[10px] text-[var(--text-muted)] px-1">
          <span>F1=Cash · F2=Carte · F3=Mobile · F4=Mixte</span>
          <span>Enter=Valider · Esc=Retour</span>
        </div>
      </div>
    </div>
  );
}

// ── Receipt Panel ──────────────────────────────────────────────────────────────

function ReceiptPanel({
  receipt,
  onNewSale,
  onPrint,
  autoPrint,
  onAutoPrintChange,
}: {
  receipt: ReceiptData;
  onNewSale: () => void;
  onPrint: () => void;
  autoPrint: boolean;
  onAutoPrintChange: (v: boolean) => void;
}) {
  const { t } = useI18n();
  const { config: licenseConfig } = useLicense();
  const storeInfo = getStoreInfo(licenseConfig);
  const methodLabels: Record<string, string> = { cash: t.pos.cash, card: t.pos.card, mobile: t.pos.mobile, orange: t.pos.orange, split: t.pos.split };
  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR");
  const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

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
            <p className="font-bold text-sm">{storeInfo.name}</p>
            <p className="text-[var(--text-muted)]">{storeInfo.address}</p>
            <p className="text-[var(--text-muted)]">{storeInfo.phone}</p>
            <p className="text-[var(--text-muted)] mt-1">
              {dateStr} {timeStr}
            </p>
            <p className="text-[var(--text-muted)]">{t.pos.cashier}: {receipt.cashier}</p>
          </div>
          <div className="border-t border-dashed border-slate-300 my-2" />

          {/* Table header */}
          <div className="flex justify-between text-[var(--text-muted)] text-[10px] uppercase tracking-wider">
            <span className="flex-1">{t.pos.receiptItem}</span>
            <span className="w-10 text-center">{t.pos.receiptQty}</span>
            <span className="w-16 text-right">{t.pos.receiptUnit}</span>
            <span className="w-16 text-right">{t.pos.receiptTotal}</span>
          </div>
          <div className="border-t border-dashed border-slate-300 my-1" />

          {receipt.items.map((item) => {
            const effPrice = getEffectivePrice(item.product);
            const hasMd = hasActiveMarkdown(item.product);
            return (
            <div key={item.product.id} className="flex justify-between items-start">
              <span className="flex-1 pr-2 leading-tight">
                {item.product.name}
                {hasMd && <span className="text-red-600 font-bold"> PROMO</span>}
              </span>
              <span className="w-10 text-center tabular-nums">{item.quantity}</span>
              <span className="w-16 text-right tabular-nums">{formatCurrency(effPrice)}</span>
              <span className="w-16 text-right tabular-nums">{formatCurrency(effPrice * item.quantity)}</span>
            </div>
            );
          })}
          <div className="border-t border-dashed border-slate-300 my-2" />
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>{t.pos.subtotal}</span>
            <span className="tabular-nums">{formatCurrency(receipt.subtotal)}</span>
          </div>
          {receipt.discount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>{t.pos.discount} {receipt.discountReason ? `(${receipt.discountReason})` : ""}</span>
              <span className="tabular-nums">-{formatCurrency(receipt.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm mt-1 pt-1 border-t border-[var(--border)]">
            <span>{t.pos.total}</span>
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
          <div className="border-t border-dashed border-slate-300 my-2" />
          <p className="text-center text-[var(--text-muted)] mt-1">{t.pos.thankYou}</p>
        </div>
      </div>

      <div className="p-3 border-t border-[var(--border)] shrink-0 space-y-3">
        <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
          <input
            type="checkbox"
            checked={autoPrint}
            onChange={(e) => onAutoPrintChange(e.target.checked)}
            className="w-4 h-4 accent-[var(--brand)]"
          />
          {t.pos.enableAutoPrint}
        </label>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" className="flex-1" icon={<Printer className="w-3.5 h-3.5" />} onClick={onPrint}>
            {t.common.print}
          </Button>
          <Button className="flex-1" onClick={onNewSale} icon={<Plus className="w-3.5 h-3.5" />}>
            {t.common.newSale}
          </Button>
        </div>
      </div>
    </div>
  );
}

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    "Grocery": "🧴",
    "Beverages": "🥤",
    "Dairy": "🧀",
    "Hygiene": "🪥",
    "Butchery": "🥩",
    "Bakery": "🍞",
    "Frozen": "🧊",
    // Legacy French keys (for existing DB data)
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
