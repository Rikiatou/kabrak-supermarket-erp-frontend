"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { authApi, type ApiCashier } from "@/lib/api";
import { ROLE_HOME, type Role } from "@/lib/auth/roles";

import { useI18n } from "@/lib/i18n/context";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isAuthenticated, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [cashiers, setCashiers] = useState<ApiCashier[]>([]);
  const [selectedCashier, setSelectedCashier] = useState<ApiCashier | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null); // timestamp ms
  const [lockRemaining, setLockRemaining] = useState(0); // secondes restantes

  // Rediriger si déjà connecté
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const role = user?.role as Role;
      router.push(ROLE_HOME[role] || "/dashboard");
    }
  }, [authLoading, isAuthenticated, router, user]);

  // Charger la liste des caissiers
  useEffect(() => {
    authApi.listCashiers().then(setCashiers).catch(() => {});
  }, []);

  // Compte à rebours si verrouillé
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setLockRemaining(0);
        setAttemptsLeft(null);
        setError("");
      } else {
        setLockRemaining(remaining);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && lockRemaining > 0;

  const handleLogin = async () => {
    if (!selectedCashier || !pin) {
      setError(t.login.errorSelectEmployee);
      return;
    }
    if (isLocked) return;

    setLoading(true);
    setError("");

    const success = await login(selectedCashier.employeeNumber, pin);

    if (success) {
      setAttemptsLeft(null);
      const role = selectedCashier.role as Role;
      router.push(ROLE_HOME[role] || "/dashboard");
    } else {
      // Tentative échouée — afficher tentatives restantes
      setAttemptsLeft((prev) => (prev === null ? 4 : Math.max(0, prev - 1)));
      setError(t.login.errorIncorrectPin);
      setPin("");
    }
    setLoading(false);
  };

  const handlePinClick = (digit: string) => {
    if (isLocked) return;
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        // Auto-submit quand 4 chiffres
        setTimeout(() => handleLoginWithPin(newPin), 200);
      }
    }
  };

  const handleLoginWithPin = async (pinValue: string) => {
    if (!selectedCashier) return;
    if (isLocked) return;
    setLoading(true);
    setError("");
    const success = await login(selectedCashier.employeeNumber, pinValue);
    if (success) {
      setAttemptsLeft(null);
      const role = selectedCashier.role as Role;
      router.push(ROLE_HOME[role] || "/dashboard");
    } else {
      // Après 5 tentatives: verrouiller 10 min
      setAttemptsLeft((prev) => {
        const newCount = prev === null ? 4 : Math.max(0, prev - 1);
        if (newCount === 0) {
          // Verrouiller 10 minutes
          setLockedUntil(Date.now() + 10 * 60 * 1000);
          setError("Too many attempts. Account locked for 10 minutes.");
        } else {
          setError(`Incorrect PIN — ${newCount} attempt${newCount > 1 ? "s" : ""} left`);
        }
        return newCount;
      });
      setPin("");
    }
    setLoading(false);
  };

  const handleClear = () => setPin("");
  const handleBackspace = () => setPin(pin.slice(0, -1));

  return (
    <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center p-4">
      <div className="w-full max-w-[340px]">

        {/* Header brand */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#16a34a] shadow-[0_4px_14px_rgba(22,163,74,.3)] mx-auto mb-4">
            <span className="text-white font-bold text-[20px] tracking-tight">K</span>
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#111827]">KABRAK ENG</h1>
          <p className="text-[13px] text-[#9ca3af] mt-1">{t.login.subtitle}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-[0_1px_3px_rgba(0,0,0,.06)] overflow-hidden">

          {/* Step 1: Select employee */}
          {!selectedCashier && (
            <div>
              <div className="px-5 pt-5 pb-3">
                <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-widest">
                  {t.login.selectProfile}
                </p>
              </div>
              <div className="px-2 pb-2 max-h-72 overflow-y-auto">
                {cashiers.length === 0 ? (
                  <div className="flex flex-col items-center py-10 gap-2">
                    <Loader2 className="w-4 h-4 text-[#d1d5db] animate-spin" />
                    <p className="text-[12px] text-[#9ca3af]">{t.login.loading}</p>
                  </div>
                ) : (
                  cashiers.map((cashier) => (
                    <button
                      key={cashier.id}
                      onClick={() => setSelectedCashier(cashier)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#f0fdf4] active:bg-[#dcfce7] transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#dcfce7] flex items-center justify-center text-[12px] font-bold text-[#15803d] shrink-0">
                        {cashier.firstName.charAt(0)}{cashier.lastName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-[#111827] truncate group-hover:text-[#15803d] transition-colors">
                          {cashier.firstName} {cashier.lastName}
                        </p>
                        <p className="text-[11px] text-[#9ca3af] capitalize">
                          {cashier.role}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 2: PIN */}
          {selectedCashier && (
            <div className="p-5">

              {/* Selected profile */}
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-9 h-9 rounded-full bg-[#dcfce7] flex items-center justify-center text-[12px] font-bold text-[#15803d] shrink-0">
                  {selectedCashier.firstName.charAt(0)}{selectedCashier.lastName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#111827] truncate">
                    {selectedCashier.firstName} {selectedCashier.lastName}
                  </p>
                  <p className="text-[11px] text-[#9ca3af] capitalize">{selectedCashier.role}</p>
                </div>
                <button
                  onClick={() => { setSelectedCashier(null); setPin(""); setError(""); }}
                  className="text-[12px] text-[#9ca3af] hover:text-[#16a34a] transition-colors shrink-0 font-medium"
                >
                  {t.login.change}
                </button>
              </div>

              {/* PIN dots */}
              <div className="flex justify-center gap-4 mb-5">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all duration-150 ${
                      pin.length > i ? "bg-[#16a34a] scale-110" : "bg-[#e5e7eb]"
                    }`}
                  />
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center justify-center gap-1.5 text-[12px] text-[#dc2626] mb-4">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                  {isLocked && (
                    <span className="font-mono font-semibold ml-1">
                      {Math.floor(lockRemaining / 60)}:{String(lockRemaining % 60).padStart(2, "0")}
                    </span>
                  )}
                </div>
              )}

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9"].map((d) => (
                  <button
                    key={d}
                    onClick={() => handlePinClick(d)}
                    disabled={loading || isLocked}
                    className="py-3.5 rounded-lg bg-[#f9fafb] hover:bg-[#f0fdf4] active:bg-[#dcfce7] active:scale-95 transition-all text-[18px] font-semibold text-[#111827] disabled:opacity-30 border border-[#e5e7eb] hover:border-[#86efac]"
                  >
                    {d}
                  </button>
                ))}
                <div />
                <button
                  onClick={() => handlePinClick("0")}
                  disabled={loading || isLocked}
                  className="py-3.5 rounded-lg bg-[#f9fafb] hover:bg-[#f0fdf4] active:bg-[#dcfce7] active:scale-95 transition-all text-[18px] font-semibold text-[#111827] disabled:opacity-30 border border-[#e5e7eb] hover:border-[#86efac]"
                >
                  0
                </button>
                <button
                  onClick={handleBackspace}
                  disabled={loading || !pin || isLocked}
                  className="py-3.5 rounded-lg bg-[#f9fafb] hover:bg-[#fee2e2] active:scale-95 transition-all text-[16px] text-[#9ca3af] hover:text-[#dc2626] disabled:opacity-30 border border-[#e5e7eb]"
                >
                  ⌫
                </button>
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 mt-4 text-[12px] text-[#16a34a]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t.login.connecting}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Demo credentials panel — REMOVED for production */}
        {false && (
          <div className="mt-4 bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
          <div className="divide-y divide-[#f9fafb]">
            {([] as { name: string; role: string; pin: string; emp: string; bg: string; text: string }[]).map((demo) => (
              <button
                key={demo.emp}
                onClick={() => {}}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#f9fafb] transition-colors text-left"
              >
                <div className={`w-7 h-7 rounded-full ${demo.bg} flex items-center justify-center text-[11px] font-bold ${demo.text} shrink-0`}>
                  {demo.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#111827] truncate leading-tight">{demo.name}</p>
                  <p className="text-[10px] text-[#9ca3af]">{demo.role}</p>
                </div>
                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${demo.bg} ${demo.text}`}>
                  {demo.pin}
                </span>
              </button>
            ))}
          </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[11px] text-[#d1d5db] mt-5 font-medium tracking-wide">
          KABRAK ENG <span className="text-[#16a34a]">v2.0</span>
        </p>
      </div>
    </div>
  );
}
