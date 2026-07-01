import type { Metadata, Viewport } from "next";
import { I18nProvider } from "@/lib/i18n/context";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/lib/auth/context";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { LangAttribute } from "@/components/layout/LangAttribute";
import { LicenseProvider } from "@/lib/license/context";
import { LicenseGate } from "@/lib/license/LicenseGate";
import "./globals.css";

// System font fallback (no internet needed)
const inter = { variable: "--font-inter" };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#16a34a",
};

export const metadata: Metadata = {
  title: {
    template: "%s — KABRAK RETAIL",
    default: "KABRAK RETAIL — Retail Management",
  },
  description: "KABRAK RETAIL — Solution de gestion retail: POS, stock, factures, rapports",
  applicationName: "KABRAK RETAIL",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KABRAK RETAIL",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} h-full`}
    >
      <body className="h-full bg-[var(--background)]">
          <I18nProvider><LangAttribute /><ToastProvider><LicenseProvider><LicenseGate><AuthProvider><RoleGuard>{children}</RoleGuard></AuthProvider></LicenseGate></LicenseProvider></ToastProvider></I18nProvider>
          <script
            dangerouslySetInnerHTML={{
              __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}`,
            }}
          />
        </body>
    </html>
  );
}
