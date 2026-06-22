"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col">

      {/* Nav */}
      <nav className="border-b border-neutral-100 shrink-0">
        <div className="max-w-5xl mx-auto px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/kabrak-logo.jpeg"
              alt="KABRAK"
              className="w-7 h-7 rounded-lg object-cover"
            />
            <span className="text-[14px] font-semibold tracking-tight text-neutral-900">
              KABRAK Retail
            </span>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="text-[13px] text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            Sign in
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-8 py-24 text-center">
        <p className="text-[12px] font-medium tracking-widest text-neutral-400 uppercase mb-8 select-none">
          Retail management
        </p>

        <h1 className="text-[52px] sm:text-[64px] font-semibold tracking-[-2px] leading-[1.08] text-neutral-900 mb-6 max-w-2xl">
          Your store.<br />
          Under control.
        </h1>

        <p className="text-[17px] text-neutral-500 leading-relaxed max-w-md mb-12">
          Sales, inventory, invoicing and reporting —
          everything your retail team needs, in one place.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => router.push("/activate")}
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white text-[14px] font-medium rounded-xl hover:bg-neutral-800 active:scale-[0.98] transition-all"
          >
            Activate license
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => router.push("/login")}
            className="px-5 py-2.5 text-[14px] text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            I have access
          </button>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-neutral-100 shrink-0" />

      {/* Features — clean text list, no icon boxes */}
      <section className="max-w-5xl mx-auto px-8 py-16 w-full">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-8">
          {[
            { title: "Point of Sale", desc: "Scan and checkout in seconds, with or without internet." },
            { title: "Live Inventory", desc: "Stock levels, expiry alerts, and supplier orders in real time." },
            { title: "Invoicing", desc: "Create A4 invoices, track payments, export to PDF." },
            { title: "Sales Reports", desc: "Revenue, margins, and trends by day, week, or month." },
            { title: "Accounting", desc: "Expenses, income statements, and monthly breakdowns." },
            { title: "Team access", desc: "Role-based access for cashiers, stockers, and managers." },
          ].map((f) => (
            <div key={f.title}>
              <p className="text-[14px] font-semibold text-neutral-900 mb-1">{f.title}</p>
              <p className="text-[13px] text-neutral-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-100 shrink-0">
        <div className="max-w-5xl mx-auto px-8 py-6 flex items-center justify-between">
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
