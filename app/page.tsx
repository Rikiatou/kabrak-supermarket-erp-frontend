"use client";

import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export default function WelcomePage() {
  const { t, locale, setLocale } = useI18n();

  const features = [
    { title: t.marketing.feature1Title, desc: t.marketing.feature1Desc },
    { title: t.marketing.feature2Title, desc: t.marketing.feature2Desc },
    { title: t.marketing.feature3Title, desc: t.marketing.feature3Desc },
    { title: t.marketing.feature4Title, desc: t.marketing.feature4Desc },
    { title: t.marketing.feature5Title, desc: t.marketing.feature5Desc },
    { title: t.marketing.feature6Title, desc: t.marketing.feature6Desc },
  ];

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
          {t.marketing.tag}
        </p>

        <h1 className="text-[48px] sm:text-[62px] font-semibold tracking-[-2px] leading-[1.08] text-neutral-900 mb-6 max-w-2xl">
          {t.marketing.headlineLine1}<br />{t.marketing.headlineLine2}
        </h1>

        <p className="text-[16px] text-neutral-500 leading-relaxed max-w-md mb-10">
          {t.marketing.sub}
        </p>
      </section>

      {/* Divider */}
      <div className="border-t border-neutral-100 shrink-0" />

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-14 w-full">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-8">
          {features.map((f) => (
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
            {t.marketing.poweredByEng}
          </span>
        </div>
      </footer>
    </div>
  );
}
