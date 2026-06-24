import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { I18nProvider } from "@/lib/i18n/context";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/lib/auth/context";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { LangAttribute } from "@/components/layout/LangAttribute";
import { LicenseProvider } from "@/lib/license/context";
import { LicenseGate } from "@/lib/license/LicenseGate";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: {
    template: "%s — KABRAK Retail",
    default: "KABRAK Retail",
  },
  description: "Complete retail management solution — POS, inventory, invoices, reports",
  applicationName: "KABRAK Retail",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KABRAK Retail",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
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
