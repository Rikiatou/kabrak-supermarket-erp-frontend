// ========================================
// RBAC — Permissions par rôle
// ========================================

export type Role = "boss" | "manager" | "accountant" | "cashier" | "stockist";

// Routes accessibles par chaque rôle
// boss = tout, les autres = sous-ensemble
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  boss: [
    "/dashboard",
    "/pos",
    "/stocks",
    "/import",
    "/achats",
    "/factures",
    "/employes",
    "/caisses",
    "/planning",
    "/clients",
    "/pertes",
    "/cadeaux",
    "/scanner",
    "/comptabilite",
    "/rapports",
    "/ia",
    "/historique",
    "/settings",
    "/guide",
  ],
  // Manager: same as boss minus /settings (cannot touch license/store config)
  manager: [
    "/dashboard",
    "/pos",
    "/stocks",
    "/import",
    "/achats",
    "/factures",
    "/employes",
    "/caisses",
    "/planning",
    "/clients",
    "/pertes",
    "/cadeaux",
    "/scanner",
    "/comptabilite",
    "/rapports",
    "/ia",
    "/historique",
    "/guide",
  ],
  accountant: [
    "/dashboard",
    "/pos",
    "/stocks",
    "/achats",
    "/factures",
    "/caisses",
    "/planning",
    "/clients",
    "/pertes",
    "/cadeaux",
    "/scanner",
    "/comptabilite",
    "/rapports",
    "/historique",
    "/guide",
  ],
  cashier: [
    "/dashboard",
    "/pos",
    "/caisses",
    "/scanner",
    "/clients",
    "/historique",
    "/factures",
    "/cadeaux",
    "/pertes",
    "/guide",
  ],
  stockist: [
    "/dashboard",
    "/stocks",
    "/import",
    "/achats",
    "/pertes",
    "/scanner",
    "/historique",
    "/factures",
    "/guide",
  ],
};

// Page d'accueil par rôle (après login)
export const ROLE_HOME: Record<Role, string> = {
  boss: "/dashboard",
  manager: "/dashboard",
  accountant: "/dashboard",
  cashier: "/pos",
  stockist: "/stocks",
};

// Vérifier si un rôle peut accéder à une route
export function canAccess(role: string | undefined, route: string): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role as Role];
  if (!permissions) return false;
  // Match exact ou sous-route (ex: /stocks/123 matche /stocks)
  return permissions.some(
    (allowed) => route === allowed || route.startsWith(allowed + "/")
  );
}

// Obtenir les routes autorisées pour un rôle
export function getAllowedRoutes(role: string | undefined): string[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role as Role] || [];
}
