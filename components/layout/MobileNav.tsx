"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Package, BarChart3, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/pos", label: "Caisse", icon: ShoppingCart },
  { href: "/stocks", label: "Stock", icon: Package },
  { href: "/rapports", label: "Rapports", icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] z-30 safe-area-pb">
      <div className="flex items-center justify-around h-14 px-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-[56px]",
                active ? "text-[var(--brand)]" : "text-[var(--text-muted)]"
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span className={cn("text-[10px] font-medium", active && "font-semibold")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
