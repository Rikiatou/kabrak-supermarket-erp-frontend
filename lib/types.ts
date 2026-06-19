export type Module =
  | "dashboard"
  | "pos"
  | "stocks"
  | "achats"
  | "employes"
  | "comptabilite"
  | "rapports"
  | "ia";

export interface NavItem {
  id: Module;
  label: string;
  icon: string;
  badge?: number;
}

export interface KPI {
  id: string;
  label: string;
  value: number;
  previous: number;
  unit?: string;
  format: "currency" | "number" | "percent";
}

export interface StockAlert {
  id: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  category: string;
  severity: "critical" | "low" | "expiring";
  expiryDate?: string;
}

export interface SaleByHour {
  hour: string;
  revenue: number;
  transactions: number;
}

export interface MarginByCategory {
  category: string;
  revenue: number;
  margin: number;
  marginRate: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  barcode: string;
  expiryDate?: string;
  supplier?: string;
  imageUrl?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

export interface Transaction {
  id: string;
  date: string;
  cashier: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: "cash" | "card" | "mobile";
  status: "completed" | "refunded" | "pending";
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: "manager" | "cashier" | "stockist" | "supervisor";
  department: string;
  phone: string;
  email: string;
  hireDate: string;
  status: "active" | "on_leave" | "inactive";
  avatar?: string;
  hoursThisWeek?: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: string;
  rating: number;
  totalOrders: number;
  pendingOrders: number;
}

export interface PurchaseOrder {
  id: string;
  supplier: Supplier;
  date: string;
  expectedDate: string;
  items: { product: Product; quantity: number; unitCost: number }[];
  total: number;
  status: "draft" | "sent" | "received" | "cancelled";
}
