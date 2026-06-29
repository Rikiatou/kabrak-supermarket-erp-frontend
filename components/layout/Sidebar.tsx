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
  Upload,
  LogOut,
  FileText,
  AlertTriangle,
  ScanLine,
  Calendar,
  Settings,
  History,
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

  type NavItem = { href: string; label: string; icon: React.ElementType; badge: number | null };

  const navGroups: Array<{ label: string; items: NavItem[] }> = [
    {
      label: "",
      items: [
        { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard, badge: null },
      ],
    },
    {
      label: "Ventes",
      items: [
        { href: "/pos", label: t.nav.pos, icon: ShoppingCart, badge: null },
        { href: "/caisses", label: t.nav.caisses, icon: Store, badge: null },
        { href: "/clients", label: t.nav.clients, icon: Users, badge: null },
      ],
    },
    {
      label: "Stock",
      items: [
        { href: "/stocks", label: t.nav.stocks, icon: Package, badge: 6 },
        { href: "/import", label: t.nav.import, icon: Upload, badge: null },
        { href: "/scanner", label: t.nav.scanner, icon: ScanLine, badge: null },
        { href: "/pertes", label: t.nav.pertes, icon: AlertTriangle, badge: null },
      ],
    },
    {
      label: "Achats",
      items: [
        { href: "/achats", label: t.nav.achats, icon: Truck, badge: null },
      ],
    },
    {
      label: "Finance",
      items: [
        { href: "/factures", label: t.nav.factures, icon: FileText, badge: null },
        { href: "/comptabilite", label: t.nav.comptabilite, icon: BookOpen, badge: null },
        { href: "/rapports", label: t.nav.rapports, icon: BarChart3, badge: null },
      ],
    },
    {
      label: "Analyses",
      items: [
        { href: "/historique", label: t.nav.historique || "Historique", icon: History, badge: null },
        { href: "/ia", label: t.nav.ia, icon: Cpu, badge: null },
      ],
    },
    {
      label: "Equipe",
      items: [
        { href: "/employes", label: t.nav.employes, icon: Users, badge: null },
        { href: "/planning", label: t.nav.planning, icon: Calendar, badge: null },
      ],
    },
    {
      label: "",
      items: [
        { href: "/settings", label: t.nav.settings || "Parametres", icon: Settings, badge: null },
      ],
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-[252px] bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col z-40">
      {/* Brand header */}
      <div className="h-[60px] flex items-center px-5 border-b border-[var(--sidebar-border)] shrink-0 justify-between">
        <div className="flex items-center gap-2.5">
          {config?.logoUrl ? (
            <img
              src={config.logoUrl}
              alt={config.supermarketName}
              className="w-8 h-8 rounded-lg object-cover shrink-0 ring-1 ring-[var(--border)]"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[var(--brand)] flex items-center justify-center shrink-0 shadow-[var(--shadow-brand)]">
              <span className="text-white font-bold text-[13px] tracking-tight">K</span>
            </div>
          )}
          <div className="min-w-0">
            <span className="text-[var(--text-primary)] font-semibold text-[14px] leading-none tracking-tight truncate block">
              {config?.supermarketName || "KABRAK"}
            </span>
            <span className="block text-[10px] text-[var(--text-muted)] tracking-wider uppercase mt-1 font-medium">
              {license?.type === "MULTI_STORE" ? "Multi-Store" : "Retail Suite"}
            </span>
          </div>
        </div>
        <LanguageToggle />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) =>
              canAccess(user?.role, item.href)
            );
            if (visibleItems.length === 0) return null;
            return (
              <li key={group.label || group.items[0]?.href} className="mb-0.5">
                {group.label && (
                  <p className="px-3 pt-4 pb-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    {group.label}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {visibleItems.map(({ href, label, icon: Icon, badge }) => {
                    const active = pathname === href || pathname.startsWith(href + "/");
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          onClick={onNavigate}
                          className={cn(
                            "group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                            active
                              ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]"
                              : "text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-hover)] hover:bg-[var(--surface-2)]"
                          )}
                        >
                          <Icon className={cn("w-[18px] h-[18px] shrink-0", active ? "text-[var(--brand)]" : "")} />
                          <span className="flex-1 truncate">{label}</span>
                          {badge != null && badge > 0 && (
                            <span
                              className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center tabular-nums",
                                active ? "bg-[var(--brand)] text-white" : "bg-[var(--danger)] text-white"
                              )}
                            >
                              {badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer — user + signature */}
      <div className="px-3 py-3 border-t border-[var(--sidebar-border)] shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors">
          <div className="w-8 h-8 rounded-full bg-[var(--brand-light)] flex items-center justify-center text-[var(--brand-dark)] text-[11px] font-semibold shrink-0">
            {user ? user.firstName.charAt(0) + user.lastName.charAt(0) : "AB"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[var(--text-primary)] text-[12px] font-medium truncate">
              {user ? `${user.firstName} ${user.lastName}` : "Grace Johnson"}
            </p>
            <p className="text-[var(--text-muted)] text-[11px] truncate capitalize">
              {user ? user.role : "Boss"}
            </p>
          </div>
          {user && (
            <button
              onClick={logout}
              title="Sign out"
              className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors p-1"
            >
              <LogOut className="w-[16px] h-[16px]" />
            </button>
          )}
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-2.5 text-center font-medium tracking-wide">
          KABRAK ENG <span className="text-[var(--brand)]">v2.0</span>
        </p>
      </div>
    </aside>
  );
}
