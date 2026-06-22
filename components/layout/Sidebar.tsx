"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  Users,
  BookOpen,
  BarChart3,
  Cpu,
  Store,
  ChevronRight,
  Upload,
  LogOut,
  FileText,
  AlertTriangle,
  ScanLine,
  Calendar,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/context";
import { canAccess } from "@/lib/auth/roles";
import { useLicense } from "@/lib/license/context";
import { LanguageToggle } from "./LanguageToggle";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const { config, license } = useLicense();

  const allNavItems = [
    { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard, badge: null },
    { href: "/pos", label: t.nav.pos, icon: ShoppingCart, badge: null },
    { href: "/stocks", label: t.nav.stocks, icon: Package, badge: 6 },
    { href: "/import", label: t.nav.import, icon: Upload, badge: null },
    { href: "/achats", label: t.nav.achats, icon: Truck, badge: null },
    { href: "/factures", label: t.nav.factures, icon: FileText, badge: null },
    { href: "/employes", label: t.nav.employes, icon: Users, badge: null },
    { href: "/caisses", label: t.nav.caisses, icon: Store, badge: null },
    { href: "/planning", label: t.nav.planning, icon: Calendar, badge: null },
    { href: "/clients", label: t.nav.clients, icon: Users, badge: null },
    { href: "/pertes", label: t.nav.pertes, icon: AlertTriangle, badge: null },
    { href: "/scanner", label: t.nav.scanner, icon: ScanLine, badge: null },
    { href: "/comptabilite", label: t.nav.comptabilite, icon: BookOpen, badge: null },
    { href: "/rapports", label: t.nav.rapports, icon: BarChart3, badge: null },
    { href: "/ia", label: t.nav.ia, icon: Cpu, badge: null },
    { href: "/settings", label: "Paramètres", icon: Settings, badge: null },
  ];

  // Filtrer par rôle
  const navItems = allNavItems.filter((item) => canAccess(user?.role, item.href));

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-[#0f172a] flex flex-col z-40">
      {/* Logo — client logo or KABRAK default */}
      <div className="h-16 flex items-center px-4 border-b border-white/[0.06] shrink-0 justify-between">
        <div className="flex items-center gap-3">
          {config?.logoUrl ? (
            <img
              src={config.logoUrl}
              alt={config.supermarketName}
              className="w-8 h-8 rounded-lg object-cover shrink-0"
            />
          ) : (
            <img
              src="/kabrak-logo.jpeg"
              alt="KABRAK"
              className="w-8 h-8 rounded-lg object-cover shrink-0"
            />
          )}
          <div className="min-w-0">
            <span className="text-white font-semibold text-[15px] leading-none tracking-tight truncate block">
              {config?.supermarketName || "KABRAK Retail"}
            </span>
            <span className="block text-[10px] text-slate-400 tracking-widest uppercase mt-0.5">
              {license?.type === "MULTI_STORE" ? "Multi-Store" : "Retail"}
            </span>
          </div>
        </div>
        <LanguageToggle />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-3">
          {t.nav.navigation}
        </p>
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-[var(--brand)] text-white shadow-md shadow-blue-900/30"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                  {badge != null && badge > 0 && (
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center tabular-nums",
                        active ? "bg-white/20 text-white" : "bg-red-500 text-white"
                      )}
                    >
                      {badge}
                    </span>
                  )}
                  {active && (
                    <ChevronRight className="w-3.5 h-3.5 text-white/60 shrink-0" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center text-white text-[11px] font-medium shrink-0">
            {user ? user.firstName.charAt(0) + user.lastName.charAt(0) : "AB"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[12px] font-medium truncate">
              {user ? `${user.firstName} ${user.lastName}` : "Grace Johnson"}
            </p>
            <p className="text-slate-500 text-[11px] truncate capitalize">
              {user ? user.role : "Boss"}
            </p>
          </div>
          {user && (
            <button
              onClick={logout}
              title="Sign out"
              className="text-slate-400 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-600 mt-3 text-center">Powered by KABRAK eng</p>
      </div>
    </aside>
  );
}
