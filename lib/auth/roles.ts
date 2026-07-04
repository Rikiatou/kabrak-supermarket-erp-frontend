// ========================================
// RBAC — Permissions par rôle
// ========================================

export type Role = "boss" | "manager" | "supervisor" | "cashier" | "stockist" | "accountant";

// Routes accessibles par chaque rôle
// manager = tout, les autres = sous-ensemble
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
    "/scanner",
    "/comptabilite",
    "/rapports",
    "/ia",
    "/historique",
    "/settings",
    "/cadeaux",
    "/returns",
  ],
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
    "/scanner",
    "/comptabilite",
    "/rapports",
    "/ia",
  ],
  supervisor: [
    "/dashboard",
    "/pos",
    "/stocks",
    "/achats",
    "/factures",
    "/caisses",
    "/planning",
    "/clients",
    "/pertes",
    "/scanner",
    "/rapports",
  ],
  cashier: [
    "/dashboard",
    "/pos",
    "/caisses",
    "/scanner",
    "/clients",
  ],
  stockist: [
    "/dashboard",
    "/stocks",
    "/import",
    "/achats",
    "/pertes",
    "/scanner",
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
    "/scanner",
    "/comptabilite",
    "/rapports",
    "/historique",
  ],
};

// Page d'accueil par rôle (après login)
export const ROLE_HOME: Record<Role, string> = {
  boss: "/dashboard",
  manager: "/dashboard",
  supervisor: "/dashboard",
  cashier: "/pos",
  stockist: "/stocks",
  accountant: "/dashboard",
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
