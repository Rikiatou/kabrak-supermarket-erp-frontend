import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n/context";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/lib/auth/context";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { LicenseProvider } from "@/lib/license/context";
import "./globals.css";

// Use system fonts — no internet needed for build
const geistSans = { variable: "--font-geist-sans" };
const geistMono = { variable: "--font-geist-mono" };

export const metadata: Metadata = {
  title: {
    template: "%s — KABRAK RETAIL",
    default: "KABRAK RETAIL",
  },
  description: "KABRAK RETAIL - Gestion complète caisse, stock, ventes",
  applicationName: "KABRAK RETAIL",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="h-full bg-[var(--background)]">
          <I18nProvider><ToastProvider><AuthProvider><LicenseProvider><RoleGuard>{children}</RoleGuard></LicenseProvider></AuthProvider></ToastProvider></I18nProvider>
          <script
            dangerouslySetInnerHTML={{
              __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}`,
            }}
          />
        </body>
    </html>
  );
}
