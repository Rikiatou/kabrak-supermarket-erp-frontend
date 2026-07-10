// Client API pour connecter le frontend Next.js au backend NestJS
// Backend: http://localhost:3000/api

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Helper pour les requêtes
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  // Récupérer le token d'auth depuis localStorage
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("kabrak_auth_token");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  // Ajouter le token d'auth si disponible
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Erreur API" }));
    throw new Error(error.message || `Erreur ${res.status}`);
  }

  return res.json();
}

// ========================================
// TYPES (alignés avec le backend Prisma)
// ========================================
export interface ApiProduct {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description?: string;
  category: string;
  subCategory?: string;
  brand?: string;
  price: number;
  costPrice: number;
  wholesalePrice?: number | null;
  packQuantity?: number | null;
  packBarcode?: string | null;
  taxRate: number;
  markdownPrice?: number | null;
  markdownReason?: string | null;
  markdownNote?: string | null;
  markdownStartsAt?: string | null;
  markdownExpiresAt?: string | null;
  stock: number;
  minStock: number;
  unit: string;
  expiryDate?: string;
  supplierId?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  supplier?: ApiSupplier;
}

export interface ApiSupplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email?: string;
  address?: string;
  paymentTerms: string;
  rating: number;
  isActive: boolean;
  _count?: { products: number; purchaseOrders: number };
}

export interface ApiEmployee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  phone: string;
  email?: string;
  hireDate: string;
  status: string;
  pin?: string;
}

export interface ApiCashRegister {
  id: string;
  name: string;
  code: string;
  status: string;
  openingCash: number;
  currentCash: number;
  location?: string;
  isActive: boolean;
}

export interface ApiTransactionItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
  product?: ApiProduct;
}

export interface ApiTransaction {
  id: string;
  transactionNumber: string;
  date: string;
  cashierId: string;
  registerId?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  cashGiven?: number;
  change?: number;
  customerId?: string;
  status: string;
  syncStatus: string;
  syncedAt?: string;
  items: ApiTransactionItem[];
  cashier?: ApiEmployee;
  customer?: ApiCustomer;
}

export interface ApiCustomer {
  id: string;
  customerNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  points: number;
  totalSpent: number;
  visits?: number;
  tier?: string;
  createdAt?: string;
}

export interface ApiStockMovement {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  reason?: string;
  reference?: string;
  notes?: string;
  createdBy?: string;
  employee?: { id: string; firstName: string; lastName: string; role?: string };
  syncStatus: string;
  createdAt: string;
  product?: ApiProduct;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ========================================
// API AUTH
// ========================================
export interface ApiAuthUser {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
}

export interface ApiCashier {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
}

export const authApi = {
  // Login
  login: (employeeNumber: string, pin: string) =>
    fetchAPI<{ user: ApiAuthUser; token: string }>(`/auth/login`, {
      method: "POST",
      body: JSON.stringify({ employeeNumber, pin }),
    }),

  // Lister les caissiers
  listCashiers: () => fetchAPI<ApiCashier[]>(`/auth/cashiers`),
};

// ========================================
// API PRODUCTS
// ========================================
export const productsApi = {
  // Liste paginée
  list: (page = 1, limit = 100) =>
    fetchAPI<PaginatedResponse<ApiProduct>>(
      `/products?page=${page}&limit=${limit}`
    ),

  // Catégories
  categories: () =>
    fetchAPI<Array<{ id: string; name: string }>>(`/products/categories`),

  // Recherche
  search: (params: { q?: string; category?: string; stockStatus?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.category) query.set("category", params.category);
    if (params.stockStatus) query.set("stockStatus", params.stockStatus);
    query.set("page", String(params.page || 1));
    query.set("limit", String(params.limit || 100));
    return fetchAPI<PaginatedResponse<ApiProduct>>(`/products/search?${query}`);
  },

  // Scan code-barres (caisse)
  findByBarcode: (barcode: string) =>
    fetchAPI<ApiProduct>(`/products/barcode/${barcode}`),

  // Détail
  get: (id: string) => fetchAPI<ApiProduct>(`/products/${id}`),

  // Créer
  create: (data: Partial<ApiProduct>) =>
    fetchAPI<ApiProduct>(`/products`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Modifier
  update: (id: string, data: Partial<ApiProduct>) =>
    fetchAPI<ApiProduct>(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Supprimer (soft)
  delete: (id: string) =>
    fetchAPI<ApiProduct>(`/products/${id}`, { method: "DELETE" }),

  // Statistiques
  stats: () => fetchAPI<{ total: number; lowStock: number; expiring: number; outOfStock: number; healthy: number }>(`/products/stats`),

  // Alertes
  alerts: () => fetchAPI<ApiProduct[]>(`/products/alerts`),

  // Import CSV
  importCsv: (csv: string) =>
    fetchAPI<{ total: number; success: number; errors: number; duration: number }>(
      `/import/products`,
      { method: "POST", body: JSON.stringify({ csv }) }
    ),

  // Markdown / Promotions
  setMarkdown: (id: string, data: { markdownPrice: number; markdownReason: string; markdownNote?: string; markdownExpiresAt?: string }) =>
    fetchAPI<ApiProduct>(`/products/${id}/markdown`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  removeMarkdown: (id: string) =>
    fetchAPI<ApiProduct>(`/products/${id}/markdown`, { method: "DELETE" }),

  getMarkdowns: (page = 1, limit = 50) =>
    fetchAPI<{ data: ApiProduct[]; meta: { total: number; page: number; limit: number; totalPages: number }; summary: { count: number; totalPotentialLoss: number } }>(
      `/products/markdowns?page=${page}&limit=${limit}`
    ),

  cleanupExpiredMarkdowns: () =>
    fetchAPI<{ cleaned: number; products: Array<{ id: string; name: string; restoredPrice: number; wasMarkdownPrice: number }> }>(
      `/products/markdowns/cleanup`,
      { method: "POST" }
    ),
};

// ========================================
// API TRANSACTIONS (VENTES)
// ========================================
export const transactionsApi = {
  // Créer une vente
  create: (data: {
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
  }) =>
    fetchAPI<ApiTransaction>(`/transactions`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Historique
  list: (page = 1, limit = 50, cashierId?: string, startDate?: string, endDate?: string) => {
    const query = new URLSearchParams();
    query.set("page", String(page));
    query.set("limit", String(limit));
    if (cashierId) query.set("cashierId", cashierId);
    if (startDate) query.set("startDate", startDate);
    if (endDate) query.set("endDate", endDate);
    return fetchAPI<PaginatedResponse<ApiTransaction>>(`/transactions?${query}`);
  },

  // Détail
  get: (id: string) => fetchAPI<ApiTransaction>(`/transactions/${id}`),

  // Stats du jour
  todayStats: () =>
    fetchAPI<{ transactions: number; revenue: number; itemsSold: number; avgBasket: number }>(
      `/transactions/stats/today`
    ),

  // Stats d'hier (comparaison)
  yesterdayStats: () =>
    fetchAPI<{ transactions: number; revenue: number; itemsSold: number; avgBasket: number }>(
      `/transactions/stats/yesterday`
    ),

  // Tendance 7 jours
  weekTrend: () =>
    fetchAPI<Array<{ date: string; label: string; revenue: number; transactions: number }>>(
      `/transactions/stats/week-trend`
    ),

  // Ventes par caisse
  salesByRegister: () =>
    fetchAPI<Array<{ id: string; name: string; code: string; status: string; transactionsCount: number; revenue: number }>>(
      `/transactions/stats/by-register`
    ),

  // Ventes par heure (graphique dashboard)
  salesByHour: () =>
    fetchAPI<Array<{ hour: string; revenue: number; transactions: number }>>(
      `/transactions/stats/by-hour`
    ),

  // Marge par catégorie (graphique dashboard)
  marginByCategory: () =>
    fetchAPI<Array<{ category: string; revenue: number; margin: number; marginRate: number }>>(
      `/transactions/stats/margin-by-category`
    ),

  // Objectif mensuel (dashboard)
  monthlyGoal: () =>
    fetchAPI<{ current: number; goal: number; progress: number; transactions: number; remaining: number }>(
      `/transactions/stats/monthly-goal`
    ),

  // Top produits vendus (dashboard)
  topProducts: (limit?: number) =>
    fetchAPI<Array<{ productId: string; productName: string; sku: string; quantity: number; revenue: number }>>(
      `/transactions/stats/top-products${limit ? `?limit=${limit}` : ""}`
    ),

  // Panier moyen (dashboard)
  averageBasket: () =>
    fetchAPI<{ average: number; total: number; transactions: number }>(
      `/transactions/stats/average-basket`
    ),

  // Rembourser
  refund: (id: string, reason: string) =>
    fetchAPI<ApiTransaction>(`/transactions/${id}/refund`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};

// ========================================
// API STOCK
// ========================================
export const stockApi = {
  // Mouvements
  listMovements: (page = 1, limit = 50, productId?: string) => {
    const query = new URLSearchParams();
    query.set("page", String(page));
    query.set("limit", String(limit));
    if (productId) query.set("productId", productId);
    return fetchAPI<PaginatedResponse<ApiStockMovement>>(`/stock/movements?${query}`);
  },

  // Créer mouvement
  createMovement: (data: {
    productId: string;
    type: string;
    quantity: number;
    reason?: string;
    reference?: string;
    notes?: string;
    createdBy?: string;
  }) =>
    fetchAPI<ApiStockMovement>(`/stock/movements`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Alertes
  alerts: () =>
    fetchAPI<{
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
    }>(`/stock/alerts`),

  // Valeur du stock
  value: () =>
    fetchAPI<{
      totalProducts: number;
      totalUnits: number;
      totalCostValue: number;
      totalSaleValue: number;
      potentialMargin: number;
    }>(`/stock/value`),

  // Ajustement inventaire
  adjust: (productId: string, newStock: number, reason: string, createdBy?: string) =>
    fetchAPI<ApiStockMovement>(`/stock/adjust/${productId}`, {
      method: "POST",
      body: JSON.stringify({ newStock, reason, createdBy }),
    }),
};

// ========================================
// API SYNC
// ========================================
export const syncApi = {
  status: () =>
    fetchAPI<{
      enabled: boolean;
      online: boolean;
      cloudApiUrl: string;
      pending: { transactions: number; stockMovements: number; total: number };
      failed: number;
      lastSync: string;
    }>(`/sync/status`),

  force: () => fetchAPI<{ transactions: number; stockMovements: number; errors: string[] }>(`/sync/force`, { method: "POST" }),
};

// ========================================
// API SUPPLIERS (FOURNISSEURS)
// ========================================
export const suppliersApi = {
  list: () => fetchAPI<ApiSupplier[]>(`/suppliers`),
  get: (id: string) => fetchAPI<ApiSupplier & { products: any[]; purchaseOrders: any[] }>(`/suppliers/${id}`),
  create: (data: any) =>
    fetchAPI<ApiSupplier>(`/suppliers`, { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    fetchAPI<ApiSupplier>(`/suppliers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

// ========================================
// API EMPLOYEES (EMPLOYÉS)
// ========================================
export const employeesApi = {
  list: () => fetchAPI<ApiEmployee[]>(`/employees`),
  get: (id: string) => fetchAPI<ApiEmployee & { transactions: any[]; shifts: any[] }>(`/employees/${id}`),
  stats: () =>
    fetchAPI<{ total: number; active: number; onLeave: number; byRole: Array<{ role: string; _count: number }> }>(
      `/employees/stats`
    ),
  create: (data: any) =>
    fetchAPI<ApiEmployee>(`/employees`, { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    fetchAPI<ApiEmployee>(`/employees/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetchAPI<ApiEmployee>(`/employees/${id}`, { method: "DELETE" }),
};

// ========================================
// API PURCHASE ORDERS (BONS DE COMMANDE)
// ========================================
export interface ApiPurchaseOrderItem {
  id: string;
  productId: string;
  product?: ApiProduct;
  quantity: number;
  unitCost: number;
  total: number;
  receivedQuantity?: number;
}

export interface ApiPurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplier?: ApiSupplier;
  date: string;
  expectedDate: string;
  receivedDate?: string;
  total: number;
  status: string;
  notes?: string;
  items?: ApiPurchaseOrderItem[];
  createdAt: string;
}

export const purchaseOrdersApi = {
  list: async (status?: string): Promise<ApiPurchaseOrder[]> => {
    const res = await fetchAPI<{ data: ApiPurchaseOrder[]; total: number; page: number; limit: number; totalPages: number }>(
      `/purchase-orders?limit=1000${status ? `&status=${status}` : ""}`
    );
    return Array.isArray(res) ? res : (res?.data ?? []);
  },
  get: (id: string) => fetchAPI<ApiPurchaseOrder>(`/purchase-orders/${id}`),
  create: (data: { supplierId: string; expectedDate: string; notes?: string; items: Array<{ productId: string; quantity: number; unitCost: number }> }) =>
    fetchAPI<ApiPurchaseOrder>(`/purchase-orders`, { method: "POST", body: JSON.stringify(data) }),
  createDirect: (data: {
    supplierId: string;
    expectedDate: string;
    invoiceNumber?: string;
    notes?: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitCost: number;
      sellPrice?: number;
      expiryDate?: string;
    }>;
  }) =>
    fetchAPI<ApiPurchaseOrder>(`/purchase-orders/direct`, { method: "POST", body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string) =>
    fetchAPI<ApiPurchaseOrder>(`/purchase-orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};

// ========================================
// API SHIFTS (CAISSES)
// ========================================
export interface ApiShift {
  id: string;
  registerId: string;
  employeeId: string;
  employee?: ApiEmployee;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  difference?: number;
  status: string;
  notes?: string;
}

export interface ApiZReport {
  shiftId: string;
  registerId: string;
  registerName: string;
  employeeId: string;
  employeeName: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  difference: number | null;
  notes: string | null;
  grossSales: number;
  returnsAndCredits: number;
  totalDiscount: number;
  totalTax: number;
  netSales: number;
  nonTaxableSales: number;
  invoicePayments?: { cash: number; card: number; mobile: number; total: number };
  receiptsByMethod: { cash: number; card: number; mobile: number; orange: number; split: number };
  totalReceipts: number;
  changeGiven: number;
  cashReceived: number;
  cashDrawerTotal: number;
  totalExpected: number;
  customerCount: number;
  averageSale: number;
  transactions: Array<{ id: string; transactionNumber: string; date: string; total: number; paymentMethod: string }>;
}

export const shiftsApi = {
  list: () => fetchAPI<ApiShift[]>(`/shifts`),
  active: () => fetchAPI<ApiShift[]>(`/shifts/active`),
  open: (data: { registerId: string; employeeId: string; openingCash: number; employeeName?: string; registerName?: string }) =>
    fetchAPI<ApiShift>(`/shifts/open`, { method: "POST", body: JSON.stringify(data) }),
  close: (id: string, data: { closingCash: number; expectedCash: number; notes?: string }) =>
    fetchAPI<ApiShift>(`/shifts/${id}/close`, { method: "POST", body: JSON.stringify(data) }),
  byEmployee: (employeeId: string) => fetchAPI<ApiShift[]>(`/shifts/employee/${employeeId}`),
  zReport: (shiftId: string) => fetchAPI<ApiZReport>(`/shifts/${shiftId}/z-report`),
  dailyZReport: (employeeId: string, date: string) =>
    fetchAPI<ApiZReport>(`/shifts/daily-z-report?employeeId=${employeeId}&date=${date}`),
};

// ========================================
// API SCHEDULES (PLANNING CAISSES)
// ========================================
export interface ApiSchedule {
  id: string;
  employeeId: string;
  registerId: string;
  dayOfWeek: number; // 0=dimanche, 1=lundi, ..., 6=samedi
  startTime: string; // "08:00"
  endTime: string; // "17:00"
  breakStart?: string | null;
  breakEnd?: string | null;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: ApiEmployee;
  register?: ApiCashRegister;
}

export const schedulesApi = {
  list: () => fetchAPI<{ all: ApiSchedule[]; byDay: Record<number, ApiSchedule[]>; total: number }>(`/schedules`),
  registers: () => fetchAPI<Array<{ id: string; name: string; code: string; isActive: boolean }>>(`/schedules/registers`),
  today: () => fetchAPI<{ dayOfWeek: number; currentTime: string; active: ApiSchedule[] }>(`/schedules/today`),
  byEmployee: (employeeId: string) => fetchAPI<ApiSchedule[]>(`/schedules/employee/${employeeId}`),
  byRegister: (registerId: string) => fetchAPI<ApiSchedule[]>(`/schedules/register/${registerId}`),
  create: (data: { employeeId: string; registerId: string; dayOfWeek: number; startTime: string; endTime: string; breakStart?: string; breakEnd?: string; notes?: string }) =>
    fetchAPI<ApiSchedule>(`/schedules`, { method: "POST", body: JSON.stringify(data) }),
  duplicate: (id: string, targetDayOfWeek: number) =>
    fetchAPI<ApiSchedule>(`/schedules/${id}/duplicate`, { method: "POST", body: JSON.stringify({ targetDayOfWeek }) }),
  update: (id: string, data: Partial<{ startTime: string; endTime: string; breakStart: string; breakEnd: string; isActive: boolean; notes: string }>) =>
    fetchAPI<ApiSchedule>(`/schedules/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: string) => fetchAPI<{ id: string }>(`/schedules/${id}`, { method: "DELETE" }),
};

// ========================================
// API CUSTOMERS (CLIENTS FIDÉLITÉ)
// ========================================
// Note: ApiCustomer is already defined above in the TYPES section.
export interface ApiLoyaltyHistory {
  id: string;
  customerId: string;
  points: number;
  type: string;
  description: string;
  createdAt: string;
}

export const customersApi = {
  list: async (search?: string): Promise<ApiCustomer[]> => {
    const res = await fetchAPI<{ data: ApiCustomer[]; total: number; page: number; limit: number; totalPages: number }>(
      `/customers?limit=1000${search ? `&search=${search}` : ""}`
    );
    return Array.isArray(res) ? res : (res?.data ?? []);
  },
  get: (id: string) => fetchAPI<ApiCustomer & { loyaltyHistory: ApiLoyaltyHistory[] }>(`/customers/${id}`),
  stats: () => fetchAPI<{ total: number; totalPoints: number; totalRedeemed: number }>(`/customers/stats`),
  create: (data: { firstName: string; lastName: string; phone: string; email?: string }) =>
    fetchAPI<ApiCustomer>(`/customers`, { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    fetchAPI<ApiCustomer>(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  redeem: (id: string, points: number) =>
    fetchAPI<ApiCustomer>(`/customers/${id}/redeem`, { method: "POST", body: JSON.stringify({ points }) }),
};

// ========================================
// API REPORTS (RAPPORTS)
// ========================================
export const reportsApi = {
  sales: (startDate: string, endDate: string) =>
    fetchAPI<{ totalRevenue: number; transactionCount: number; transactionsCount: number; totalSubtotal?: number; totalDiscount?: number; totalTax?: number; avgBasket: number; byDay: Array<{ date: string; revenue: number; transactions: number }>; transactions?: any[]; byProduct?: any[] }>(`/reports/sales?startDate=${startDate}&endDate=${endDate}`),
  salesByCategory: (startDate: string, endDate: string) =>
    fetchAPI<Array<{ category: string; revenue: number; quantity: number }>>(`/reports/sales/by-category?startDate=${startDate}&endDate=${endDate}`),
  salesByEmployee: (startDate: string, endDate: string) =>
    fetchAPI<Array<{ cashierId: string; employeeId?: string; firstName?: string; lastName?: string; employeeName?: string; employeeNumber?: string; revenue: number; transactions: number }>>(`/reports/sales/by-employee?startDate=${startDate}&endDate=${endDate}`),
  topProducts: (startDate: string, endDate: string, limit?: number) =>
    fetchAPI<Array<{ productId: string; name: string; quantity: number; revenue: number }>>(`/reports/products/top?startDate=${startDate}&endDate=${endDate}${limit ? `&limit=${limit}` : ""}`),
  worstProducts: (startDate: string, endDate: string, limit?: number) =>
    fetchAPI<Array<{ productId: string; name: string; quantity: number; revenue: number }>>(`/reports/products/worst?startDate=${startDate}&endDate=${endDate}${limit ? `&limit=${limit}` : ""}`),
  profit: (startDate: string, endDate: string) =>
    fetchAPI<{ totalRevenue: number; totalCost: number; grossProfit: number; marginRate: number }>(`/reports/profit?startDate=${startDate}&endDate=${endDate}`),
  salesByDay: (startDate: string, endDate: string) =>
    fetchAPI<Array<{ date: string; revenue: number; transactions: number; avgBasket: number }>>(`/reports/sales/by-day?startDate=${startDate}&endDate=${endDate}`),
  salesByMonth: (year: number) =>
    fetchAPI<Array<{ month: number; revenue: number; transactions: number }>>(`/reports/sales/by-month?year=${year}`),
  inventoryValuation: () =>
    fetchAPI<{ totalCostValue: number; totalSaleValue: number; potentialMargin: number; productCount: number }>(`/reports/inventory/valuation`),
  discounts: (startDate: string, endDate: string) =>
    fetchAPI<{
      totalDiscount: number;
      transactionsCount: number;
      transactions: Array<{
        id: string;
        transactionNumber: string;
        date: string;
        cashierName: string;
        subtotal: number;
        discount: number;
        total: number;
        items: Array<{ productName: string; sku: string; quantity: number; discount: number }>;
      }>;
      byProduct: Array<{ productName: string; sku: string; totalDiscount: number; occurrences: number }>;
    }>(`/reports/discounts?startDate=${startDate}&endDate=${endDate}`),
};

// ========================================
// API RETURNS (RETOURS PRODUITS)
// ========================================
export interface ApiReturn {
  id: string;
  licenseKey?: string;
  originalTransactionId?: string;
  originalInvoiceId?: string;
  clientName?: string;
  returnDate: string;
  reason: string;
  resolution: string;
  totalRefunded: number;
  refundMethod?: string;
  status: string;
  note?: string;
  createdBy?: string;
  items?: ApiReturnItem[];
}

export interface ApiReturnItem {
  id: string;
  returnId: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  exchangeProductId?: string;
  exchangeProductName?: string;
  exchangeTotal?: number;
}

export const returnsApi = {
  list: () => fetchAPI<ApiReturn[]>(`/returns`),
  create: (data: {
    originalTransactionId?: string;
    originalInvoiceId?: string;
    clientName?: string;
    reason: string;
    resolution: string;
    note?: string;
    refundMethod?: string;
    items: Array<{
      productId?: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      total: number;
      exchangeProductId?: string;
      exchangeProductName?: string;
      exchangeTotal?: number;
    }>;
  }) =>
    fetchAPI<ApiReturn>(`/returns`, { method: "POST", body: JSON.stringify(data) }),
  stats: () => fetchAPI<{ total: number; totalAmount: number; byReason: Record<string, number> }>(`/returns/stats`),
};

// ========================================
// API BATCHES (LOTS DE STOCK / PÉREMPTION)
// ========================================
export const batchesApi = {
  list: (productId?: string) =>
    fetchAPI<any[]>(`/batches${productId ? `?productId=${productId}` : ""}`),
  create: (data: { productId: string; quantity: number; expiryDate?: string; costPrice?: number; sellPrice?: number }) =>
    fetchAPI<any>(`/batches`, { method: "POST", body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetchAPI<any>(`/batches/${id}`, { method: "DELETE" }),
};

// ========================================
// API ACCOUNTING (COMPTABILITÉ)
// ========================================
export interface ApiExpense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  supplier?: string;
  status: string;
}

export interface ApiRevenue {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
}

export const accountingApi = {
  expenses: (startDate?: string, endDate?: string, category?: string) =>
    fetchAPI<ApiExpense[]>(`/accounting/expenses?${startDate ? `startDate=${startDate}&` : ""}${endDate ? `endDate=${endDate}&` : ""}${category ? `category=${category}` : ""}`),
  createExpense: (data: { category: string; description: string; amount: number; paymentMethod?: string; supplier?: string }) =>
    fetchAPI<ApiExpense>(`/accounting/expenses`, { method: "POST", body: JSON.stringify(data) }),
  revenues: (startDate?: string, endDate?: string, category?: string) =>
    fetchAPI<ApiRevenue[]>(`/accounting/revenues?${startDate ? `startDate=${startDate}&` : ""}${endDate ? `endDate=${endDate}&` : ""}${category ? `category=${category}` : ""}`),
  createRevenue: (data: { category: string; description: string; amount: number }) =>
    fetchAPI<ApiRevenue>(`/accounting/revenues`, { method: "POST", body: JSON.stringify(data) }),
  profitLoss: (startDate: string, endDate: string) =>
    fetchAPI<{ totalRevenue: number; totalExpenses: number; netProfit: number; expenseBreakdown: Array<{ category: string; amount: number }> }>(`/accounting/profit-loss?startDate=${startDate}&endDate=${endDate}`),
  monthlySummary: (year: number) =>
    fetchAPI<Array<{ month: number; revenue: number; expenses: number; profit: number }>>(`/accounting/monthly-summary?year=${year}`),
  expenseBreakdown: (startDate: string, endDate: string) =>
    fetchAPI<Array<{ category: string; amount: number; percentage: number }>>(`/accounting/expense-breakdown?startDate=${startDate}&endDate=${endDate}`),
};

// ========================================
// API AI (INTELLIGENCE ARTIFICIELLE)
// ========================================
export interface ApiStockForecast {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  costPrice: number;
  price: number;
  sold30Days: number;
  dailyVelocity: number;
  daysUntilOut: number | null;
  recommendedOrder: number;
  urgency: 'critical' | 'warning' | 'ok' | 'overstock';
}

export interface AiRecommendation {
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  productId?: string;
  action?: string;
}

export interface ApiMarkdownSuggestion {
  productId: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  price: number;
  costPrice: number;
  unit: string;
  expiryDate: string | null;
  daysToExpiry: number | null;
  sold30Days: number;
  dailyVelocity: number;
  reason: 'expiry' | 'near_expiry' | 'clearance';
  markdownPercent: number;
  suggestedMarkdownPrice: number;
  potentialLoss: number;
  priority: 'critical' | 'high' | 'medium';
}

export const aiApi = {
  stockForecast: () => fetchAPI<{ summary: { total: number; critical: number; warning: number; overstock: number; recommendedOrdersValue: number }; forecasts: ApiStockForecast[] }>(`/ai/stock-forecast`),
  recommendations: () => fetchAPI<AiRecommendation[]>(`/ai/recommendations`),
  salesInsights: () => fetchAPI<{ weeklyRevenue: number; weeklyTransactions: number; avgBasket: number; topProducts: any[] }>(`/ai/sales-insights`),
  markdownSuggestions: () => fetchAPI<{ summary: { total: number; critical: number; high: number; medium: number; totalPotentialLoss: number }; suggestions: ApiMarkdownSuggestion[] }>(`/ai/markdown-suggestions`),
};

// ========================================
// API INVOICES (FACTURES A4)
// ========================================
export interface ApiInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  productId?: string;
}

export interface ApiInvoice {
  id: string;
  number: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientAddress?: string;
  customerId?: string;
  date: string;
  dueDate?: string;
  subtotal: number;
  discount: number;
  taxRate: number;
  tax: number;
  total: number;
  paidAmount: number;
  balance: number;
  status: string;
  paidAt?: string;
  paymentMethod?: string;
  notes?: string;
  items?: ApiInvoiceItem[];
  payments?: ApiInvoicePayment[];
  createdAt: string;
}

export interface ApiInvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  date: string;
  note?: string;
}

export const invoicesApi = {
  list: (status?: string) =>
    fetchAPI<{ invoices: ApiInvoice[]; total: number }>(`/invoices${status ? `?status=${status}` : ""}`),
  get: (id: string) => fetchAPI<ApiInvoice>(`/invoices/${id}`),
  stats: () => fetchAPI<{ total: number; paid: number; partial: number; pending: number; overdue: number; totalPaidAmount: number; totalOutstanding: number }>(`/invoices/stats`),
  unpaidStats: () => fetchAPI<{ totalUnpaid: number; count: number; partial: { amount: number; count: number }; overdue: { amount: number; count: number } }>(`/invoices/stats/unpaid`),
  create: (data: {
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
    clientAddress?: string;
    customerId?: string;
    dueDate?: string;
    notes?: string;
    discount?: number;
    items: Array<{ description: string; quantity: number; unitPrice: number; productId?: string }>;
  }) => fetchAPI<ApiInvoice>(`/invoices`, { method: "POST", body: JSON.stringify(data) }),
  addPayment: (id: string, data: { amount: number; method: string; note?: string }) =>
    fetchAPI<{ payment: ApiInvoicePayment; invoice: ApiInvoice }>(`/invoices/${id}/payments`, { method: "POST", body: JSON.stringify(data) }),
  getPayments: (id: string) => fetchAPI<ApiInvoice & { payments: ApiInvoicePayment[] }>(`/invoices/${id}/payments`),
  updateStatus: (id: string, status: string, paymentMethod?: string) =>
    fetchAPI<ApiInvoice>(`/invoices/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, paymentMethod }) }),
  remove: (id: string) => fetchAPI<{ id: string }>(`/invoices/${id}`, { method: "DELETE" }),
};

// ========================================
// API NOTIFICATIONS
// ========================================
export interface ApiNotification {
  id: string;
  type: 'stockout' | 'near_expiry' | 'expired' | 'cash_diff' | 'revenue_goal' | 'invoice_overdue' | 'markdown_suggestion';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  productId?: string;
  shiftId?: string;
  invoiceId?: string;
  action?: string;
  actionUrl?: string;
  createdAt: string;
}

export interface ApiNotificationSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  revenue: number;
  revenueGoal: number;
  revenueProgress: number;
}

export const notificationsApi = {
  list: () => fetchAPI<{ summary: ApiNotificationSummary; items: ApiNotification[] }>(`/notifications`),
};

// ========================================
// HELPERS
// ========================================

// Convertir un produit API en produit frontend
export function apiProductToFrontend(p: ApiProduct): Product {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    price: p.price,
    costPrice: p.costPrice,
    wholesalePrice: p.wholesalePrice,
    packQuantity: p.packQuantity,
    packBarcode: p.packBarcode,
    markdownPrice: p.markdownPrice,
    markdownReason: p.markdownReason,
    markdownNote: p.markdownNote,
    markdownExpiresAt: p.markdownExpiresAt,
    stock: p.stock,
    minStock: p.minStock,
    unit: p.unit,
    barcode: p.barcode,
    expiryDate: p.expiryDate,
    supplier: p.supplier?.name,
    imageUrl: p.imageUrl,
  };
}

// Prix effectif d'un produit (markdown si actif, sinon prix normal)
export function getEffectivePrice(p: Pick<Product, "price" | "markdownPrice" | "markdownExpiresAt">): number {
  if (p.markdownPrice != null && p.markdownPrice > 0) {
    // Vérifier si le markdown n'a pas expiré
    if (p.markdownExpiresAt && new Date(p.markdownExpiresAt) < new Date()) {
      return p.price; // Markdown expiré → prix normal
    }
    return p.markdownPrice;
  }
  return p.price;
}

// Vérifier si un produit a un markdown actif
export function hasActiveMarkdown(p: Pick<Product, "markdownPrice" | "markdownExpiresAt">): boolean {
  if (p.markdownPrice == null || p.markdownPrice <= 0) return false;
  if (p.markdownExpiresAt && new Date(p.markdownExpiresAt) < new Date()) return false;
  return true;
}

// Calculer les jours avant expiration
export function daysToExpiry(expiryDate?: string): number | null {
  if (!expiryDate) return null;
  const diff = new Date(expiryDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Importer les types frontend
import type { Product } from "./types";
