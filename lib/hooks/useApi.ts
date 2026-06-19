"use client";

import { useState, useEffect, useCallback } from "react";
import {
  productsApi,
  transactionsApi,
  stockApi,
  syncApi,
  suppliersApi,
  employeesApi,
  purchaseOrdersApi,
  shiftsApi,
  schedulesApi,
  customersApi,
  reportsApi,
  accountingApi,
  aiApi,
  invoicesApi,
  notificationsApi,
  apiProductToFrontend,
  type ApiProduct,
  type ApiTransaction,
  type ApiSupplier,
  type ApiEmployee,
  type ApiPurchaseOrder,
  type ApiShift,
  type ApiSchedule,
  type ApiCustomer,
  type ApiLoyaltyHistory,
  type ApiExpense,
  type ApiRevenue,
  type ApiInvoice,
  type ApiNotification,
  type ApiNotificationSummary,
} from "@/lib/api";
import type { Product } from "@/lib/types";

// ========================================
// HOOK: useProducts
// Récupère les produits depuis le backend
// ========================================
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productsApi.list(1, 1000); // Charger jusqu'à 1000 produits
      setProducts(response.data.map(apiProductToFrontend));
    } catch (e: any) {
      setError(e.message);
      // Fallback: ne pas planter si le backend est down
      console.warn("Backend indisponible, utilisation des données mock");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { products, loading, error, reload: load };
}

// ========================================
// HOOK: useProductSearch
// Recherche de produits (pour la caisse)
// ========================================
export function useProductSearch() {
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string, category?: string) => {
    if (!query || query.length < 1) {
      setResults([]);
      return;
    }
    try {
      setLoading(true);
      const response = await productsApi.search({ q: query, category, limit: 50 });
      setResults(response.data.map(apiProductToFrontend));
    } catch (e) {
      console.warn("Erreur recherche:", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, search };
}

// ========================================
// HOOK: useBarcodeScan
// Scan code-barres (caisse)
// ========================================
export function useBarcodeScan() {
  const [scanning, setScanning] = useState(false);

  const scan = useCallback(async (barcode: string): Promise<Product | null> => {
    if (!barcode) return null;
    try {
      setScanning(true);
      const product = await productsApi.findByBarcode(barcode);
      return apiProductToFrontend(product);
    } catch (e) {
      return null;
    } finally {
      setScanning(false);
    }
  }, []);

  return { scanning, scan };
}

// ========================================
// HOOK: useTodayStats
// Statistiques du jour (dashboard)
// ========================================
export function useTodayStats() {
  const [stats, setStats] = useState<{
    transactions: number;
    revenue: number;
    itemsSold: number;
    avgBasket: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await transactionsApi.todayStats();
      setStats(data);
    } catch (e) {
      console.warn("Backend indisponible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Refresh toutes les 30 secondes
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  return { stats, loading, reload: load };
}

// ========================================
// HOOK: useYesterdayStats (comparaison dashboard)
// ========================================
export function useYesterdayStats() {
  const [stats, setStats] = useState<{
    transactions: number;
    revenue: number;
    itemsSold: number;
    avgBasket: number;
  } | null>(null);

  useEffect(() => {
    transactionsApi.yesterdayStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  return { stats };
}

// ========================================
// HOOK: useWeekTrend (graphique 7 jours)
// ========================================
export function useWeekTrend() {
  const [data, setData] = useState<Array<{ date: string; label: string; revenue: number; transactions: number }>>([]);

  useEffect(() => {
    transactionsApi.weekTrend()
      .then(setData)
      .catch(() => {});
  }, []);

  return { data };
}

// ========================================
// HOOK: useMonthlyGoal
// Objectif mensuel (dashboard)
// ========================================
export function useMonthlyGoal() {
  const [data, setData] = useState<{ current: number; goal: number; progress: number; transactions: number; remaining: number } | null>(null);

  useEffect(() => {
    transactionsApi.monthlyGoal()
      .then(setData)
      .catch(() => {});
  }, []);

  return { data };
}

// ========================================
// HOOK: useMonthlyTopProducts
// Top produits vendus ce mois (dashboard)
// ========================================
export function useMonthlyTopProducts(limit?: number) {
  const [data, setData] = useState<Array<{ productId: string; productName: string; sku: string; quantity: number; revenue: number }>>([]);

  useEffect(() => {
    transactionsApi.topProducts(limit)
      .then(setData)
      .catch(() => {});
  }, [limit]);

  return { data };
}

// ========================================
// HOOK: useAverageBasket
// Panier moyen (dashboard)
// ========================================
export function useAverageBasket() {
  const [data, setData] = useState<{ average: number; total: number; transactions: number } | null>(null);

  useEffect(() => {
    transactionsApi.averageBasket()
      .then(setData)
      .catch(() => {});
  }, []);

  return { data };
}

// ========================================
// HOOK: useUnpaidInvoices
// Factures impayées (dashboard)
// ========================================
export function useUnpaidInvoices() {
  const [data, setData] = useState<{ totalUnpaid: number; count: number; partial: { amount: number; count: number }; overdue: { amount: number; count: number } } | null>(null);

  useEffect(() => {
    invoicesApi.unpaidStats()
      .then(setData)
      .catch(() => {});
  }, []);

  return { data };
}

// ========================================
// HOOK: useProductStats
// Statistiques produits (dashboard)
// ========================================
export function useProductStats() {
  const [stats, setStats] = useState<{
    total: number;
    lowStock: number;
    expiring: number;
    outOfStock: number;
    healthy: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await productsApi.stats();
      setStats(data);
    } catch (e) {
      console.warn("Backend indisponible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000); // Refresh chaque minute
    return () => clearInterval(interval);
  }, [load]);

  return { stats, loading, reload: load };
}

// ========================================
// HOOKS: MARKDOWN / PROMOTIONS
// ========================================
export function useSetMarkdown() {
  const [setting, setSetting] = useState(false);
  const setMarkdown = async (id: string, data: { markdownPrice: number; markdownReason: string; markdownNote?: string; markdownExpiresAt?: string }) => {
    setSetting(true);
    try {
      return await productsApi.setMarkdown(id, data);
    } catch (e) {
      console.error("Set markdown failed:", e);
      return null;
    } finally {
      setSetting(false);
    }
  };
  return { setMarkdown, setting };
}

export function useRemoveMarkdown() {
  const [removing, setRemoving] = useState(false);
  const removeMarkdown = async (id: string) => {
    setRemoving(true);
    try {
      return await productsApi.removeMarkdown(id);
    } catch (e) {
      console.error("Remove markdown failed:", e);
      return null;
    } finally {
      setRemoving(false);
    }
  };
  return { removeMarkdown, removing };
}

export function useMarkdowns(page = 1, limit = 50) {
  return useApi(() => productsApi.getMarkdowns(page, limit), [page, limit]);
}
export function useStockAlerts() {
  const [alerts, setAlerts] = useState<{
    lowStock: ApiProduct[];
    outOfStock: ApiProduct[];
    expiringSoon: ApiProduct[];
    expired: ApiProduct[];
    summary: {
      lowStockCount: number;
      outOfStockCount: number;
      expiringSoonCount: number;
      expiredCount: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await stockApi.alerts();
      setAlerts(data);
    } catch (e) {
      console.warn("Backend indisponible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  return { alerts, loading, reload: load };
}

// ========================================
// HOOK: useRecentTransactions
// Transactions récentes (dashboard)
// ========================================
export function useRecentTransactions(limit: number = 10) {
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await transactionsApi.list(1, limit);
      setTransactions(response.data);
    } catch (e) {
      console.warn("Backend indisponible");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  return { transactions, loading, reload: load };
}

// ========================================
// HOOK: useCreateTransaction
// Créer une vente (POS)
// ========================================
export function useCreateTransaction() {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTransaction, setLastTransaction] = useState<ApiTransaction | null>(null);

  const create = useCallback(
    async (data: {
      cashierId: string;
      registerId?: string;
      subtotal: number;
      discount?: number;
      tax: number;
      total: number;
      paymentMethod: string;
      cashGiven?: number;
      change?: number;
      customerId?: string;
      items: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        discount?: number;
        tax: number;
        total: number;
      }>;
    }): Promise<ApiTransaction | null> => {
      try {
        setCreating(true);
        setError(null);
        const tx = await transactionsApi.create(data);
        setLastTransaction(tx);
        return tx;
      } catch (e: any) {
        setError(e.message);
        return null;
      } finally {
        setCreating(false);
      }
    },
    [],
  );

  return { creating, error, lastTransaction, create };
}

// ========================================
// HOOK: useSyncStatus
// Statut synchronisation (offline-first)
// ========================================
export function useSyncStatus() {
  const [status, setStatus] = useState<{
    enabled: boolean;
    online: boolean;
    cloudApiUrl: string;
    pending: { transactions: number; stockMovements: number; total: number };
    failed: number;
    lastSync: string;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await syncApi.status();
      setStatus(data);
    } catch (e) {
      // Backend indisponible
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000); // Check chaque 10s
    return () => clearInterval(interval);
  }, [load]);

  return { status, reload: load };
}

// ========================================
// HOOK: useStockValue
// Valeur du stock (dashboard)
// ========================================
export function useStockValue() {
  const [value, setValue] = useState<{
    totalProducts: number;
    totalUnits: number;
    totalCostValue: number;
    totalSaleValue: number;
    potentialMargin: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await stockApi.value();
      setValue(data);
    } catch (e) {
      console.warn("Backend indisponible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  return { value, loading, reload: load };
}

// ========================================
// HOOK: useStockAdjust (ajustement de stock / pertes)
// ========================================
export function useStockAdjust() {
  const [adjusting, setAdjusting] = useState(false);
  const adjust = async (productId: string, newStock: number, reason: string, createdBy?: string) => {
    setAdjusting(true);
    try {
      return await stockApi.adjust(productId, newStock, reason, createdBy);
    } finally {
      setAdjusting(false);
    }
  };
  return { adjust, adjusting };
}

// ========================================
// HOOK: useSalesByHour (graphique dashboard)
// ========================================
export function useSalesByHour() {
  const [data, setData] = useState<Array<{ hour: string; revenue: number; transactions: number }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await transactionsApi.salesByHour();
      setData(result);
    } catch (e) {
      console.warn("Backend indisponible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  return { data, loading, reload: load };
}

// ========================================
// HOOK: useMarginByCategory (graphique dashboard)
// ========================================
export function useMarginByCategory() {
  const [data, setData] = useState<Array<{ category: string; revenue: number; margin: number; marginRate: number }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await transactionsApi.marginByCategory();
      setData(result);
    } catch (e) {
      console.warn("Backend indisponible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 120000);
    return () => clearInterval(interval);
  }, [load]);

  return { data, loading, reload: load };
}

// ========================================
// HOOK: useSuppliers (fournisseurs)
// ========================================
export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await suppliersApi.list();
      setSuppliers(result);
    } catch (e) {
      console.warn("Backend indisponible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { suppliers, loading, reload: load };
}

// ========================================
// HOOK: useEmployees (employés)
// ========================================
export function useEmployees() {
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await employeesApi.list();
      setEmployees(result);
    } catch (e) {
      console.warn("Backend indisponible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { employees, loading, reload: load };
}

// ========================================
// GENERIC HOOK: useApi
// Hook générique pour récupérer des données depuis le backend
// ========================================
export function useApi<T>(fetcher: () => Promise<T>, deps: any[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetcher();
      setData(result);
    } catch (e: any) {
      setError(e.message);
      console.warn("Backend indisponible");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

// ========================================
// HOOKS: Purchase Orders (Bons de commande)
// ========================================
export function usePurchaseOrders(status?: string) {
  return useApi(() => purchaseOrdersApi.list(status), [status]);
}
export function useCreatePurchaseOrder() {
  const [creating, setCreating] = useState(false);
  const create = async (data: Parameters<typeof purchaseOrdersApi.create>[0]) => {
    setCreating(true);
    try { return await purchaseOrdersApi.create(data); }
    finally { setCreating(false); }
  };
  return { create, creating };
}

// ========================================
// HOOKS: Shifts (Caisses)
// ========================================
export function useActiveShifts() {
  return useApi(() => shiftsApi.active(), []);
}
export function useOpenShift() {
  const [opening, setOpening] = useState(false);
  const open = async (data: Parameters<typeof shiftsApi.open>[0]) => {
    setOpening(true);
    try { return await shiftsApi.open(data); }
    finally { setOpening(false); }
  };
  return { open, opening };
}
export function useCloseShift() {
  const [closing, setClosing] = useState(false);
  const close = async (id: string, data: Parameters<typeof shiftsApi.close>[1]) => {
    setClosing(true);
    try { return await shiftsApi.close(id, data); }
    finally { setClosing(false); }
  };
  return { close, closing };
}

// ========================================
// HOOKS: Schedules (Planning caisses)
// ========================================
export function useSchedules() {
  return useApi(() => schedulesApi.list(), []);
}
export function useTodaySchedule() {
  return useApi(() => schedulesApi.today(), []);
}
export function useCreateSchedule() {
  const [creating, setCreating] = useState(false);
  const create = async (data: Parameters<typeof schedulesApi.create>[0]) => {
    setCreating(true);
    try { return await schedulesApi.create(data); }
    finally { setCreating(false); }
  };
  return { create, creating };
}
export function useDeleteSchedule() {
  const [deleting, setDeleting] = useState(false);
  const remove = async (id: string) => {
    setDeleting(true);
    try { return await schedulesApi.remove(id); }
    finally { setDeleting(false); }
  };
  return { remove, deleting };
}

// ========================================
// HOOKS: Customers (Clients fidélité)
// ========================================
export function useCustomers(search?: string) {
  return useApi(() => customersApi.list(search), [search]);
}
export function useCustomerStats() {
  return useApi(() => customersApi.stats(), []);
}
export function useCreateCustomer() {
  const [creating, setCreating] = useState(false);
  const create = async (data: Parameters<typeof customersApi.create>[0]) => {
    setCreating(true);
    try { return await customersApi.create(data); }
    finally { setCreating(false); }
  };
  return { create, creating };
}

// ========================================
// HOOKS: Reports (Rapports)
// ========================================
export function useSalesReport(startDate: string, endDate: string) {
  return useApi(() => reportsApi.sales(startDate, endDate), [startDate, endDate]);
}
export function useSalesByCategory(startDate: string, endDate: string) {
  return useApi(() => reportsApi.salesByCategory(startDate, endDate), [startDate, endDate]);
}
export function useSalesByEmployee(startDate: string, endDate: string) {
  return useApi(() => reportsApi.salesByEmployee(startDate, endDate), [startDate, endDate]);
}
export function useTopProducts(startDate: string, endDate: string, limit?: number) {
  return useApi(() => reportsApi.topProducts(startDate, endDate, limit), [startDate, endDate, limit]);
}
export function useProfitAnalysis(startDate: string, endDate: string) {
  return useApi(() => reportsApi.profit(startDate, endDate), [startDate, endDate]);
}
export function useSalesByDay(startDate: string, endDate: string) {
  return useApi(() => reportsApi.salesByDay(startDate, endDate), [startDate, endDate]);
}
export function useInventoryValuation() {
  return useApi(() => reportsApi.inventoryValuation(), []);
}

// ========================================
// HOOKS: Accounting (Comptabilité)
// ========================================
export function useExpenses(startDate?: string, endDate?: string, category?: string) {
  return useApi(() => accountingApi.expenses(startDate, endDate, category), [startDate, endDate, category]);
}
export function useProfitLoss(startDate: string, endDate: string) {
  return useApi(() => accountingApi.profitLoss(startDate, endDate), [startDate, endDate]);
}
export function useMonthlySummary(year: number) {
  return useApi(() => accountingApi.monthlySummary(year), [year]);
}
export function useExpenseBreakdown(startDate: string, endDate: string) {
  return useApi(() => accountingApi.expenseBreakdown(startDate, endDate), [startDate, endDate]);
}
export function useCreateExpense() {
  const [creating, setCreating] = useState(false);
  const create = async (data: Parameters<typeof accountingApi.createExpense>[0]) => {
    setCreating(true);
    try { return await accountingApi.createExpense(data); }
    finally { setCreating(false); }
  };
  return { create, creating };
}

// ========================================
// HOOKS: AI (Intelligence Artificielle)
// ========================================
export function useStockForecast() {
  return useApi(() => aiApi.stockForecast(), []);
}
export function useAiRecommendations() {
  return useApi(() => aiApi.recommendations(), []);
}
export function useSalesInsights() {
  return useApi(() => aiApi.salesInsights(), []);
}
export function useMarkdownSuggestions() {
  return useApi(() => aiApi.markdownSuggestions(), []);
}

// ========================================
// INVOICES (FACTURES A4)
// ========================================
export function useInvoices(status?: string) {
  return useApi(() => invoicesApi.list(status), [status]);
}

export function useInvoiceStats() {
  return useApi(() => invoicesApi.stats(), []);
}

export function useCreateInvoice() {
  const [creating, setCreating] = useState(false);
  const create = async (data: Parameters<typeof invoicesApi.create>[0]) => {
    setCreating(true);
    try {
      return await invoicesApi.create(data);
    } catch (e) {
      console.error("Create invoice failed:", e);
      return null;
    } finally {
      setCreating(false);
    }
  };
  return { create, creating };
}

export function useUpdateInvoiceStatus() {
  const [updating, setUpdating] = useState(false);
  const update = async (id: string, status: string, paymentMethod?: string) => {
    setUpdating(true);
    try {
      return await invoicesApi.updateStatus(id, status, paymentMethod);
    } catch (e) {
      console.error("Update invoice status failed:", e);
      return null;
    } finally {
      setUpdating(false);
    }
  };
  return { update, updating };
}

export function useAddPayment() {
  const [adding, setAdding] = useState(false);
  const addPayment = async (invoiceId: string, data: { amount: number; method: string; note?: string }) => {
    setAdding(true);
    try {
      return await invoicesApi.addPayment(invoiceId, data);
    } catch (e) {
      console.error("Add payment failed:", e);
      return null;
    } finally {
      setAdding(false);
    }
  };
  return { addPayment, adding };
}

// ========================================
// HOOKS: Notifications (polling 5 min)
// ========================================
export function useNotifications(pollIntervalMs: number = 5 * 60 * 1000) {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [summary, setSummary] = useState<ApiNotificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await notificationsApi.list();
      setNotifications(data.items);
      setSummary(data.summary);
    } catch (e) {
      // Silencieux — les notifs sont non-critiques
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, pollIntervalMs);
    return () => clearInterval(interval);
  }, [load, pollIntervalMs]);

  return {
    notifications,
    summary,
    loading,
    lastChecked,
    reload: load,
    unreadCount: summary?.total || 0,
    criticalCount: summary?.critical || 0,
  };
}
