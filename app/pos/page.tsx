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

  ChevronLeft,

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

  ShoppingCart,

  PauseCircle,

  ListRestart,

  Monitor,

} from "lucide-react";



import { Button } from "@/components/ui/Button";

import { BarcodeScanner } from "@/components/pos/BarcodeScanner";

import { NewProductModal } from "@/components/forms/NewProductModal";

import { Badge } from "@/components/ui/Badge";

import { useToast } from "@/components/ui/Toast";

import { useRouter } from "next/navigation";

import { formatCurrency, cn } from "@/lib/utils";

import { useI18n } from "@/lib/i18n/context";

import { useProducts, useCreateTransaction, useCustomers, useCreateCustomer, useRecentTransactions, useActiveShifts, useServerProductSearch } from "@/lib/hooks/useApi";

import { useBarcodeScanner } from "@/lib/hooks/useBarcodeScanner";

import type { ApiCustomer, ApiTransaction } from "@/lib/api";

import { productsApi, apiProductToFrontend } from "@/lib/api";

import { useAuth } from "@/lib/auth/context";

import { getEffectivePrice, hasActiveMarkdown, daysToExpiry } from "@/lib/api";

import type { Product, CartItem } from "@/lib/types";

import { STORE_INFO, getStoreInfo } from "./store-info";

import { useLicense } from "@/lib/license/context";



// Web Serial API types
declare global {
  interface Navigator {
    serial?: {
      requestPort(options?: Record<string, unknown>): Promise<SerialPort>;
    };
  }
  interface SerialPort {
    open(options: { baudRate: number; dataBits?: number; stopBits?: number; parity?: string }): Promise<void>;
    close(): Promise<void>;
    writable: WritableStream<Uint8Array> | null;
  }
}



const TAX_RATE = 0;

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



interface HeldCart {

  id: string;

  holdNumber: number;

  timestamp: string;

  items: CartItem[];

  customer: ApiCustomer | null;

  discountAmount: number;

  discountReason: string;

}



export default function POSPage() {

  const { t, locale } = useI18n();

  const { products: apiProducts, loading, reload } = useProducts();

  // Recherche server-side pour 3000+ produits

  const { results: searchResults, loading: searchLoading, search: serverSearch, scanBarcode, bestsellers } = useServerProductSearch();
  const bestsellersLoaded = bestsellers.length > 0;

  const { data: apiCustomers } = useCustomers();

  const { transactions: recentTransactions, reload: reloadRecentTransactions } = useRecentTransactions(10);

  const { create: createTransaction, creating } = useCreateTransaction();

  const { create: createCustomer } = useCreateCustomer();

  const { user } = useAuth();

  const { toast } = useToast();

  const router = useRouter();

  // Seuls boss/manager/supervisor/stockist peuvent créer des produits

  const canCreateProduct = ["boss", "manager", "supervisor", "stockist"].includes(user?.role ?? "");

  const { data: activeShifts } = useActiveShifts();

  const { config: licenseConfig } = useLicense();

  const storeInfo = getStoreInfo(licenseConfig);

  const CATEGORIES = [

    t.common?.catAll || "Tous",

    t.common?.catGrocery || "Grocery",

    t.common?.catDrinks || "Beverages",

    t.common?.catDairy || "Dairy",

    t.common?.catHygiene || "Hygiene",

    t.common?.catButcher || "Butchery",

    t.common?.catBakery || "Bakery",

    t.common?.catFrozen || "Frozen",

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

  const [showNewProductModal, setShowNewProductModal] = useState(false);

  const [pendingBarcode, setPendingBarcode] = useState("");

  const [cashierDiscountAmount, setCashierDiscountAmount] = useState(0);

  const [cashierDiscountReason, setCashierDiscountReason] = useState("");

  const [splitPayment, setSplitPayment] = useState<SplitPayment>({ cash: 0, mobile: 0, card: 0, orange: 0 });

  const [selectedCustomer, setSelectedCustomer] = useState<ApiCustomer | null>(null);

  const [showCustomerSearch, setShowCustomerSearch] = useState(false);

  const [showCustomerCreateModal, setShowCustomerCreateModal] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [showMobileCart, setShowMobileCart] = useState(false);

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

  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  const [pendingTxCount, setPendingTxCount] = useState(0);

  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const [heldCarts, setHeldCarts] = useState<HeldCart[]>(() => {

    if (typeof window === "undefined") return [];

    try {

      const raw = localStorage.getItem("kabrak_held_carts");

      return raw ? JSON.parse(raw) : [];

    } catch { return []; }

  });

  const [showHeldCarts, setShowHeldCarts] = useState(false);

  const [usbDisplayConnected, setUsbDisplayConnected] = useState(false);

  const usbPortRef = useRef<SerialPort | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  const beepRef = useRef<HTMLAudioElement>(null);



  // Détection online/offline

  useEffect(() => {

    const goOnline = () => { setIsOnline(true); syncPendingTransactions(); };

    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);

    window.addEventListener("offline", goOffline);

    // Au montage, synchroniser les transactions en attente

    syncPendingTransactions();

    return () => {

      window.removeEventListener("online", goOnline);

      window.removeEventListener("offline", goOffline);

    };

  }, []);



  // Compter les transactions en attente

  const refreshPendingCount = () => {

    try {

      const pending = JSON.parse(localStorage.getItem("kabrak_pending_tx") || "[]");

      setPendingTxCount(pending.length);

    } catch { setPendingTxCount(0); }

  };



  // Synchroniser les transactions en attente quand online

  const syncPendingTransactions = async () => {

    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    try {

      const pending = JSON.parse(localStorage.getItem("kabrak_pending_tx") || "[]");

      if (pending.length === 0) return;

      const remaining: any[] = [];

      for (const tx of pending) {

        try {

          await createTransaction(tx);

        } catch {

          remaining.push(tx);

        }

      }

      localStorage.setItem("kabrak_pending_tx", JSON.stringify(remaining));

      refreshPendingCount();

      if (remaining.length === 0 && pending.length > 0) {

        setSyncMsg(t.pos.syncSuccess.replace("{n}", String(pending.length)));

        setTimeout(() => setSyncMsg(null), 4000);

      } else if (remaining.length > 0) {

        setSyncMsg(t.pos.syncFailed.replace("{n}", String(remaining.length)));

        setTimeout(() => setSyncMsg(null), 6000);

      }

    } catch {}

  };



  // Utiliser uniquement les vrais produits du backend (pas de fallback mock)

  // Les produits mock ont des IDs qui n'existent pas dans la DB, ce qui cause

  // des erreurs de foreign key lors de la création de transactions

  const products = apiProducts;



  // Détection du mode: server-side si beaucoup de produits, client-side sinon

  const useServerSearch = true;



  // Afficher une erreur si les produits ne chargent pas

  // Ne pas afficher l'erreur tant que les bestsellers sont en cours de chargement

  const productsLoading = loading || (!bestsellersLoaded && apiProducts.length === 0);

  const productsError = !loading && apiProducts.length === 0 && bestsellersLoaded;



  // Déclencher la recherche server-side quand search ou catégorie change

  useEffect(() => {

    if (!useServerSearch) return;

    const activeCategory = activeCategoryIdx === 0 ? undefined : CATEGORY_KEYS[activeCategoryIdx];

    serverSearch(search, activeCategory);

  }, [search, activeCategoryIdx, useServerSearch, serverSearch]);



  // Filtrage client-side (pour < 800 produits) ou server-side (pour 3000+)

  const filtered = useServerSearch

    ? searchResults

    : products.filter((p) => {

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

    // Stock non bloquant: les chiffres migrés ne sont pas fiables, on laisse vendre

    setCart((prev) => {

      const existing = prev.find((i) => i.product.id === product.id);

      if (existing) {

        return prev.map((i) =>

          i.product.id === product.id

            ? { ...i, quantity: i.quantity + 1 }

            : i

        );

      }

      return [...prev, { product, quantity: 1, discount: 0 }];

    });

  }, []);



  // Scan code-barres: quand on tape un code-barres exact + Entrée, ajouter directement

  const handleSearchSubmit = useCallback(

    async (e: React.KeyboardEvent) => {

      if (e.key !== "Enter" || !search.trim()) return;

      const code = search.trim();



      // 1. Chercher en local d'abord

      let found = products.find(

        (p) => p.barcode === code || p.sku.toLowerCase() === code.toLowerCase()

      );



      // 2. Si pas trouvé localement et mode serveur, chercher sur le serveur

      if (!found && useServerSearch) {

        found = await scanBarcode(code) ?? undefined;

      }



      if (found) {

        // Produit trouvé ? ajouter au panier (stock non bloquant)

        addToCart(found);

        if (beepRef.current) {

          beepRef.current.currentTime = 0;

          beepRef.current.play().catch(() => {});

        }

        setSearch("");

      } else {

        // Produit NON trouvé

        if (canCreateProduct) {

          // Managers/stockists ? ouvrir modal création

          setPendingBarcode(code);

          setSearch("");

          setShowNewProductModal(true);

        } else {

          // Cashier ? message simple, pas de création

          setSearch("");

          toast(t.pos.productNotFoundCashier, "warning");

        }

      }

    },

    [search, products, addToCart, useServerSearch, scanBarcode, canCreateProduct, toast, t]

  );



  // Scan via caméra (ZXing)

  const handleBarcodeScan = useCallback(

    async (code: string) => {

      // D'abord chercher dans les produits déjà chargés (cache local)

      let found = products.find(

        (p) => p.barcode === code.trim() || p.sku.toLowerCase() === code.trim().toLowerCase()

      );



      // Si pas trouvé en local et mode server-side, chercher sur le serveur

      if (!found && useServerSearch) {

        const serverProduct = await scanBarcode(code.trim());

        if (serverProduct) found = serverProduct;

      }



      if (found) {

        addToCart(found);

        if (beepRef.current) {

          beepRef.current.currentTime = 0;

          beepRef.current.play().catch(() => {});

        }

        setScanResult({ code, status: "success" });

        // Garder le scanner ouvert pour scanner plusieurs articles (mode caisse)

      } else {

        // Produit non trouvé

        setScanResult({ code, status: "not_found" });

        if (canCreateProduct) {

          // Managers/stockists ? ouvrir modal création

          setPendingBarcode(code);

          setShowScanner(false);

          setShowNewProductModal(true);

        } else {

          // Cashier ? message simple

          setShowScanner(false);

          toast(t.pos.productNotFoundCashier, "warning");

        }

      }

    },

    [products, addToCart, useServerSearch, scanBarcode, canCreateProduct, toast, t]

  );



  // Global barcode scanner  actif sur tout le POS sans cliquer de bouton

  // Désactivé si un modal est ouvert (checkout, new product, history, customer)

  const posModalOpen = showNewProductModal || showScanner || showHistoryModal || showCustomerSearch || showCustomerCreateModal || checkoutStep !== "cart";

  useBarcodeScanner(handleBarcodeScan, posModalOpen);



  // Handler quand un produit est créé depuis le modal (scan checkout)

  const handleProductCreatedInCheckout = useCallback(async (data: Omit<Product, "id">) => {

    try {

      const created = await productsApi.create({

        sku: data.sku || undefined,

        barcode: data.barcode || undefined,

        name: data.name,

        category: data.category,

        price: data.price,

        costPrice: data.costPrice,

        stock: data.stock,

        minStock: data.minStock,

        unit: data.unit,

        expiryDate: data.expiryDate || undefined,

      });

      // Ajouter le produit créé au panier

      const frontendProduct = apiProductToFrontend(created);

      addToCart(frontendProduct);

      if (beepRef.current) {

        beepRef.current.currentTime = 0;

        beepRef.current.play().catch(() => {});

      }

      setScanResult({ code: created.barcode || "", status: "success" });

      setShowNewProductModal(false);

      setPendingBarcode("");

      // Recharger les produits pour inclure le nouveau

      reload();

      // Refocus search bar pour permettre le scan suivant

      setTimeout(() => searchRef.current?.focus(), 100);

    } catch (e: unknown) {

      const msg = e instanceof Error ? e.message : "Erreur";

      alert(`Error: ${msg}`);

    }

  }, [addToCart, reload]);



  const updateQty = (productId: string, delta: number) => {

    setCart((prev) =>

      prev

        .map((i) =>

          i.product.id === productId

            ? { ...i, quantity: Math.max(0, i.quantity + delta) }

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



  // ── Hold / Recall cart ──────────────────────────────────────────

  const holdCart = () => {

    if (cart.length === 0) return;

    const holdNumber = heldCarts.length + 1;

    const held: HeldCart = {

      id: `hold-${Date.now()}`,

      holdNumber,

      timestamp: new Date().toISOString(),

      items: [...cart],

      customer: selectedCustomer,

      discountAmount: cashierDiscountAmount,

      discountReason: cashierDiscountReason,

    };

    const updated = [...heldCarts, held];

    setHeldCarts(updated);

    localStorage.setItem("kabrak_held_carts", JSON.stringify(updated));

    clearCart();

    setSelectedCustomer(null);

    toast(t.pos.transactionHeld.replace("{n}", String(holdNumber)), "success");

  };



  const recallCart = (held: HeldCart) => {

    if (cart.length > 0) {

      toast(t.pos.clearCartBeforeRecall, "warning");

      return;

    }

    setCart(held.items);

    setSelectedCustomer(held.customer);

    setCashierDiscountAmount(held.discountAmount);

    setCashierDiscountReason(held.discountReason);

    const updated = heldCarts.filter((h) => h.id !== held.id);

    setHeldCarts(updated);

    localStorage.setItem("kabrak_held_carts", JSON.stringify(updated));

    setShowHeldCarts(false);

    toast(t.pos.transactionRecalled.replace("{n}", String(held.holdNumber)), "success");

  };



  // ── USB Customer Display (Web Serial API) ───────────────────────

  const writeToUsbDisplay = async (line1: string, line2: string) => {

    if (!usbPortRef.current) return;

    try {

      const writer = usbPortRef.current.writable?.getWriter();

      if (!writer) return;

      const enc = new TextEncoder();

      const pad = (s: string, n: number) => s.slice(0, n).padEnd(n);

      // FF = form feed (clear display on most VFD/LCD)

      const msg = '\x0C' + pad(line1, 20) + pad(line2, 20);

      await writer.write(enc.encode(msg));

      writer.releaseLock();

    } catch { /* ignore write errors */ }

  };



  const connectUsbDisplay = async () => {

    // Web Serial nécessite HTTPS ou localhost (contexte sécurisé)
    if (!window.isSecureContext) {

      toast(
        locale === "fr"
          ? "Afficheur USB : utilisez ce PC serveur (localhost:3000), pas via WiFi. L'écran client WiFi (/pos/display) fonctionne partout."
          : "USB Display: use the server PC (localhost:3000), not via WiFi. The WiFi customer screen (/pos/display) works everywhere.",
        "warning"
      );

      return;

    }

    if (!('serial' in navigator)) {

      toast(
        locale === "fr"
          ? "Afficheur USB non supporté — utiliser Chrome ou Edge (pas Firefox)"
          : "USB display not supported — use Chrome or Edge (not Firefox)",
        "warning"
      );

      return;

    }

    try {

      const port = await (navigator as any).serial.requestPort();

      // Essayer plusieurs baud rates courants pour afficheurs VFD/LCD client
      const baudRates = [9600, 19200, 38400, 4800];

      let opened = false;

      for (const baud of baudRates) {

        try {

          await port.open({ baudRate: baud, dataBits: 8, stopBits: 1, parity: "none" });

          opened = true;

          console.log(`[USB Display] Connecté à ${baud} baud`);

          break;

        } catch {

          // essayer le prochain baud rate

        }

      }

      if (!opened) {

        toast(
          locale === "fr"
            ? "Impossible d'ouvrir le port — vérifier que l'afficheur est branché et non utilisé par un autre logiciel"
            : "Cannot open port — check display is plugged in and not used by another app",
          "warning"
        );

        return;

      }

      usbPortRef.current = port;

      setUsbDisplayConnected(true);

      toast(t.pos.usbDisplayConnected, "success");

      const storeName = (storeInfo.name || "EASY SHOP LIMBE").slice(0, 20).padEnd(20, " ");

      const welcome = (locale === "fr" ? "   Bienvenue!   " : "    Welcome!    ").slice(0, 20).padEnd(20, " ");

      await writeToUsbDisplay(storeName, welcome);

    } catch (e: any) {

      if (e?.name === "NotAllowedError") {

        // Utilisateur a annulé la sélection du port — pas d'erreur à afficher

        return;

      }

      // Port occupé ou autre erreur
      const msg = e?.message || "";

      if (msg.includes("already open") || msg.includes("Access denied")) {

        toast(
          locale === "fr"
            ? "Port déjà utilisé — fermer Retail Plus 50 ou tout autre logiciel utilisant ce port"
            : "Port already in use — close Retail Plus 50 or any other app using this port",
          "warning"
        );

      } else {

        toast(
          locale === "fr"
            ? `Erreur afficheur USB: ${msg || "connexion échouée"}`
            : `USB display error: ${msg || "connection failed"}`,
          "warning"
        );

      }

    }

  };



  const disconnectUsbDisplay = async () => {

    if (usbPortRef.current) {

      try { await usbPortRef.current.close(); } catch {}

      usbPortRef.current = null;

    }

    setUsbDisplayConnected(false);

    toast(t.pos.usbDisplayDisconnected, "success");

  };



  const subtotal = cart.reduce((s, i) => s + getEffectivePrice(i.product) * i.quantity, 0);

  const tax = Math.round(subtotal * TAX_RATE);

  const totalBeforeDiscount = subtotal + tax;

  const discount = Math.min(cashierDiscountAmount, totalBeforeDiscount);

  const total = totalBeforeDiscount - discount;

  const cashGivenNum = parseFloat(cashGiven.replace(/\s/g, "")) || 0;

  const change = cashGivenNum - total;



  // Vérifier si un article du panier a un stock insuffisant

  const stockIssues: { product: Product; quantity: number }[] = [];

  const hasStockIssues = stockIssues.length > 0;



  // Raccourcis clavier pour le POS (F1-F4 modes de paiement, Enter confirmer, Echap retour)

  useEffect(() => {

    const onKey = (e: KeyboardEvent) => {

      // Ignorer les raccourcis si l'utilisateur tape dans un input (sauf le champ scan)

      const target = e.target as HTMLElement;

      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      const isSearchInput = isInput && target === searchRef.current;



      if (checkoutStep === "cart" && !isSearchInput && e.key === "Enter") {

        // Enter dans le panier : aller au paiement

        if (cart.length > 0) {

          e.preventDefault();

          setCheckoutStep("payment");

        }

        return;

      }



      if (checkoutStep === "payment") {

        // F1-F4 : modes de paiement

        if (["F1", "F2", "F3", "F4", "F5"].includes(e.key)) {

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



        // Echap : retour au panier

        if (e.key === "Escape") {

          e.preventDefault();

          setCheckoutStep("cart");

          return;

        }



        // Enter : confirmer le paiement (sauf si on est dans un input)

        if (e.key === "Enter" && !isInput) {

          e.preventDefault();

          const splitTotal = splitPayment.cash + splitPayment.mobile + splitPayment.card + splitPayment.orange;

          const canConfirmNow =

            paymentMethod === "cash" ? cashGivenNum >= total :

            paymentMethod === "card" ? true :

            paymentMethod === "mobile" ? true :

            paymentMethod === "split" ? splitTotal >= total :

            false;

          if (canConfirmNow) {

            handleConfirmPayment();

          }

          return;

        }

      }

    };



    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);

  }, [checkoutStep, cart, paymentMethod, cashGivenNum, total, splitPayment, setPaymentMethod, setCheckoutStep]);



  // Mise à jour de l'écran client via localStorage

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

    localStorage.setItem("kabrak_pos_display", JSON.stringify(state));

    // Déclencher un événement pour les autres onglets (écran client)

    window.dispatchEvent(new StorageEvent("storage", { key: "kabrak_pos_display" }));

    // USB display update

    if (usbPortRef.current) {

      const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

      if (cart.length === 0) {

        const storeName = (storeInfo.name || "KABRAK").slice(0, 20).padEnd(20, " ");

        const welcome = (locale === "fr" ? "   Bienvenue!   " : "    Welcome!    ").slice(0, 20).padEnd(20, " ");

        writeToUsbDisplay(storeName, welcome);

      } else {

        const totalStr = total.toLocaleString("fr-FR") + " F";

        const payMsg = locale === "fr" ? "  Paiement...   " : "  Payment...    ";

        const thanksMsg = locale === "fr" ? "  Merci!        " : "  Thank you!    ";

        writeToUsbDisplay(

          `${itemCount} art. ${totalStr}`.slice(0, 20),

          checkoutStep === "payment" ? payMsg : thanksMsg

        );

      }

    }

  }, [cart, checkoutStep, subtotal, discount, total, selectedCustomer, locale, storeInfo.name]);



  const handleConfirmPayment = async () => {

    // ID caissier depuis l'auth  requis, doit être connecté

    if (!user?.id) {

      return; // not logged in, shouldn't reach POS

    }

    const defaultCashierId = user.id;



    // Trouver la caisse ouverte par cet utilisateur (ou n'importe quelle caisse ouverte)

    // Shift STRICTEMENT lié à cet employé  pas de fallback vers une autre caisse

    const myShift = activeShifts?.find((s) => s.employeeId === user.id && s.status === "open") ?? null;

    const registerId = myShift?.registerId;



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



    const txPayload = {

      cashierId: defaultCashierId,

      registerId,

      subtotal: Math.round(subtotal),

      discount: Math.round(discount),

      tax: Math.round(tax),

      total: Math.round(total),

      paymentMethod: recordedMethod,

      cashGiven: Math.round(effectiveCashGiven),

      change: Math.round(effectiveChange),

      customerId: selectedCustomer?.id,

      items: cart.map((item, idx) => {

        const effPrice = getEffectivePrice(item.product);

        return {

          productId: item.product.id,

          quantity: item.quantity,

          unitPrice: Math.round(effPrice),

          discount: Math.round(allocatedDiscount[idx]),

          tax: 0,

          total: Math.round(effPrice * item.quantity - allocatedDiscount[idx]),

        };

      }),

    };



    let tx: any = null;

    if (isOnline) {

      try {

        tx = await createTransaction(txPayload);

      } catch (err) {

        // Échec réseau  stocker en local pour sync ultérieure

        const pending = JSON.parse(localStorage.getItem("kabrak_pending_tx") || "[]");

        pending.push({ ...txPayload, _createdAt: Date.now() });

        localStorage.setItem("kabrak_pending_tx", JSON.stringify(pending));

        refreshPendingCount();

        setSyncMsg(t.pos.offlineSaleStored);

        setTimeout(() => setSyncMsg(null), 5000);

      }

    } else {

      // Mode offline  stocker en local

      const pending = JSON.parse(localStorage.getItem("kabrak_pending_tx") || "[]");

      pending.push({ ...txPayload, _createdAt: Date.now() });

      localStorage.setItem("kabrak_pending_tx", JSON.stringify(pending));

      refreshPendingCount();

    }



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

    const now = new Date();

    const dateStr = now.toLocaleDateString("en-GB");

    const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });



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



    // Format ticket style Retail Plus 50 : barcode + nom / qty @ prix = total
    const printItemsHtml = receipt.items

      .map((item) => {

        const effPrice = getEffectivePrice(item.product);
        const barcode = item.product.barcode || "";
        const name = item.product.name;
        const total = effPrice * item.quantity;

        return `<tr>
          <td colspan="2" style="font-size:10px;padding-top:3px">
            <div style="font-weight:bold">${barcode} ${name}</div>
            <div style="display:flex;justify-content:space-between;padding-left:4px">
              <span>${item.quantity}.00 @ ${effPrice.toLocaleString("fr-CM")}</span>
              <span style="font-weight:bold">${total.toLocaleString("fr-CM")}</span>
            </div>
          </td>
        </tr>`;

      })

      .join("");



    // Utiliser un iframe caché au lieu d'un popup (évite les bloqueurs de popup)
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
      document.body.removeChild(printFrame);
      toast(locale === "fr" ? "Erreur impression — réessayer" : "Print error — retry", "warning");
      return;
    }

    printDoc.write(`

      <html>

      <head>

        <title>${t.pos.receipt} ${receipt.id}</title>

        <style>

          @page { size: 80mm auto; margin: 0; }

          * { -webkit-print-color-adjust: exact; }

          html, body { width: 72mm; margin: 0 auto; padding: 0; }

          body { padding: 2mm 2mm 4mm; font-family: 'Courier New', monospace; color: #000; font-size: 13px; line-height: 1.4; font-weight: bold; }

          h1 { font-size: 15px; text-align: center; margin: 0 0 2px; font-weight: bold; }

          .center { text-align: center; }

          .dashed { border-top: 1px dashed #000; margin: 4px 0; }

          table { width: 100%; border-collapse: collapse; }

          td { padding: 1px 0; vertical-align: top; font-weight: bold; }

          .total { font-size: 15px; font-weight: bold; }

          .right { text-align: right; }

          .small { font-size: 11px; font-weight: bold; }

          @media print {

            body { width: 72mm; padding: 2mm 2mm 4mm; }

            * { page-break-inside: avoid; break-inside: avoid; }

            .no-break { page-break-inside: avoid; break-inside: avoid; }

          }

        </style>

      </head>

      <body>

        <h1>${storeInfo.name}</h1>

        <p class="center small">${storeInfo.address}</p>

        <p class="center small">TEL: ${storeInfo.phone.replace(/^Tel:\s*/i, "")}</p>

        <br/>

        <p class="center small">${new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}).toUpperCase()}&nbsp;&nbsp;${timeStr}</p>

        <p class="center small">SALE #${receipt.id}&nbsp;&nbsp;S/P-${receipt.cashier}</p>

        <div class="dashed"></div>

        <table>${printItemsHtml}</table>

        <div class="dashed"></div>

        <table>

          <tr><td class="small">SUBTOTAL</td><td class="right small">${formatCurrency(receipt.subtotal)}</td></tr>

          ${receipt.discount > 0 ? `<tr><td class="small">DISCOUNT${receipt.discountReason ? ` (${receipt.discountReason})` : ""}</td><td class="right small">-${formatCurrency(receipt.discount)}</td></tr>` : ""}

        </table>

        <div class="dashed"></div>

        <table>

          <tr><td class="total">TOTAL SALE</td><td class="right total">${formatCurrency(receipt.total)}</td></tr>

          <tr><td class="small">PAID ${methodLabel.toUpperCase()}</td><td class="right small">${formatCurrency(receipt.cashGiven ?? receipt.total)}</td></tr>

          ${receipt.change != null && receipt.change > 0 ? `<tr><td class="small">CHANGE</td><td class="right small">${formatCurrency(receipt.change)}</td></tr>` : ""}

          ${receipt.split ? `<tr><td class="small">- CASH</td><td class="right small">${formatCurrency(receipt.split.cash)}</td></tr><tr><td class="small">- MOBILE</td><td class="right small">${formatCurrency(receipt.split.mobile)}</td></tr><tr><td class="small">- ORANGE</td><td class="right small">${formatCurrency(receipt.split.orange)}</td></tr><tr><td class="small">- CARD</td><td class="right small">${formatCurrency(receipt.split.card)}</td></tr>` : ""}

        </table>

        <div class="dashed"></div>

        <p class="center small" style="margin-top:6px">goods sold are not refundable</p>

        <p class="center small">Thanks for patronizing us</p>

        <br/>

      </body>

      </html>

    `);

    printDoc.close();

    printFrame.contentWindow?.focus();

    setTimeout(() => {

      printFrame.contentWindow?.print();

      // Supprimer l'iframe après impression
      setTimeout(() => {
        if (printFrame.parentNode) document.body.removeChild(printFrame);
      }, 1000);

    }, 500);

  }, [receipt, user]);



  // Réimprimer un ticket à partir d'une transaction de l'historique

  const handleReprintTransaction = useCallback((tx: ApiTransaction) => {

    // Utiliser un iframe caché (évite les bloqueurs de popup)
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
      document.body.removeChild(printFrame);
      toast(locale === "fr" ? "Erreur impression — réessayer" : "Print error — retry", "warning");
      return;
    }

    const date = new Date(tx.date);

    const dateStr = date.toLocaleDateString("en-GB");

    const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });



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

          <td style="font-size:11px;vertical-align:top">${item.product?.name || "Product"}</td>

          <td style="text-align:center;font-size:11px;vertical-align:top">${item.quantity}</td>

          <td style="text-align:right;font-size:11px;vertical-align:top">${formatCurrency(unitPrice)}</td>

          <td style="text-align:right;font-size:11px;vertical-align:top">${formatCurrency(unitPrice * item.quantity)}</td>

        </tr>`;

      })

      .join("");



    printDoc.write(`

      <html>

      <head>

        <title>${t.pos.receipt} ${tx.transactionNumber}</title>

        <style>

          @page { size: 80mm auto; margin: 0; }

          * { -webkit-print-color-adjust: exact; }

          html, body { width: 72mm; margin: 0 auto; padding: 0; }

          body { padding: 2mm 2mm 4mm; font-family: 'Courier New', monospace; color: #000; font-size: 13px; line-height: 1.4; font-weight: bold; }

          h1 { font-size: 15px; text-align: center; margin: 0 0 2px; font-weight: bold; }

          .center { text-align: center; }

          .dashed { border-top: 1px dashed #000; margin: 4px 0; }

          table { width: 100%; border-collapse: collapse; }

          td { padding: 1px 0; vertical-align: top; font-weight: bold; }

          .total { font-size: 15px; font-weight: bold; }

          .right { text-align: right; }

          .small { font-size: 11px; font-weight: bold; }

          @media print {

            body { width: 72mm; padding: 2mm 2mm 4mm; }

            * { page-break-inside: avoid; break-inside: avoid; }

          }

        </style>

      </head>

      <body>

        <h1>${storeInfo.name}</h1>

        <p class="center small">${storeInfo.address}</p>

        <p class="center small">TEL: ${storeInfo.phone.replace(/^Tel:\s*/i, "")}</p>

        <br/>

        <p class="center small">${new Date(tx.date).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}).toUpperCase()}&nbsp;&nbsp;${new Date(tx.date).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</p>

        <p class="center small">SALE #${tx.transactionNumber}&nbsp;&nbsp;S/P-${user?.firstName || "CASHIER"}</p>

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

          <tr><td class="small">PAID ${methodLabel.toUpperCase()}</td><td class="right small">${(tx.cashGiven ?? tx.total).toLocaleString("fr-CM")}</td></tr>

          ${tx.change != null && tx.change > 0 ? `<tr><td class="small">CHANGE</td><td class="right small">${tx.change.toLocaleString("fr-CM")}</td></tr>` : ""}

          ${tx.split ? `<tr><td class="small">- CASH</td><td class="right small">${formatCurrency(tx.split.cash)}</td></tr><tr><td class="small">- MOBILE</td><td class="right small">${formatCurrency(tx.split.mobile)}</td></tr><tr><td class="small">- ORANGE</td><td class="right small">${formatCurrency(tx.split.orange)}</td></tr><tr><td class="small">- CARD</td><td class="right small">${formatCurrency(tx.split.card)}</td></tr>` : ""}

        </table>

        <div class="dashed"></div>

        <p class="center small" style="margin-top:6px">goods sold are not refundable</p>

        <p class="center small">Thanks for patronizing us</p>

        <p class="center small">(REPRINT)</p>

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

  }, [t]);



  return (

    <div className="flex flex-col h-screen bg-[#f0f2f5] overflow-hidden">



      {/* POS Topbar  plein ecran, pas de sidebar */}

      <div className="h-11 bg-white border-b border-[#e5e7eb] flex items-center px-5 gap-4 shrink-0 shadow-sm">

        <button

          onClick={() => router.push("/dashboard")}

          className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] transition-colors"

          title={t.nav.dashboard}

        >

          <ChevronLeft className="w-5 h-5" />

        </button>

        <div className="flex items-center gap-2.5">

          <div className="w-7 h-7 rounded-lg bg-[#16a34a] flex items-center justify-center">

            <span className="text-white text-[13px] font-black">K</span>

          </div>

          <span className="text-[14px] font-bold text-[#111827] tracking-tight">KABRAK <span className="text-[#16a34a]">POS</span></span>

        </div>

        <div className="w-px h-4 bg-[#e5e7eb]" />

        <span className="text-[13px] font-medium text-[#6b7280]">{user?.firstName} {user?.lastName}</span>

        <div className="flex items-center gap-2 ml-auto">

          {pendingTxCount > 0 && (

            <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-2 py-0.5 font-medium">

              {t.pos.pendingCount.replace("{n}", String(pendingTxCount))}

            </span>

          )}

          {syncMsg && (

            <span className="text-[11px] bg-[#f0fdf4] text-[#15803d] border border-[#86efac] rounded-md px-2 py-0.5 font-medium">

              {syncMsg}

            </span>

          )}

          <div className="flex items-center gap-1.5">

            <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-[#16a34a]" : "bg-amber-400 animate-pulse"}`} />

            <span className="text-[12px] text-[#9ca3af]">{isOnline ? t.pos.online : t.pos.offline}</span>

          </div>

          <button

            onClick={() => { reloadRecentTransactions(); setShowHistoryModal(true); }}

            className="h-7 px-3 text-[12px] font-medium text-[#6b7280] hover:bg-[#f3f4f6] rounded-lg transition-colors flex items-center gap-1.5"

          >

            <History className="w-3.5 h-3.5" />

            {t.pos.history}

          </button>

        </div>

      </div>



      {/* Alerte: pas de shift ouvert pour ce caissier */}

      {activeShifts !== null && !activeShifts?.find((s) => s.employeeId === user?.id && s.status === "open") && (

        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center gap-3 shrink-0">

          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />

          <p className="text-[13px] font-medium text-amber-800">

            {t.pos.noShiftWarning}{" "}

            <a href="/caisses" className="underline font-bold hover:text-amber-900">{t.pos.openMyRegister}</a>

          </p>

        </div>

      )}



      {/* Main POS  plein ecran */}

      <div className="flex flex-1 overflow-hidden">



        {/* LEFT  Panier (65%) */}

        <div className="w-[65%] flex flex-col bg-white border-r border-[#e5e7eb] shrink-0">



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

                (paymentMethod === "split" && splitPayment.cash + splitPayment.mobile + splitPayment.card + splitPayment.orange >= total)

              }

              creating={creating}

            />

          ) : (

            <>

              {/* Cart header */}

              <div className="px-5 py-3.5 border-b border-[#f3f4f6] flex items-center justify-between shrink-0">

                <div>

                  <h2 className="text-[16px] font-bold text-[#111827]">{t.pos.currentOrder}</h2>

                  <p className="text-[12px] text-[#9ca3af] tabular-nums">

                    {cart.reduce((s, i) => s + i.quantity, 0)} {t.pos.itemsArticle}

                  </p>

                </div>

                <div className="flex items-center gap-2">

                  <button

                    onClick={() => setShowCustomerSearch(true)}

                    className={cn(

                      "h-8 px-3 text-[12px] font-medium rounded-lg flex items-center gap-1.5 transition-colors border",

                      selectedCustomer

                        ? "bg-[#f0fdf4] text-[#15803d] border-[#86efac]"

                        : "text-[#9ca3af] hover:bg-[#f3f4f6] border-[#e5e7eb]"

                    )}

                  >

                    <Users className="w-3.5 h-3.5" />

                    {selectedCustomer ? selectedCustomer.firstName : t.pos.customer}

                  </button>

                  {cart.length > 0 && (

                    <button

                      onClick={holdCart}

                      className="h-8 px-3 text-[12px] font-medium text-amber-600 hover:bg-amber-50 rounded-lg flex items-center gap-1.5 transition-colors border border-amber-200"

                    >

                      <PauseCircle className="w-3.5 h-3.5" /> {t.pos.hold}

                    </button>

                  )}

                  {heldCarts.length > 0 && (

                    <button

                      onClick={() => setShowHeldCarts(true)}

                      className="relative h-8 px-3 text-[12px] font-medium text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1.5 transition-colors border border-blue-200"

                    >

                      <ListRestart className="w-3.5 h-3.5" /> {t.pos.recall}

                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">

                        {heldCarts.length}

                      </span>

                    </button>

                  )}

                  <button

                    onClick={usbDisplayConnected ? disconnectUsbDisplay : connectUsbDisplay}

                    title={usbDisplayConnected ? t.pos.usbDisconnect : t.pos.usbConnect}

                    className={cn(

                      "h-8 px-3 text-[12px] font-medium rounded-lg flex items-center gap-1.5 transition-colors border",

                      usbDisplayConnected

                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"

                        : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"

                    )}

                  >

                    <Monitor className="w-3.5 h-3.5" />

                    {usbDisplayConnected ? `${t.pos.usb} ●` : t.pos.usb}

                  </button>

                  {cart.length > 0 && (

                    <button

                      onClick={clearCart}

                      className="h-8 px-3 text-[12px] font-medium text-red-400 hover:bg-red-50 rounded-lg flex items-center gap-1.5 transition-colors border border-[#fecaca]"

                    >

                      <Trash2 className="w-3.5 h-3.5" /> {t.pos.clearCart}

                    </button>

                  )}

                </div>

              </div>



              {/* Cart items  grand et lisible */}

              <div className="flex-1 overflow-y-auto">

                {cart.length === 0 ? (

                  <div className="flex flex-col items-center justify-center h-full">

                    <ShoppingCart className="w-20 h-20 mb-4 text-[#e5e7eb]" />

                    <p className="text-[16px] font-semibold text-[#d1d5db]">{t.pos.emptyCartTitle}</p>

                    <p className="text-[13px] text-[#e5e7eb] mt-1">{t.pos.scanHint}</p>

                  </div>

                ) : (

                  <div className="divide-y divide-[#f9fafb]">

                    {cart.map((item) => {

                      const effPrice = getEffectivePrice(item.product);

                      const hasMarkdown = hasActiveMarkdown(item.product);

                      const expiryDays = daysToExpiry(item.product.expiryDate);

                      const isExpired = expiryDays !== null && expiryDays <= 0;

                      return (

                        <div

                          key={item.product.id}

                          className={cn("flex items-center gap-4 px-5 py-4", isExpired && "bg-amber-50/40")}

                        >

                          <div className="flex-1 min-w-0">

                            <p className="text-[15px] font-semibold text-[#111827] truncate flex items-center gap-2">

                              {item.product.name}

                              {hasMarkdown && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded shrink-0">{t.pos.promo}</span>}

                              {isExpired && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded shrink-0">{t.pos.expired}</span>}

                            </p>

                            <p className="text-[13px] text-[#9ca3af] tabular-nums mt-0.5">

                              {hasMarkdown ? (

                                <><span className="line-through">{formatCurrency(item.product.price)}</span> <span className="text-red-500 font-medium">{formatCurrency(effPrice)}</span> x {item.quantity}</>

                              ) : (

                                <>{formatCurrency(effPrice)} x {item.quantity}</>

                              )}

                            </p>

                          </div>

                          <div className="flex items-center gap-2 shrink-0">

                            <button onClick={() => updateQty(item.product.id, -1)} className="w-9 h-9 rounded-lg bg-[#f3f4f6] hover:bg-[#e5e7eb] flex items-center justify-center transition-colors">

                              <Minus className="w-4 h-4 text-[#374151]" />

                            </button>

                            <span className="w-9 text-center text-[17px] font-bold text-[#111827] tabular-nums">{item.quantity}</span>

                            <button onClick={() => updateQty(item.product.id, 1)} className="w-9 h-9 rounded-lg bg-[#f3f4f6] hover:bg-[#e5e7eb] flex items-center justify-center transition-colors disabled:opacity-30">

                              <Plus className="w-4 h-4 text-[#374151]" />

                            </button>

                            <button onClick={() => removeItem(item.product.id)} className="w-9 h-9 rounded-lg hover:bg-red-50 flex items-center justify-center text-[#d1d5db] hover:text-red-500 transition-colors">

                              <Trash2 className="w-4 h-4" />

                            </button>

                          </div>

                          <p className="text-[16px] font-bold text-[#111827] tabular-nums w-28 text-right shrink-0">

                            {formatCurrency(effPrice * item.quantity)}

                          </p>

                        </div>

                      );

                    })}

                  </div>

                )}

              </div>



              {/* Totals + Remise + Encaisser */}

              <div className="border-t border-[#e5e7eb] bg-[#fafafa] shrink-0">

                <div className="px-5 pt-4 pb-2 flex items-center gap-3">

                  <Tag className="w-4 h-4 text-[#9ca3af] shrink-0" />

                  <input

                    type="number"

                    inputMode="numeric"

                    value={cashierDiscountAmount || ""}

                    onChange={(e) => {

                      const v = parseInt(e.target.value) || 0;

                      setCashierDiscountAmount(Math.max(0, Math.min(subtotal, v)));

                    }}

                    placeholder={t.pos.discountPlaceholder}

                    className="flex-1 border border-[#e5e7eb] rounded-lg px-3 py-2 text-[13px] font-semibold text-rose-600 tabular-nums outline-none focus:border-rose-400 bg-white"

                  />

                  {cashierDiscountAmount > 0 && (

                    <button onClick={() => { setCashierDiscountAmount(0); setCashierDiscountReason(""); }} className="text-[#9ca3af] hover:text-red-500 text-lg leading-none">x</button>

                  )}

                </div>

                <div className="px-5 pb-4">

                  <div className="flex justify-between text-[13px] text-[#9ca3af] mb-1.5">

                    <span>{t.pos.subtotal}</span>

                    <span className="tabular-nums">{formatCurrency(subtotal)}</span>

                  </div>

                  {discount > 0 && (

                    <div className="flex justify-between text-[13px] text-rose-500 mb-1.5">

                      <span>{t.pos.discount}{cashierDiscountReason ? ` (${cashierDiscountReason})` : ""}</span>

                      <span className="tabular-nums">-{formatCurrency(discount)}</span>

                    </div>

                  )}

                  <div className="flex justify-between items-baseline pt-3 border-t border-[#e5e7eb]">

                    <span className="text-[15px] font-bold text-[#374151] uppercase tracking-wide">{t.pos.total}</span>

                    <span className="text-[44px] font-black text-[#16a34a] tabular-nums leading-none">

                      {formatCurrency(total)}

                    </span>

                  </div>

                </div>

                {hasStockIssues && (

                  <div className="mx-5 mb-3 flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">

                    <AlertCircle className="w-4 h-4 shrink-0" />

                    {t.pos.outOfStock}: {stockIssues.map(i => i.product.name).join(", ")}

                  </div>

                )}

                <div className="px-5 pb-5">

                  <button

                    disabled={cart.length === 0 || hasStockIssues}

                    onClick={() => setCheckoutStep("payment")}

                    className="w-full h-14 bg-[#16a34a] hover:bg-[#15803d] active:scale-[0.99] text-white text-[18px] font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(22,163,74,.3)] flex items-center justify-center gap-2"

                  >

                    <ChevronRight className="w-5 h-5" />

                    {t.pos.encaisser}

                  </button>

                </div>

              </div>

            </>

          )}

        </div>



        {/* RIGHT  Recherche & Scan (Retail Mode) */}

        <div className="flex-1 flex flex-col bg-[#f7f8fa]">



          {/* Grande barre de recherche/scanner */}

          <div className="px-5 pt-5 pb-3">

            <div className="flex items-center gap-2.5 bg-white border-2 border-[#e5e7eb] rounded-2xl px-4 py-3 focus-within:border-[#16a34a] focus-within:ring-4 focus-within:ring-[#16a34a]/10 transition-all shadow-sm">

              <Search className="w-5 h-5 text-[#9ca3af] shrink-0" />

              <input

                ref={searchRef}

                type="text"

                value={search}

                onChange={(e) => setSearch(e.target.value)}

                onKeyDown={handleSearchSubmit}

                placeholder={t.pos.scanOrSearch}

                className="flex-1 bg-transparent text-[16px] text-[#111827] placeholder:text-[#9ca3af] outline-none"

                autoFocus

              />

              {search && (

                <button onClick={() => setSearch("")}>

                  <X className="w-5 h-5 text-[#9ca3af] hover:text-[#374151]" />

                </button>

              )}

              <button

                onClick={() => setShowScanner(true)}

                className="ml-1 h-9 px-3 bg-[#f0fdf4] border border-[#86efac] rounded-xl text-[13px] font-semibold text-[#15803d] flex items-center gap-1.5 hover:bg-[#dcfce7] transition-colors shrink-0"

              >

                <ScanLine className="w-4 h-4" /> {t.pos.camera}

              </button>

            </div>

          </div>



          {/* Dropdown résultats de recherche */}

          {search && (

            <div className="flex-1 overflow-y-auto px-5 pb-5">

              {productsLoading ? (

                <div className="flex flex-col items-center justify-center h-40">

                  <div className="w-6 h-6 border-2 border-[#16a34a] border-t-transparent rounded-full animate-spin mb-2" />

                  <p className="text-[13px] text-[#9ca3af]">{t.pos.loading}</p>

                </div>

              ) : (useServerSearch && searchLoading) ? (

                <div className="flex flex-col items-center justify-center h-40">

                  <div className="w-6 h-6 border-2 border-[#16a34a] border-t-transparent rounded-full animate-spin mb-2" />

                  <p className="text-[13px] text-[#9ca3af]">{t.pos.searching}</p>

                </div>

              ) : filtered.length === 0 ? (

                <div className="flex flex-col items-center justify-center h-40 text-[#9ca3af]">

                  <Search className="w-8 h-8 mb-2 opacity-30" />

                  <p className="text-[13px]">{t.common.noResults}</p>

                </div>

              ) : (

                <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden shadow-sm">

                  {filtered.slice(0, 20).map((product) => {

                    const inCart = cart.find((i) => i.product.id === product.id);

                    const outOfStock = false;

                    return (

                      <button

                        key={product.id}

                        onClick={() => addToCart(product)}

                        disabled={false}

                        className={cn(

                          "w-full text-left px-4 py-3 flex items-center gap-3 border-b border-[#f3f4f6] last:border-0 transition-colors",

                          inCart

                            ? "bg-[#f0fdf4] hover:bg-[#dcfce7]"

                            : "hover:bg-slate-50"

                        )}

                      >

                        <div className="w-10 h-10 bg-[#f3f4f6] rounded-lg flex items-center justify-center text-[14px] font-bold text-[#9ca3af] shrink-0">

                          {product.name.charAt(0)}

                        </div>

                        <div className="flex-1 min-w-0">

                          <p className="text-[14px] font-semibold text-[#111827] truncate">

                            {product.name}

                          </p>

                          <p className="text-[12px] text-[#9ca3af]">

                            {product.barcode || product.sku || ""}

                          </p>

                        </div>

                        {inCart && (

                          <span className="w-6 h-6 bg-[#16a34a] text-white text-[11px] font-bold rounded-full flex items-center justify-center tabular-nums shrink-0">

                            {inCart.quantity}

                          </span>

                        )}

                        <span className={cn(

                          "text-[15px] font-bold tabular-nums shrink-0",

                          hasActiveMarkdown(product) ? "text-red-600" : "text-[#16a34a]"

                        )}>

                          {formatCurrency(getEffectivePrice(product))}

                        </span>

                        <span className={cn(

                          "text-[11px] font-medium tabular-nums shrink-0 w-12 text-right",

                          product.stock <= product.minStock / 4 ? "text-red-500"

                          : product.stock <= product.minStock ? "text-amber-500"

                          : "text-[#d1d5db]"

                        )}>

                          {outOfStock ? "0" : product.stock}

                        </span>

                      </button>

                    );

                  })}

                </div>

              )}

            </div>

          )}



          {/* Espace vide quand pas de recherche  guider le caissier */}

          {!search && (

            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-5">

              <div className="w-20 h-20 bg-[#f0fdf4] rounded-2xl flex items-center justify-center">

                <ScanLine className="w-10 h-10 text-[#16a34a]" />

              </div>

              <div>

                <p className="text-[18px] font-bold text-[#374151]">{t.pos.scanHint}</p>

                <p className="text-[14px] text-[#9ca3af] mt-1">{t.pos.scanOrSearch}</p>

              </div>

            </div>

          )}

        </div>

      </div>



      {/* Modals */}

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

      {showNewProductModal && (

        <NewProductModal

          prefillBarcode={pendingBarcode}

          onClose={() => { setShowNewProductModal(false); setPendingBarcode(""); setTimeout(() => searchRef.current?.focus(), 100); }}

          onSave={handleProductCreatedInCheckout}

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

          onCreate={() => {

            setShowCustomerSearch(false);

            setShowCustomerCreateModal(true);

          }}

        />

      )}

      {showCustomerCreateModal && (

        <CustomerCreateModal

          show={showCustomerCreateModal}

          onClose={() => setShowCustomerCreateModal(false)}

          onSuccess={(c) => {

            setSelectedCustomer(c);

            setShowCustomerCreateModal(false);

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

      {/* Held Carts Modal */}

      {showHeldCarts && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[80]" onClick={() => setShowHeldCarts(false)} />
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md pointer-events-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <ListRestart className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-bold">{t.pos.pendingTransactions}</h2>
                </div>
                <button onClick={() => setShowHeldCarts(false)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              </div>
              <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                {heldCarts.length === 0 ? (
                  <p className="text-center text-sm text-[var(--text-muted)] py-6">{t.pos.noPendingTransactions}</p>
                ) : heldCarts.map((held) => (
                  <button
                    key={held.id}
                    onClick={() => recallCart(held)}
                    className="w-full text-left p-3 rounded-xl border border-[var(--border)] hover:border-blue-300 hover:bg-blue-50 transition-colors flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                      #{held.holdNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {held.items.length} {held.items.length !== 1 ? t.pos.articles : t.pos.article}
                        {held.customer ? ` — ${held.customer.firstName}` : ""}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {new Date(held.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                        {held.items.reduce((s, i) => s + i.quantity * i.product.price, 0).toLocaleString("fr-FR")} F
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

    </div>

  );

}



// -- Customer Search Modal --------------------------------------------------------------



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

                      {new Date(tx.date).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })} · {tx.paymentMethod}

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



// -- Customer Search Modal --------------------------------------------------------------



function CustomerSearchModal({

  customers,

  selected,

  onClose,

  onSelect,

  onClear,

  onCreate,

}: {

  customers: ApiCustomer[];

  selected: ApiCustomer | null;

  onClose: () => void;

  onSelect: (c: ApiCustomer) => void;

  onClear: () => void;

  onCreate: () => void;

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

        <button

          onClick={onCreate}

          className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--brand)] text-white rounded-xl text-sm font-medium hover:bg-[var(--brand-dark)] transition-colors"

        >

          <Plus className="w-4 h-4" />

          {t.clients?.add || t.common.add}

        </button>

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



// Customer Create Modal

function CustomerCreateModal({

  show,

  onClose,

  onSuccess,

}: {

  show: boolean;

  onClose: () => void;

  onSuccess: (customer: ApiCustomer) => void;

}) {

  const { t } = useI18n();

  const [firstName, setFirstName] = useState("");

  const [lastName, setLastName] = useState("");

  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);

  const { create: createCustomer } = useCreateCustomer();



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!firstName || !lastName || !phone) return;



    setLoading(true);

    try {

      const newCustomer = await createCustomer({

        firstName,

        lastName,

        phone,

        email: "",

      });

      onSuccess(newCustomer);

      onClose();

      setFirstName("");

      setLastName("");

      setPhone("");

    } catch (err) {

      console.error("Failed to create customer:", err);

      const msg = err instanceof Error ? err.message : t.clients?.createError || "Erreur lors de la création du client";

      setFormError(msg);

    } finally {

      setLoading(false);

    }

  };



  if (!show) return null;



  return (

    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">

      <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-md p-5">

        <div className="flex items-center justify-between mb-4">

          <h3 className="text-base font-semibold text-[var(--text-primary)]">

            {t.clients?.add || t.common.add}

          </h3>

          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">

            <X className="w-4 h-4 text-slate-500" />

          </button>

        </div>

        <form onSubmit={handleSubmit} className="space-y-3">

          <div>

            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">

              {t.clients?.firstName || "Prénom"}

            </label>

            <input

              type="text"

              value={firstName}

              onChange={(e) => setFirstName(e.target.value)}

              className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"

              required

            />

          </div>

          <div>

            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">

              {t.clients?.lastName || "Nom"}

            </label>

            <input

              type="text"

              value={lastName}

              onChange={(e) => setLastName(e.target.value)}

              className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"

              required

            />

          </div>

          <div>

            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">

              {t.clients?.phone || "Téléphone"}

            </label>

            <input

              type="tel"

              value={phone}

              onChange={(e) => setPhone(e.target.value)}

              className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"

              required

            />

          </div>

          {formError && (

            <p className="text-xs text-red-600 mt-2">{formError}</p>

          )}

          <div className="flex gap-3 pt-2">

            <Button variant="secondary" className="flex-1" onClick={onClose}>

              {t.common.cancel}

            </Button>

            <Button className="flex-1" disabled={loading || !firstName || !lastName || !phone}>

              {loading ? "..." : t.common.confirm}

            </Button>

          </div>

        </form>

      </div>

    </div>

  );

}



// -- Payment Panel --------------------------------------------------------------



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

                orange: Smartphone,

                split: Split,

              };

              const labels: Record<string, string> = {

                cash: t.pos.cash,

                card: t.pos.card,

                mobile: t.pos.mobile,

                orange: t.pos.orange,

                split: t.pos.split,

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

                    {m === "cash" ? "F1" : m === "card" ? "F2" : m === "mobile" ? "F3" : m === "orange" ? "F4" : "F5"}

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

              {t.pos.paymentSplit}

            </p>

            {[

              { key: "cash" as const, label: t.pos.cash, icon: Banknote },

              { key: "mobile" as const, label: t.pos.mobile, icon: Smartphone },

              { key: "orange" as const, label: t.pos.orange, icon: Smartphone },

              { key: "card" as const, label: t.pos.card, icon: CreditCard },

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

          <span>{t.pos.kbShortcutsPayment}</span>

          <span>{t.pos.kbShortcutsActions}</span>

        </div>

      </div>

    </div>

  );

}



// -- Receipt Panel --------------------------------------------------------------



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

  const dateStr = now.toLocaleDateString("en-GB");

  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });



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

                {hasMd && <span className="text-red-600 font-bold"> {t.pos.promoBadge}</span>}

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

          <p className="text-center text-[var(--text-muted)] mt-1">{(storeInfo.receiptFooter || t.pos.thankYou).split("\n").map((line, idx) => (

            <span key={idx} className="block">{line}</span>

          ))}</p>

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

  // No emojis  clean, professional look

  return "";

}

