"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AppShell({ children, title, subtitle }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fermer le drawer quand on redimensionne vers desktop
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = () => setDrawerOpen(false);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar desktop - fixe sur lg+ */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Sidebar mobile - drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed left-0 top-0 h-screen z-50 lg:hidden animate-in slide-in-from-left">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0 lg:ml-[260px] w-full">
        <Topbar
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setDrawerOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>

        {/* Bottom nav mobile uniquement */}
        <MobileNav />
      </div>
    </div>
  );
}
