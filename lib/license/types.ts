// ========================================
// TYPES LICENCE — KABRAK ERP
// ========================================

// 2 offres seulement:
// - STANDARD: 1 magasin, 300 000 FCFA/an (ou 165 000 / 6 mois)
// - MULTI_STORE: X magasins, sur devis
export type LicenseType = "STANDARD" | "MULTI_STORE";
export type LicenseStatus = "ACTIVE" | "EXPIRED" | "SUSPENDED" | "CANCELLED";

export interface LicenseData {
  licenseKey: string;
  clientName: string;
  type: LicenseType;
  maxStores: number;
  modules: string[];
  issuedAt: string;
  expiresAt: string;
  daysRemaining: number;
  status: LicenseStatus;
}

export interface ClientConfig {
  id?: string;
  licenseId?: string;
  supermarketName: string;
  supermarketSlogan?: string;
  logoUrl?: string;
  primaryColor: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  receiptShowLogo: boolean;
  invoiceFooter?: string;
  currency: string;
  taxRate: number;
  enableLoyalty: boolean;
  enableAutoPrint: boolean;
}

export interface Store {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  city?: string;
  isActive: boolean;
}

export interface LicenseValidationResponse {
  valid: boolean;
  license: LicenseData;
  config: ClientConfig | null;
  stores: Store[];
}

// ========================================
// MODULES INCLUS (toutes les licences)
// ========================================
export const ALL_MODULES = [
  "pos",
  "inventory",
  "purchases",
  "suppliers",
  "customers",
  "loyalty",
  "reports",
  "dashboard",
  "invoices",
  "employees",
  "cashiers",
  "schedules",
  "scanner",
  "losses",
  "accounting",
  "ai",
  "import",
  "notifications",
  "offline_sync",
  "cloud_backup",
] as const;

// Vérifier si un module est disponible (toutes les licences ont tous les modules)
export function hasModule(license: LicenseData | null, moduleName: string): boolean {
  // Toutes les licences incluent tous les modules
  // La seule différence: STANDARD = 1 magasin, MULTI_STORE = X magasins
  if (!license) return false;
  return license.modules.includes(moduleName) || ALL_MODULES.includes(moduleName as any);
}

// ========================================
// PRICING (pour affichage public)
// ========================================
export const PRICING = {
  STANDARD: {
    name: "KABRAK ERP Standard",
    monthly: 25000, // FCFA
    yearly: 300000, // FCFA
    sixMonths: 165000, // FCFA
    monthlySix: 27500, // FCFA
    description: "Tout inclus pour 1 magasin",
    maxStores: 1,
    features: [
      "POS / Ventes",
      "Multi-caissiers",
      "Gestion stock",
      "Achats & Fournisseurs",
      "Réceptions marchandises automatiques",
      "Historique complet des produits",
      "Historique des ventes",
      "Remises avec traçabilité",
      "Rapports ventes & stock",
      "Gestion utilisateurs (Boss, Compta, Caisseur, Stock)",
      "Sauvegardes automatiques",
      "Fonctionnement hors ligne + sync",
      "Support email",
      "Mises à jour incluses",
    ],
  },
  MULTI_STORE: {
    name: "KABRAK ERP Multi-Store",
    startingPrice: 600000, // FCFA/an
    description: "Sur devis — selon nombre de magasins",
    maxStores: -1, // illimité (sur devis)
    features: [
      "Tout Standard +",
      "Multi-magasins illimités",
      "Transferts inter-magasins",
      "Consolidation rapports",
      "Stock global par magasin",
      "Dashboard multi-sites",
      "Support prioritaire",
      "Visites sur site incluses",
      "Formation avancée",
    ],
  },
} as const;
