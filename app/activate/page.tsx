"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLicense } from "@/lib/license/context";
import { Button } from "@/components/ui/Button";
import { Loader2, AlertCircle, CheckCircle2, KeyRound, RefreshCw } from "lucide-react";

function ActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activate, license, isExpired, daysRemaining } = useLicense();

  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const isRenewal = searchParams.get("renew") === "1" || searchParams.get("expired") === "1";

  useEffect(() => {
    if (license && !isExpired && !isRenewal) {
      router.replace("/dashboard");
    }
  }, [license, isExpired, isRenewal, router]);

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError("Please enter your license key");
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
      setError("Invalid, expired, or unreachable. Check your key and try again.");
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
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <img
            src="/kabrak-logo.jpeg"
            alt="KABRAK"
            className="w-14 h-14 rounded-2xl object-cover mx-auto mb-4 shadow-sm border border-neutral-100"
          />
          <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900">KABRAK Retail</h1>
          <p className="text-[13px] text-neutral-400 mt-1">
            {isRenewal ? "Renew your license" : "Activate your license"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
          {isRenewal && license && isExpired && (
            <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[13px] text-amber-800">
              <p className="font-medium mb-1">License expired</p>
              <p>Your license for <strong>{license.clientName}</strong> has expired. Contact KABRAK to renew, then enter your new key below.</p>
            </div>
          )}

          {license && !isExpired && daysRemaining <= 30 && isRenewal && (
            <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-xl text-[13px] text-blue-800">
              <p className="font-medium mb-1">Renewal</p>
              <p>Your license expires in <strong>{daysRemaining} days</strong>. Enter your new key to extend.</p>
            </div>
          )}

          <h2 className="text-[13px] font-medium text-neutral-500 mb-3 flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> License key
          </h2>

          <div className="space-y-4">
            <div>
              <div className="relative">
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  placeholder="KABRAK-STD-2024-EASYSHOP-XXXXXX"
                  className="w-full px-4 py-3 pr-20 border border-neutral-200 rounded-xl font-mono text-[13px] tracking-wider focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  maxLength={60}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) handleActivate();
                  }}
                />
                <button
                  onClick={handlePaste}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-neutral-400 hover:text-neutral-700 px-2 py-1"
                >
                  Paste
                </button>
              </div>
              <p className="text-[11px] text-neutral-400 mt-2">
                Format: KABRAK-STD-2024-CLIENTNAME-XXXXXX
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-red-600 text-[13px] bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 text-green-600 text-[13px] bg-green-50 border border-green-200 rounded-xl p-3">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>License activated. Redirecting...</span>
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
                  Activating...
                </>
              ) : isRenewal ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Renew
                </>
              ) : (
                "Activate"
              )}
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-neutral-100">
            <p className="text-[12px] text-neutral-400 text-center mb-3">
              Don&apos;t have a license?
            </p>
            <div className="flex flex-col gap-2">
              <a
                href="/pricing"
                className="text-[13px] text-neutral-900 hover:text-neutral-600 text-center font-medium"
              >
                View pricing
              </a>
              <a
                href="/"
                className="text-[12px] text-neutral-400 hover:text-neutral-600 text-center"
              >
                Back to home
              </a>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-neutral-300 mt-6">
          Powered by KABRAK eng
        </p>
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-neutral-300" /></div>}>
      <ActivateContent />
    </Suspense>
  );
}
