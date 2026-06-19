import Link from "next/link";
import { Store, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-[var(--brand-light)] rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Store className="w-10 h-10 text-[var(--brand)]" />
        </div>
        <h1 className="text-6xl font-black text-[var(--text-primary)] tabular-nums mb-2">404</h1>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
          Page introuvable
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-8 leading-relaxed">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-[var(--brand)] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--brand-dark)] transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au Dashboard
        </Link>
      </div>
    </div>
  );
}
