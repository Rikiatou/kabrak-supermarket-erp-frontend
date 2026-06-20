"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { STORE_INFO } from "../store-info";

type DisplayState = {
  type: "idle" | "cart" | "payment" | "thanks";
  items?: Array<{ name: string; quantity: number; price: number; total: number }>;
  subtotal?: number;
  discount?: number;
  total?: number;
  amountDue?: number;
  change?: number;
  itemCount?: number;
  lastUpdate?: number;
  customer?: { name: string; points: number };
};

function getDisplayState(): DisplayState {
  if (typeof window === "undefined") return { type: "idle" };
  const raw = localStorage.getItem("kabrak_pos_display");
  if (!raw) return { type: "idle" };
  try {
    return JSON.parse(raw) as DisplayState;
  } catch {
    return { type: "idle" };
  }
}

export default function CustomerDisplayPage() {
  const [state, setState] = useState<DisplayState>({ type: "idle" });

  useEffect(() => {
    const update = () => setState(getDisplayState());
    update();
    window.addEventListener("storage", update);
    const interval = setInterval(update, 500); // fallback polling
    return () => {
      window.removeEventListener("storage", update);
      clearInterval(interval);
    };
  }, []);

  if (state.type === "idle") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-[var(--brand)] flex flex-col items-center justify-center text-white p-8">
        <div className="text-center space-y-6">
          <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-6xl font-bold">{STORE_INFO.name.charAt(0)}</span>
          </div>
          <h1 className="text-6xl font-bold">{STORE_INFO.name}</h1>
          <p className="text-2xl opacity-80">Bienvenue · Welcome</p>
          <p className="text-lg opacity-60">{STORE_INFO.address}</p>
        </div>
      </div>
    );
  }

  if (state.type === "thanks") {
    return (
      <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center text-white p-8">
        <div className="text-center space-y-6">
          <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-6xl font-bold">✓</span>
          </div>
          <h1 className="text-6xl font-bold">Merci!</h1>
          <p className="text-3xl opacity-90">Thank you for your purchase</p>
          <p className="text-2xl opacity-80">À bientôt · See you soon</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{STORE_INFO.name}</h1>
          <p className="text-sm text-[var(--text-muted)]">{STORE_INFO.address}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-[var(--text-muted)]">{state.type === "payment" ? "Paiement en cours" : "Votre panier"}</p>
          <p className="text-sm text-[var(--text-muted)]">{state.itemCount} article{state.itemCount !== 1 ? "s" : ""}</p>
          {state.customer && (
            <p className="text-sm font-medium text-[var(--brand)]">{state.customer.name} · {state.customer.points} pts</p>
          )}
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-[var(--border)] overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          {state.items && state.items.length > 0 ? (
            <div className="space-y-4">
              {state.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 border-b border-[var(--border-subtle)]">
                  <div className="flex-1">
                    <p className="text-xl font-medium text-[var(--text-primary)]">{item.name}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {item.quantity} x {formatCurrency(item.price)}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{formatCurrency(item.total)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
              <p className="text-xl">Aucun article en cours</p>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="bg-[var(--brand)] text-white p-8">
          {state.discount && state.discount > 0 && (
            <div className="flex justify-between items-center mb-2 opacity-80">
              <span className="text-lg">Remise</span>
              <span className="text-xl font-bold tabular-nums">-{formatCurrency(state.discount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-2xl font-medium opacity-90">
              {state.type === "payment" ? "TOTAL À PAYER" : "TOTAL"}
            </span>
            <span className="text-6xl font-bold tabular-nums">{formatCurrency(state.total || 0)}</span>
          </div>
          {state.type === "payment" && state.amountDue != null && state.amountDue > 0 && (
            <div className="mt-4 text-right">
              <p className="text-lg opacity-80">Reste à payer: {formatCurrency(state.amountDue)}</p>
            </div>
          )}
          {state.change != null && state.change > 0 && (
            <div className="mt-4 text-right">
              <p className="text-lg opacity-80">Monnaie: {formatCurrency(state.change)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
