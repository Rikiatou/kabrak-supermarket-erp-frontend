"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLicense } from "@/lib/license/context";
import { useI18n } from "@/lib/i18n/context";
import { ShieldAlert, Loader2 } from "lucide-react";

// Pages qui ne nécessitent PAS de licence
const PUBLIC_PAGES = ["/login", "/activate", "/pricing", "/"];

interface LicenseGateProps {
  children: React.ReactNode;
}

/**
 * Vérifie qu'une licence valide est active avant d'afficher l'app.
 * - Si pas de licence → redirect /activate
 * - Si licence expirée → redirect /renew
 * - Si licence valide → afficher children
 * - Mode offline: la licence reste valide jusqu'à expiration (vérification locale)
 */
export function LicenseGate({ children }: LicenseGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { license, loading, isExpired, daysRemaining } = useLicense();
  const { t } = useI18n();

  const isPublicPage = PUBLIC_PAGES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // ⚠️ TOUS les useEffect AVANT tout return conditionnel (règle des hooks)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || loading || isPublicPage) return;

    // Pas de licence → page d'activation
    if (!license) {
      router.replace("/activate");
      return;
    }

    // Licence expirée → page de renouvellement
    if (isExpired) {
      router.replace("/activate?expired=1");
      return;
    }
  }, [mounted, license, loading, isExpired, isPublicPage, router]);

  if (!mounted) {
    return <>{children}</>;
  }

  // Afficher un warning si la licence expire bientôt (< 30 jours)
  const showWarning = license && !isExpired && daysRemaining <= 30 && daysRemaining > 0;

  // Toujours rendre les children pour préserver l'arbre React (évite error #310)
  // Overlay de chargement par-dessus au lieu de remplacer les children
  const showLoadingOverlay = !isPublicPage && loading;
  const showLicenseWarning = !isPublicPage && !loading && license && !isExpired && showWarning;

  return (
    <>
      {showLoadingOverlay && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--background)]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[var(--brand)] animate-spin" />
            <p className="text-sm text-[var(--text-muted)]">{t.licenseGate.verifying}</p>
          </div>
        </div>
      )}
      {showLicenseWarning && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
          <p className="text-sm text-amber-800">
            ⚠️ {t.licenseGate.expiringSoon} <strong>{daysRemaining} {t.licenseGate.days}</strong>.{" "}
            <a href="/activate?renew=1" className="underline font-medium">
              {t.licenseGate.renewNow}
            </a>
          </p>
        </div>
      )}
      {children}
    </>
  );
}
