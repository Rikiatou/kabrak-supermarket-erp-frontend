"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Loader2, AlertCircle, ShoppingBag } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-3">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t.login.appName}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.login.subtitle}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
          {/* Étape 1: Sélection employé */}
          {!selectedCashier && (
            <>
              <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> {t.login.selectProfile}
              </h2>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {cashiers.length === 0 ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-400">{t.login.loading}</p>
                  </div>
                ) : (
                  cashiers.map((cashier) => (
                    <button
                      key={cashier.id}
                      onClick={() => setSelectedCashier(cashier)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                        {cashier.firstName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {cashier.firstName} {cashier.lastName}
                        </p>
                        <p className="text-xs text-slate-500 capitalize">
                          {cashier.role} · {cashier.department}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          {/* Étape 2: PIN */}
          {selectedCashier && (
            <>
              {/* Profil sélectionné */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-base font-bold">
                  {selectedCashier.firstName.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedCashier.firstName} {selectedCashier.lastName}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">
                    {selectedCashier.role}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedCashier(null);
                    setPin("");
                    setError("");
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  {t.login.change}
                </button>
              </div>

              {/* PIN display */}
              <div className="flex justify-center gap-3 mb-6">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                      pin.length > i
                        ? "border-blue-500 bg-blue-50 text-blue-600"
                        : "border-slate-200 text-slate-300"
                    }`}
                  >
                    {pin.length > i ? "●" : "–"}
                  </div>
                ))}
              </div>

              {error && (
                <div className={`flex items-center gap-2 text-xs mb-4 justify-center ${isLocked ? "text-red-700" : "text-red-600"}`}>
                  <AlertCircle className="w-4 h-4" />
                  {error}
                  {isLocked && (
                    <span className="font-mono font-bold">
                      {Math.floor(lockRemaining / 60)}:{String(lockRemaining % 60).padStart(2, "0")}
                    </span>
                  )}
                </div>
              )}

              {!isLocked && attemptsLeft !== null && attemptsLeft > 0 && (
                <div className="flex justify-center gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${i < attemptsLeft ? "bg-amber-400" : "bg-slate-200"}`}
                    />
                  ))}
                </div>
              )}

              {/* Pavé numérique */}
              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                  <button
                    key={d}
                    onClick={() => handlePinClick(d)}
                    disabled={loading || isLocked}
                    className="h-14 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all text-xl font-semibold text-slate-700 disabled:opacity-50"
                  >
                    {d}
                  </button>
                ))}
                <button
                  onClick={handleBackspace}
                  disabled={loading || !pin || isLocked}
                  className="h-14 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all text-sm font-medium text-slate-500 disabled:opacity-50"
                >
                  ⌫
                </button>
                <button
                  onClick={() => handlePinClick("0")}
                  disabled={loading || isLocked}
                  className="h-14 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all text-xl font-semibold text-slate-700 disabled:opacity-50"
                >
                  0
                </button>
                <button
                  onClick={handleClear}
                  disabled={loading || !pin || isLocked}
                  className="h-14 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all text-sm font-medium text-slate-500 disabled:opacity-50"
                >
                  {t.login.clear}
                </button>
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.login.connecting}
                </div>
              )}
            </>
          )}
        </div>

        {/* Test accounts */}
        <div className="mt-4 bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
          <p className="font-semibold mb-1">{t.login.testAccounts}</p>
          <p>{t.login.testManager}</p>
          <p>{t.login.testCashier}</p>
          <p>{t.login.testCashier2}</p>
          <p>{t.login.testStocker}</p>
          <p>{t.login.testAccountant}</p>
        </div>
      </div>
    </div>
  );
}
