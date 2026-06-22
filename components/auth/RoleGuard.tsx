"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { canAccess, ROLE_HOME, type Role } from "@/lib/auth/roles";
import { useI18n } from "@/lib/i18n/context";
import { ShieldAlert } from "lucide-react";

interface RoleGuardProps {
  children: React.ReactNode;
}

/**
 * Protège toutes les pages sauf /login.
 * - Si non connecté → redirect /login
 * - Si connecté mais rôle insuffisant → redirect vers sa page d'accueil
 */
export function RoleGuard({ children }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { user, loading } = useAuth();
  const { t } = useI18n();

  // Pages publiques = pas de guard
  const PUBLIC_PAGES = ["/login", "/activate", "/pricing", "/"];
  const isPublicPage = PUBLIC_PAGES.some(p => pathname === p || pathname.startsWith(p + "/"));

  // Vérifier l'accès (dérivé, pas de state)
  const hasAccess = user ? canAccess(user.role, pathname) : false;
  const home = user ? (ROLE_HOME[user.role as Role] || "/dashboard") : "/dashboard";
  const isDenied = user && !hasAccess && pathname === home; // Cas extrême: aucune page accessible

  // ⚠️ TOUS les useEffect AVANT tout return conditionnel (règle des hooks)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || loading || isPublicPage) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!hasAccess && !isDenied) {
      router.replace(home);
    }
  }, [mounted, user, loading, isPublicPage, hasAccess, isDenied, home, router, pathname]);

  if (!mounted) {
    return <>{children}</>;
  }

  // Pages publiques = pas de guard
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Pendant le chargement de l'auth, afficher un loader
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-muted)]">{t.roleGuard.loading}</p>
        </div>
      </div>
    );
  }

  // Non connecté (en attendant le redirect)
  if (!user) {
    return null;
  }

  // Accès refusé (cas extrême: l'utilisateur n'a accès à aucune page)
  if (isDenied) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background)] p-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">
            {t.roleGuard.accessDenied}
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            {t.roleGuard.accessDeniedMsg}
          </p>
        </div>
      </div>
    );
  }

  // En attente de redirect (pas d'accès mais pas non plus sur sa home)
  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
