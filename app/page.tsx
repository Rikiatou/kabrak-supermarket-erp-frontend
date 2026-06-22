"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export default function WelcomePage() {
  const router = useRouter();
  const { locale, setLocale } = useI18n();

  const content = {
    en: {
      tag: "Retail management",
      headline: <>Your store.<br />Under control.</>,
      sub: "Sales, inventory, invoicing and reporting — everything your retail team needs, in one place.",
      activate: "Activate license",
      access: "I have access",
      signIn: "Sign in",
      features: [
        { title: "Point of Sale", desc: "Scan and checkout in seconds, with or without internet." },
        { title: "Live Inventory", desc: "Stock levels, expiry alerts, and supplier orders in real time." },
        { title: "Delivery Notes", desc: "Record supplier deliveries and auto-update stock instantly." },
        { title: "Sales Reports", desc: "Revenue, margins, and trends by day, week, or month." },
        { title: "Invoicing", desc: "Create invoices, track payments, export to PDF." },
        { title: "Team access", desc: "Role-based access for cashiers, stockers, and managers." },
      ],
    },
    fr: {
      tag: "Gestion de commerce",
      headline: <>Votre magasin.<br />Sous contrôle.</>,
      sub: "Caisse, stock, facturation et rapports — tout ce dont votre équipe a besoin, en un seul endroit.",
      activate: "Activer la licence",
      access: "J'ai déjà accès",
      signIn: "Connexion",
      features: [
        { title: "Point de Vente", desc: "Scannez et encaissez en quelques secondes, avec ou sans internet." },
        { title: "Stock en temps réel", desc: "Niveaux de stock, alertes d'expiration et commandes fournisseurs." },
        { title: "Bordereaux de livraison", desc: "Enregistrez les livraisons fournisseurs et mettez à jour le stock automatiquement." },
        { title: "Rapports de ventes", desc: "CA, marges et tendances par jour, semaine ou mois." },
        { title: "Facturation", desc: "Créez des factures, suivez les paiements, exportez en PDF." },
        { title: "Accès par rôle", desc: "Permissions distinctes pour caissiers, gestionnaires de stock et managers." },
      ],
    },
  };

  const c = content[locale] ?? content.en;

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col">

      {/* Nav */}
      <nav className="border-b border-neutral-100 shrink-0">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/kabrak-logo.jpeg"
              alt="KABRAK"
              className="w-8 h-8 rounded-lg object-cover shadow-sm"
            />
            <span className="text-[14px] font-semibold tracking-tight text-neutral-900">
              KABRAK Retail
            </span>
          </div>
          <div className="flex items-center gap-4">
            {/* Language toggle */}
            <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5">
              {(["fr", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all",
                    locale === l
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-400 hover:text-neutral-700"
                  )}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => router.push("/activate")}
              className="text-[13px] text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              {c.signIn}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">

        {/* Big logo */}
        <div className="mb-8">
          <img
            src="/kabrak-logo.jpeg"
            alt="KABRAK"
            className="w-20 h-20 rounded-2xl object-cover mx-auto shadow-md border border-neutral-100"
          />
        </div>

        <p className="text-[11px] font-medium tracking-widest text-neutral-400 uppercase mb-6 select-none">
          {c.tag}
        </p>

        <h1 className="text-[48px] sm:text-[62px] font-semibold tracking-[-2px] leading-[1.08] text-neutral-900 mb-6 max-w-2xl">
          {c.headline}
        </h1>

        <p className="text-[16px] text-neutral-500 leading-relaxed max-w-md mb-10">
          {c.sub}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => router.push("/activate")}
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white text-[14px] font-medium rounded-xl hover:bg-neutral-800 active:scale-[0.98] transition-all"
          >
            {c.activate}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => router.push("/activate")}
            className="px-5 py-2.5 text-[14px] text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            {c.access}
          </button>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-neutral-100 shrink-0" />

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-14 w-full">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-8">
          {c.features.map((f) => (
            <div key={f.title}>
              <p className="text-[14px] font-semibold text-neutral-900 mb-1">{f.title}</p>
              <p className="text-[13px] text-neutral-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-100 shrink-0">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <span className="text-[12px] text-neutral-400">
            &copy; {new Date().getFullYear()} KABRAK Retail
          </span>
          <span className="text-[12px] text-neutral-400">
            Powered by KABRAK eng
          </span>
        </div>
      </footer>
    </div>
  );
}
