"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { authApi, type ApiCashier } from "@/lib/api";
import { ROLE_HOME, type Role } from "@/lib/auth/roles";
import { Button } from "@/components/ui/Button";
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
          setError("Trop de tentatives. Compte verrouillé 10 minutes.");
        } else {
          setError(`PIN incorrect — ${newCount} tentative${newCount > 1 ? "s" : ""} restante${newCount > 1 ? "s" : ""}`);
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
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <img
            src="/kabrak-logo.jpeg"
            alt="KABRAK"
            className="w-14 h-14 rounded-2xl object-cover mx-auto mb-4 shadow-sm border border-neutral-100"
          />
          <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900">{t.login.appName}</h1>
          <p className="text-[13px] text-neutral-400 mt-1">{t.login.subtitle}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
          {/* Step 1: Select employee */}
          {!selectedCashier && (
            <>
              <h2 className="text-[13px] font-medium text-neutral-500 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> {t.login.selectProfile}
              </h2>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {cashiers.length === 0 ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-5 h-5 text-neutral-300 animate-spin mx-auto mb-2" />
                    <p className="text-[12px] text-neutral-400">{t.login.loading}</p>
                  </div>
                ) : (
                  cashiers.map((cashier) => (
                    <button
                      key={cashier.id}
                      onClick={() => setSelectedCashier(cashier)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-[13px] font-semibold text-neutral-600">
                        {cashier.firstName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-[14px] font-medium text-neutral-900">
                          {cashier.firstName} {cashier.lastName}
                        </p>
                        <p className="text-[12px] text-neutral-400 capitalize">
                          {cashier.role} · {cashier.department}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          {/* Step 2: PIN */}
          {selectedCashier && (
            <>
              {/* Selected profile */}
              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl mb-5">
                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-[14px] font-semibold text-neutral-600">
                  {selectedCashier.firstName.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-neutral-900">
                    {selectedCashier.firstName} {selectedCashier.lastName}
                  </p>
                  <p className="text-[12px] text-neutral-400 capitalize">
                    {selectedCashier.role}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedCashier(null);
                    setPin("");
                    setError("");
                  }}
                  className="text-[12px] text-neutral-400 hover:text-neutral-700 transition-colors"
                >
                  {t.login.change}
                </button>
              </div>

              {/* PIN display */}
              <div className="flex justify-center gap-3 mb-6">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-11 h-11 rounded-xl border flex items-center justify-center text-[20px] font-semibold transition-all ${
                      pin.length > i
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 text-neutral-300"
                    }`}
                  >
                    {pin.length > i ? "●" : ""}
                  </div>
                ))}
              </div>

              {error && (
                <div className={`flex items-center gap-2 text-[12px] mb-4 justify-center ${isLocked ? "text-red-600" : "text-red-500"}`}>
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                  {isLocked && (
                    <span className="font-mono font-medium">
                      {Math.floor(lockRemaining / 60)}:{String(lockRemaining % 60).padStart(2, "0")}
                    </span>
                  )}
                </div>
              )}

              {!isLocked && attemptsLeft !== null && attemptsLeft > 0 && (
                <div className="flex justify-center gap-1.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${i < attemptsLeft ? "bg-amber-400" : "bg-neutral-200"}`}
                    />
                  ))}
                </div>
              )}

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                  <button
                    key={d}
                    onClick={() => handlePinClick(d)}
                    disabled={loading || isLocked}
                    className="h-13 py-3.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 active:scale-95 transition-all text-[18px] font-medium text-neutral-800 disabled:opacity-40"
                  >
                    {d}
                  </button>
                ))}
                <button
                  onClick={handleBackspace}
                  disabled={loading || !pin || isLocked}
                  className="h-13 py-3.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 active:scale-95 transition-all text-[13px] font-medium text-neutral-400 disabled:opacity-40"
                >
                  {t.login.clear}
                </button>
                <button
                  onClick={() => handlePinClick("0")}
                  disabled={loading || isLocked}
                  className="h-13 py-3.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 active:scale-95 transition-all text-[18px] font-medium text-neutral-800 disabled:opacity-40"
                >
                  0
                </button>
                <button
                  onClick={handleBackspace}
                  disabled={loading || !pin || isLocked}
                  className="h-13 py-3.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 active:scale-95 transition-all text-[14px] font-medium text-neutral-400 disabled:opacity-40"
                >
                  ⌫
                </button>
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 mt-4 text-[13px] text-neutral-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.login.connecting}
                </div>
              )}
            </>
          )}
        </div>

        {/* Test accounts */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-neutral-400 mb-2">{t.login.testAccounts}</p>
          <div className="text-[11px] text-neutral-400 space-y-0.5">
            <p>{t.login.testManager}</p>
            <p>{t.login.testCashier}</p>
            <p>{t.login.testCashier2}</p>
            <p>{t.login.testStocker}</p>
            <p>{t.login.testAccountant}</p>
          </div>
        </div>

        {/* Powered by */}
        <p className="text-center text-[11px] text-neutral-300 mt-6">
          Powered by KABRAK eng
        </p>
      </div>
    </div>
  );
}
