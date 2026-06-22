"use client";

import { Check, Building2 } from "lucide-react";
import { PRICING } from "@/lib/license/types";
import { Button } from "@/components/ui/Button";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Nav */}
      <nav className="border-b border-neutral-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/kabrak-logo.jpeg" alt="KABRAK" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-[15px] font-semibold tracking-tight">KABRAK Retail</span>
          </div>
          <a
            href="/activate"
            className="text-[13px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            I have a license
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-10 text-center">
        <h1 className="text-4xl font-semibold tracking-tight mb-4">
          Simple pricing. Everything included.
        </h1>
        <p className="text-lg text-neutral-500 max-w-xl mx-auto leading-relaxed">
          The retail platform built for modern stores.
          POS, inventory, invoicing, analytics — all in one.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-4xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-2 gap-6">
          {/* STANDARD */}
          <div className="bg-white rounded-2xl border-2 border-neutral-900 p-8 relative">
            <div className="absolute top-0 right-0 bg-neutral-900 text-white text-[11px] font-medium px-3 py-1 rounded-bl-xl">
              Popular
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">{PRICING.STANDARD.name}</h3>
            </div>
            <p className="text-[13px] text-neutral-500 mb-6">{PRICING.STANDARD.description}</p>

            <div className="mb-6 space-y-3">
              <div className="bg-neutral-50 rounded-xl p-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold">
                    {PRICING.STANDARD.yearly.toLocaleString()}
                  </span>
                  <span className="text-[13px] text-neutral-500">FCFA / year</span>
                </div>
                <p className="text-[12px] text-neutral-400 mt-1">
                  {PRICING.STANDARD.monthly.toLocaleString()} FCFA / month
                </p>
              </div>
              <div className="border border-neutral-100 rounded-xl p-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-neutral-700">
                    {PRICING.STANDARD.sixMonths.toLocaleString()}
                  </span>
                  <span className="text-[13px] text-neutral-500">FCFA / 6 months</span>
                </div>
                <p className="text-[12px] text-neutral-400 mt-1">
                  {PRICING.STANDARD.monthlySix.toLocaleString()} FCFA / month
                </p>
              </div>
            </div>

            <div className="text-[12px] text-neutral-500 mb-6 p-3 bg-neutral-50 rounded-lg">
              <p className="font-medium text-neutral-700 mb-1">One-time setup:</p>
              <p>Installation: 100,000 FCFA · Training: 50,000 FCFA</p>
            </div>

            <ul className="space-y-2 mb-8">
              {PRICING.STANDARD.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-neutral-700">
                  <Check className="w-4 h-4 text-neutral-900 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <a href="/activate" className="block">
              <Button className="w-full" size="lg">
                Choose Standard
              </Button>
            </a>
            <p className="text-[12px] text-neutral-400 text-center mt-3">
              1 store · Unlimited cashiers
            </p>
          </div>

          {/* MULTI-STORE */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-8">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-neutral-700" />
              <h3 className="text-lg font-semibold">{PRICING.MULTI_STORE.name}</h3>
            </div>
            <p className="text-[13px] text-neutral-500 mb-6">{PRICING.MULTI_STORE.description}</p>

            <div className="mb-6">
              <div className="bg-neutral-50 rounded-xl p-4">
                <p className="text-[13px] text-neutral-500">Starting from</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-semibold">
                    {PRICING.MULTI_STORE.startingPrice.toLocaleString()}
                  </span>
                  <span className="text-[13px] text-neutral-500">FCFA / year</span>
                </div>
                <p className="text-[12px] text-neutral-400 mt-1">
                  Custom quote based on store count
                </p>
              </div>
            </div>

            <div className="text-[12px] text-neutral-500 mb-6 p-3 bg-neutral-50 rounded-lg space-y-1">
              <p className="font-medium text-neutral-700 mb-1">Examples:</p>
              <p>2 stores: ~600,000 FCFA / year</p>
              <p>5 stores: ~1,000,000 FCFA / year</p>
              <p>10+ stores: ~1,500,000+ FCFA / year</p>
            </div>

            <ul className="space-y-2 mb-8">
              {PRICING.MULTI_STORE.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-neutral-700">
                  <Check className="w-4 h-4 text-neutral-700 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <a href="/activate" className="block">
              <Button variant="secondary" className="w-full" size="lg">
                Request a quote
              </Button>
            </a>
            <p className="text-[12px] text-neutral-400 text-center mt-3">
              Unlimited stores · Custom
            </p>
          </div>
        </div>
      </section>

      {/* Why KABRAK */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <h4 className="font-semibold mb-1.5 text-[15px]">Works online</h4>
            <p className="text-[13px] text-neutral-500 leading-relaxed">
              Cloud-based. Access from any device, anywhere.
            </p>
          </div>
          <div className="text-center">
            <h4 className="font-semibold mb-1.5 text-[15px]">Built for retail</h4>
            <p className="text-[13px] text-neutral-500 leading-relaxed">
              Designed for real stores, not generic ERPs.
            </p>
          </div>
          <div className="text-center">
            <h4 className="font-semibold mb-1.5 text-[15px]">Local support</h4>
            <p className="text-[13px] text-neutral-500 leading-relaxed">
              Fast response, in your timezone, in your language.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-100">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/kabrak-logo.jpeg" alt="KABRAK" className="w-5 h-5 rounded object-cover" />
            <span className="text-[12px] text-neutral-400">KABRAK Retail</span>
          </div>
          <p className="text-[12px] text-neutral-400">Powered by KABRAK eng</p>
        </div>
      </footer>
    </div>
  );
}
