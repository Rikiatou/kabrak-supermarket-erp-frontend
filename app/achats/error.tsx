"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function AchatsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Achats page error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
        Erreur de chargement
      </h2>
      <p className="text-sm text-[var(--text-muted)] mb-1">
        La page Achats n&apos;a pas pu se charger complètement.
      </p>
      <p className="text-xs text-red-500 mb-4 font-mono">
        {error.message}
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--brand)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <RefreshCw className="w-4 h-4" />
        Réessayer
      </button>
    </div>
  );
}
