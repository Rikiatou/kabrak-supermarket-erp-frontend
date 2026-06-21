"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLicense } from "@/lib/license/context";
import { useI18n } from "@/lib/i18n/context";
import { Button } from "@/components/ui/Button";
import { Store, Loader2, AlertCircle, CheckCircle2, KeyRound, RefreshCw } from "lucide-react";

function ActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activate, license, isExpired, daysRemaining } = useLicense();
  const { t } = useI18n();

  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const isRenewal = searchParams.get("renew") === "1" || searchParams.get("expired") === "1";

  // Si déjà activée et valide, rediriger
  useEffect(() => {
    if (license && !isExpired && !isRenewal) {
      router.replace("/dashboard");
    }
  }, [license, isExpired, isRenewal, router]);

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError("Veuillez entrer votre clé de licence");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    const ok = await activate(licenseKey.trim().toUpperCase());

    if (ok) {
      setSuccess(true);
      setTimeout(() => router.replace("/dashboard"), 1500);
    } else {
      setError("Clé de licence invalide, expirée ou serveur injoignable. Vérifiez votre clé et réessayez.");
    }

    setLoading(false);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setLicenseKey(text.trim().toUpperCase());
    } catch {
      // Ignore
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-3">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">KABRAK ERP</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isRenewal ? "Renouvellement de licence" : "Activation de votre licence"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
          {/* Si renouvellement et licence expirée */}
          {isRenewal && license && isExpired && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <p className="font-medium mb-1">Licence expirée</p>
              <p>Votre licence pour <strong>{license.clientName}</strong> a expiré. Contactez KABRAK pour la renouveler, puis entrez votre nouvelle clé ci-dessous.</p>
            </div>
          )}

          {/* Si licence expirée bientôt */}
          {license && !isExpired && daysRemaining <= 30 && isRenewal && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
              <p className="font-medium mb-1">Renouvellement</p>
              <p>Votre licence expire dans <strong>{daysRemaining} jours</strong>. Entrez votre nouvelle clé pour prolonger.</p>
            </div>
          )}

          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Clé de licence
          </h2>

          <div className="space-y-4">
            <div>
              <div className="relative">
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  placeholder="KABRAK-STD-2024-EASYSHOP-XXXXXX"
                  className="w-full px-4 py-3 pr-24 border border-slate-300 rounded-xl font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={60}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) handleActivate();
                  }}
                />
                <button
                  onClick={handlePaste}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
                >
                  Coller
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Format: KABRAK-STD-2024-NOMCLIENT-XXXXXX
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 border border-green-200 rounded-xl p-3">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Licence activée ! Redirection en cours...</span>
              </div>
            )}

            <Button
              onClick={handleActivate}
              disabled={loading || !licenseKey.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Activation...
                </>
              ) : isRenewal ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Renouveler
                </>
              ) : (
                "Activer ma licence"
              )}
            </Button>
          </div>

          {/* Info */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-500 text-center mb-3">
              Vous n&apos;avez pas de licence?
            </p>
            <div className="flex flex-col gap-2">
              <a
                href="/pricing"
                className="text-sm text-blue-600 hover:text-blue-700 text-center font-medium"
              >
                Voir les tarifs KABRAK ERP
              </a>
              <a
                href="https://wa.me/237XXXXXXXXX"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-400 hover:text-slate-600 text-center"
              >
                Contacter le support (WhatsApp)
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          KABRAK ERP © {new Date().getFullYear()} — Supermarket Management System
        </p>
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
      <ActivateContent />
    </Suspense>
  );
}
