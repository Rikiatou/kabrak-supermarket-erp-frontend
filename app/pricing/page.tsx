"use client";

import { Check, Store, Building2, Phone, Mail, Globe } from "lucide-react";
import { PRICING } from "@/lib/license/types";
import { Button } from "@/components/ui/Button";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">KABRAK ERP</h1>
              <p className="text-xs text-slate-500">Supermarket Management System</p>
            </div>
          </div>
          <a
            href="/activate"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            J&apos;ai une licence →
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-8 text-center">
        <h2 className="text-4xl font-bold text-slate-900 mb-4">
          Un prix simple. Tout inclus.
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          KABRAK ERP est l&apos;ERP/POS conçu pour les supermarchés en Afrique.
          Fonctionne hors ligne. Synchronisation automatique. Support local.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* STANDARD */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-500 overflow-hidden relative">
            <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-4 py-1 rounded-bl-xl">
              POPULAIRE
            </div>
            <div className="p-8">
              <div className="flex items-center gap-2 mb-2">
                <Store className="w-5 h-5 text-blue-600" />
                <h3 className="text-xl font-bold text-slate-900">{PRICING.STANDARD.name}</h3>
              </div>
              <p className="text-sm text-slate-500 mb-6">{PRICING.STANDARD.description}</p>

              {/* Prix */}
              <div className="mb-6 space-y-3">
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900">
                      {PRICING.STANDARD.yearly.toLocaleString("fr-FR")}
                    </span>
                    <span className="text-sm text-slate-500">FCFA / an</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Soit {PRICING.STANDARD.monthly.toLocaleString("fr-FR")} FCFA / mois
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-700">
                      {PRICING.STANDARD.sixMonths.toLocaleString("fr-FR")}
                    </span>
                    <span className="text-sm text-slate-500">FCFA / 6 mois</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Soit {PRICING.STANDARD.monthlySix.toLocaleString("fr-FR")} FCFA / mois
                  </p>
                </div>
              </div>

              {/* Installation */}
              <div className="text-xs text-slate-500 mb-6 p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-700 mb-1">Frais d&apos;installation (one-time):</p>
                <p>Installation: 100 000 FCFA · Formation: 50 000 FCFA</p>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-8">
                {PRICING.STANDARD.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button className="w-full" size="lg">
                Choisir Standard
              </Button>
              <p className="text-xs text-slate-400 text-center mt-3">
                1 magasin · Caissiers illimités
              </p>
            </div>
          </div>

          {/* MULTI-STORE */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-xl font-bold text-slate-900">{PRICING.MULTI_STORE.name}</h3>
              </div>
              <p className="text-sm text-slate-500 mb-6">{PRICING.MULTI_STORE.description}</p>

              {/* Prix */}
              <div className="mb-6">
                <div className="bg-indigo-50 rounded-xl p-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-slate-500">À partir de</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-bold text-slate-900">
                      {PRICING.MULTI_STORE.startingPrice.toLocaleString("fr-FR")}
                    </span>
                    <span className="text-sm text-slate-500">FCFA / an</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Prix sur devis selon le nombre de magasins
                  </p>
                </div>
              </div>

              {/* Exemples */}
              <div className="text-xs text-slate-500 mb-6 p-3 bg-slate-50 rounded-lg space-y-1">
                <p className="font-medium text-slate-700 mb-1">Exemples:</p>
                <p>• 2 magasins: ~600 000 FCFA / an</p>
                <p>• 5 magasins: ~1 000 000 FCFA / an</p>
                <p>• 10+ magasins: ~1 500 000+ FCFA / an</p>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-8">
                {PRICING.MULTI_STORE.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button variant="secondary" className="w-full" size="lg">
                Demander un devis
              </Button>
              <p className="text-xs text-slate-400 text-center mt-3">
                Magasins illimités · Sur mesure
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <h3 className="text-xl font-bold text-slate-900 mb-6 text-center">
            Pourquoi choisir KABRAK ERP?
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-slate-900 mb-1">Fonctionne hors ligne</h4>
              <p className="text-sm text-slate-500">
                Vos caisses continuent de fonctionner même sans internet ni serveur.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Store className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-slate-900 mb-1">Conçu pour l&apos;Afrique</h4>
              <p className="text-sm text-slate-500">
                Pensé pour les supermarchés camerounais. Support en français.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Globe className="w-6 h-6 text-indigo-600" />
              </div>
              <h4 className="font-semibold text-slate-900 mb-1">4x moins cher</h4>
              <p className="text-sm text-slate-500">
                300 000 FCFA / an vs 1 350 000 FCFA / an pour Odoo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-2">Prêt à digitaliser votre supermarché?</h3>
          <p className="text-blue-100 mb-6">Contactez-nous pour une démonstration gratuite.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://wa.me/237XXXXXXXXX"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-xl font-medium hover:bg-blue-50 transition"
            >
              <Phone className="w-4 h-4" />
              WhatsApp
            </a>
            <a
              href="mailto:contact@kabrak.com"
              className="inline-flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-400 transition border border-white/20"
            >
              <Mail className="w-4 h-4" />
              Email
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm">KABRAK ERP © {new Date().getFullYear()} — Supermarket Management System</p>
          <p className="text-xs mt-2">Conçu au Cameroun pour l&apos;Afrique</p>
        </div>
      </footer>
    </div>
  );
}
