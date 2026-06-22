"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Zap, Package, Receipt, TrendingUp, BarChart3, Shield } from "lucide-react";
import { useLicense } from "@/lib/license/context";

export default function WelcomePage() {
  const router = useRouter();
  const { license, loading } = useLicense();

  useEffect(() => {
    if (!loading && license?.status === "ACTIVE") {
      // Stay on welcome — user chooses
    }
  }, [loading, license]);

  const features = [
    { icon: Zap, title: "Fast Checkout", desc: "Scan, pay, done. Seconds per transaction." },
    { icon: Package, title: "Live Inventory", desc: "Stock levels update in real time." },
    { icon: Receipt, title: "Invoicing", desc: "Create, send, and track payments." },
    { icon: TrendingUp, title: "Sales Reports", desc: "Revenue, margins, trends at a glance." },
    { icon: BarChart3, title: "Accounting", desc: "Income, expenses, P&L statements." },
    { icon: Shield, title: "Role Access", desc: "Cashiers, stockers, accountants — controlled." },
  ];

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Nav */}
      <nav className="border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/kabrak-logo.jpeg" alt="KABRAK" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-[15px] font-semibold tracking-tight">KABRAK Retail</span>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="text-[13px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            Sign in
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="flex justify-center mb-10">
          <img
            src="/kabrak-logo.jpeg"
            alt="KABRAK"
            className="w-20 h-20 rounded-2xl object-cover shadow-sm border border-neutral-100"
          />
        </div>
        <h1 className="text-5xl font-semibold tracking-tight mb-5 leading-tight">
          Run your store<br />with clarity.
        </h1>
        <p className="text-lg text-neutral-500 max-w-xl mx-auto mb-10 leading-relaxed">
          Point of sale, inventory, invoicing, and reporting.
          One platform, built for retail.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            onClick={() => router.push("/activate")}
            className="px-6 py-3 bg-neutral-900 text-white text-[14px] font-medium rounded-xl hover:bg-neutral-800 transition-colors flex items-center gap-2"
          >
            Activate License
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push("/login")}
            className="px-6 py-3 text-[14px] font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            I have access
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-100">
          {features.map((f, i) => (
            <div key={i} className="bg-white p-8">
              <div className="w-10 h-10 bg-neutral-50 rounded-xl flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-neutral-700" />
              </div>
              <h3 className="text-[15px] font-semibold mb-1.5">{f.title}</h3>
              <p className="text-[13px] text-neutral-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
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
