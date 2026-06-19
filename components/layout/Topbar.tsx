"use client";

import { Bell, Search, Wifi, WifiOff, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";

interface TopbarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export function Topbar({ title, subtitle, onMenuClick }: TopbarProps) {
  const { t } = useI18n();
  const [now, setNow] = useState(new Date());
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60000);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      clearInterval(tick);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <header className="h-14 lg:h-16 bg-white border-b border-[var(--border)] flex items-center px-3 lg:px-6 gap-2 lg:gap-4 sticky top-0 z-30">
      {/* Menu button - mobile only */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--surface-hover)] transition-colors shrink-0"
        >
          <Menu className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
      )}

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm lg:text-[15px] font-semibold text-[var(--text-primary)] leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] lg:text-xs text-[var(--text-muted)] mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      {/* Search - desktop only */}
      <div className="hidden md:flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2 w-56 group focus-within:border-[var(--brand)] transition-colors">
        <Search className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
        <input
          type="text"
          placeholder={t.topbar.search}
          className="bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] flex-1 outline-none min-w-0"
        />
        <kbd className="text-[10px] text-[var(--text-muted)] bg-white border border-[var(--border)] rounded px-1 py-0.5 font-mono hidden group-focus-within:hidden">
          ⌘K
        </kbd>
      </div>

      {/* Connection status */}
      <div
        className={cn(
          "hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg",
          online
            ? "bg-[var(--success-light)] text-emerald-700"
            : "bg-[var(--danger-light)] text-red-700"
        )}
      >
        {online ? (
          <Wifi className="w-3.5 h-3.5" />
        ) : (
          <WifiOff className="w-3.5 h-3.5" />
        )}
        <span>{online ? t.topbar.online : t.topbar.offline}</span>
      </div>

      {/* Date / time - desktop only */}
      <div className="hidden lg:block text-right shrink-0">
        <p className="text-xs font-medium text-[var(--text-primary)] tabular-nums">
          {formatTime(now)}
        </p>
        <p className="text-[11px] text-[var(--text-muted)]">{formatDate(now)}</p>
      </div>

      {/* Notifications */}
      <button className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--surface-hover)] transition-colors shrink-0">
        <Bell className="w-4.5 h-4.5 text-[var(--text-secondary)]" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--danger)] rounded-full ring-2 ring-white" />
      </button>
    </header>
  );
}
