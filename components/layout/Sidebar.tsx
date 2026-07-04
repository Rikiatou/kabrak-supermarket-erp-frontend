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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/context";
import { canAccess } from "@/lib/auth/roles";
import { LanguageToggle } from "./LanguageToggle";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { user, logout } = useAuth();

  const allNavItems = [
    { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard, badge: null },
    { href: "/pos", label: t.nav.pos, icon: ShoppingCart, badge: null },
    { href: "/stocks", label: t.nav.stocks, icon: Package, badge: 6 },
    { href: "/import", label: "Import CSV", icon: Upload, badge: null },
    { href: "/achats", label: t.nav.achats, icon: Truck, badge: null },
    { href: "/factures", label: "Factures", icon: FileText, badge: null },
    { href: "/employes", label: t.nav.employes, icon: Users, badge: null },
    { href: "/caisses", label: "Caisses", icon: Store, badge: null },
    { href: "/planning", label: "Planning", icon: Calendar, badge: null },
    { href: "/clients", label: "Clients", icon: Users, badge: null },
    { href: "/pertes", label: "Pertes", icon: AlertTriangle, badge: null },
    { href: "/scanner", label: "Scanner", icon: ScanLine, badge: null },
    { href: "/comptabilite", label: t.nav.comptabilite, icon: BookOpen, badge: null },
    { href: "/rapports", label: t.nav.rapports, icon: BarChart3, badge: null },
    { href: "/ia", label: t.nav.ia, icon: Cpu, badge: null },
  ];

  // Filtrer par rôle
  const navItems = allNavItems.filter((item) => canAccess(user?.role, item.href));

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-[#0f172a] flex flex-col z-40">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/[0.06] shrink-0 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--brand)] rounded-lg flex items-center justify-center shrink-0">
            <Store className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-white font-semibold text-[15px] leading-none tracking-tight">
              KABRAK
            </span>
            <span className="block text-[10px] text-slate-400 tracking-widest uppercase mt-0.5">
              Market ERP
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
      <div className="px-4 py-4 border-t border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user ? user.firstName.charAt(0) + user.lastName.charAt(0) : "AB"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">
              {user ? `${user.firstName} ${user.lastName}` : "Amina Bello"}
            </p>
            <p className="text-slate-500 text-[11px] truncate capitalize">
              {user ? user.role : "Manager"}
            </p>
          </div>
          {user && (
            <button
              onClick={logout}
              title="Déconnexion"
              className="text-slate-400 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
