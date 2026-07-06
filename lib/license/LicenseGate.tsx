"use client";

interface LicenseGateProps {
  children: React.ReactNode;
}

/**
 * MODE MONO-MAGASIN : LicenseGate désactivé (aucune vérification de licence).
 *
 * L'app fonctionne sans licence pour le déploiement mono-magasin actuel.
 * Pour réactiver le système de licence (multi-tenant / revente à d'autres
 * clients), restaurer la version originale de ce fichier depuis git :
 *   git show <commit>:lib/license/LicenseGate.tsx
 * et s'assurer que le backend expose /api/licenses/validate.
 */
export function LicenseGate({ children }: LicenseGateProps) {
  return <>{children}</>;
}
