"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  Lock,
  Unlock,
  User,
  Clock,
  X,
  Calculator,
  Printer,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/context";
import { formatCurrency, cn } from "@/lib/utils";
import {
  useActiveShifts,
  useOpenShift,
  useCloseShift,
  useEmployees,
} from "@/lib/hooks/useApi";
import { shiftsApi, transactionsApi } from "@/lib/api";
import type { ApiShift, ApiEmployee, ApiZReport } from "@/lib/api";
import { ZReportReceipt } from "@/components/ZReportReceipt";

// ========================================
// MOCK DATA
// ========================================
const REGISTER_KEYS = [
  { id: "reg1", nameKey: "register1" as const },
  { id: "reg2", nameKey: "register2" as const },
  { id: "reg3", nameKey: "register3" as const },
  { id: "reg4", nameKey: "register4" as const },
];

// ========================================
// HELPERS
// ========================================
function employeeName(shift: ApiShift, employees: ApiEmployee[]): string {
  if (shift.employee) {
    const e = shift.employee as unknown as {
      firstName?: string;
      lastName?: string;
      name?: string;
    };
    if (e.firstName || e.lastName) {
      return `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim();
    }
    if (e.name) return e.name;
  }
  const found = employees.find((m) => m.id === shift.employeeId);
  return found ? `${found.firstName} ${found.lastName}` : shift.employeeId;
}

function formatTime(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

// ========================================
// OPEN SHIFT MODAL
// ========================================
function OpenShiftModal({
  registerName,
  defaultEmployeeId,
  employees,
  opening,
  onConfirm,
  onCancel,
}: {
  registerName: string;
  defaultEmployeeId: string;
  employees: ApiEmployee[];
  opening: boolean;
  onConfirm: (employeeId: string, openingCash: number) => void;
  onCancel: () => void;
}) {
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId);
  const [openingCash, setOpeningCash] = useState("100000");
  const { t } = useI18n();

  const cash = Number(openingCash) || 0;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <Card padding="lg" className="w-full max-w-md">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Unlock className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                {t.caisses.open} {registerName}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {t.caisses.startNewShift}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              {t.caisses.responsibleEmployee}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full appearance-none bg-white border border-[var(--border)] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand)] transition-colors"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              {t.caisses.openingCash}
            </label>
            <div className="relative">
              <Wallet className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="number"
                min={0}
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="w-full bg-white border border-[var(--border)] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand)] transition-colors tabular-nums"
              />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1.5">
              {formatCurrency(cash)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            {t.common.cancel}
          </Button>
          <Button
            variant="success"
            className="flex-1"
            loading={opening}
            disabled={!employeeId || cash <= 0}
            onClick={() => onConfirm(employeeId, cash)}
          >
            {t.caisses.openCashier}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ========================================
// CLOSE SHIFT MODAL
// ========================================
function CloseShiftModal({
  registerName,
  shift,
  employees,
  closing,
  expectedCash: initialExpected,
  onConfirm,
  onCancel,
}: {
  registerName: string;
  shift: ApiShift;
  employees: ApiEmployee[];
  closing: boolean;
  expectedCash: number;
  onConfirm: (closingCash: number, expectedCash: number, notes: string) => void;
  onCancel: () => void;
}) {
  const [closingCash, setClosingCash] = useState(
    String(initialExpected),
  );
  const [notes, setNotes] = useState("");
  const { t } = useI18n();

  // expectedCash vient directement du parent (calculé par le Z-report)
  // Pas de useState — on utilise la prop directement
  const expectedNum = initialExpected;
  const closingNum = Number(closingCash) || 0;
  const difference = closingNum - expectedNum;

  // Mettre à jour closingCash quand le Z-report arrive
  useEffect(() => {
    setClosingCash(String(initialExpected));
  }, [initialExpected]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <Card padding="lg" className="w-full max-w-md">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Lock className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                {t.caisses.close} {registerName}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {t.caisses.closeShiftOf} {employeeName(shift, employees)}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">
              {t.caisses.openingFund}
            </span>
            <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
              {formatCurrency(shift.openingCash)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              {t.caisses.expectedCash}
            </label>
            <div className="relative">
              <Calculator className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="number"
                min={0}
                value={initialExpected}
                readOnly
                className="w-full bg-slate-50 border border-[var(--border)] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[var(--text-primary)] outline-none tabular-nums font-semibold"
              />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              {t.caisses.openingCash}: {formatCurrency(shift.openingCash)} + {t.caisses.cash}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              {t.caisses.countedCash}
            </label>
            <div className="relative">
              <Wallet className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="number"
                min={0}
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                className="w-full bg-white border border-[var(--border)] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand)] transition-colors tabular-nums"
              />
            </div>
          </div>

          <div
            className={cn(
              "rounded-xl p-3 flex items-center justify-between border",
              difference === 0
                ? "bg-emerald-50 border-emerald-200"
                : difference > 0
                  ? "bg-blue-50 border-blue-200"
                  : "bg-red-50 border-red-200",
            )}
          >
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {t.caisses.difference}
            </span>
            <span
              className={cn(
                "text-sm font-bold tabular-nums",
                difference === 0
                  ? "text-emerald-700"
                  : difference > 0
                    ? "text-blue-700"
                    : "text-red-700",
              )}
            >
              {difference > 0 ? "+" : ""}
              {formatCurrency(difference)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              {t.caisses.notes}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={t.caisses.notesPh}
              className="w-full bg-white border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand)] transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            {t.common.cancel}
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={closing}
            disabled={closingNum <= 0 || expectedNum <= 0}
            onClick={() => onConfirm(closingNum, expectedNum, notes)}
          >
            {t.caisses.closeCashier}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ========================================
// REGISTER CARD
// ========================================
function RegisterCard({
  register,
  shift,
  employees,
  onOpen,
  onClose,
}: {
  register: { id: string; name: string };
  shift: ApiShift | undefined;
  employees: ApiEmployee[];
  onOpen: () => void;
  onClose?: (shift: ApiShift) => void;
}) {
  const { t } = useI18n();
  const isOpen = !!shift;

  return (
    <Card
      padding="md"
      className={cn(
        "flex flex-col transition-all duration-200",
        isOpen
          ? "border-emerald-200 shadow-[var(--shadow)]"
          : "opacity-90 hover:opacity-100 hover:shadow-[var(--shadow)]",
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center",
              isOpen
                ? "bg-emerald-100 text-emerald-600"
                : "bg-slate-100 text-slate-400",
            )}
          >
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
              {register.name}
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {register.id}
            </p>
          </div>
        </div>
        <Badge variant={isOpen ? "success" : "neutral"} size="sm">
          {isOpen ? t.caisses.registerOpen : t.caisses.registerClosed}
        </Badge>
      </div>

      {isOpen && shift ? (
        <div className="flex-1 flex flex-col">
          <div className="space-y-2.5 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-[var(--text-secondary)] truncate">
                {employeeName(shift, employees)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Wallet className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-[var(--text-muted)]">{t.caisses.funds}</span>
              <span className="font-semibold text-[var(--text-primary)] tabular-nums ml-auto">
                {formatCurrency(shift.openingCash)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-[var(--text-muted)]">{t.caisses.openedAt}</span>
              <span className="font-medium text-[var(--text-primary)] tabular-nums ml-auto">
                {formatTime(shift.openedAt)}
              </span>
            </div>
          </div>
          {onClose ? (
            <Button
              variant="danger"
              className="w-full mt-auto"
              icon={<Lock className="w-4 h-4" />}
              onClick={() => onClose(shift)}
            >
              {t.caisses.close}
            </Button>
          ) : (
            <div className="mt-auto pt-2 text-center text-[11px] text-[var(--text-muted)] bg-slate-50 rounded-lg py-2">
              {t.caisses.registerInUse}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-6">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-xs text-[var(--text-muted)] text-center mb-4">
            {t.caisses.noRegisterOpen}
          </p>
          <Button
            variant="success"
            className="w-full"
            icon={<Unlock className="w-4 h-4" />}
            onClick={onOpen}
          >
            {t.caisses.open}
          </Button>
        </div>
      )}
    </Card>
  );
}

// ========================================
// PAGE
// ========================================
export default function CaissesPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: shifts, loading, reload } = useActiveShifts();
  const { open, opening } = useOpenShift();
  const { close, closing } = useCloseShift();
  const { employees } = useEmployees();

  // Build REGISTERS with translated names
  const REGISTERS = REGISTER_KEYS.map(rk => ({ id: rk.id, name: t.common[rk.nameKey] }));

  // Roles qui voient TOUT (boss, manager, supervisor, accountant)
  const isManager = ["boss", "manager", "supervisor", "accountant"].includes(user?.role ?? "");

  // Filtrer les employés qui peuvent ouvrir une caisse
  const cashiers = employees.filter((e) =>
    ["cashier", "supervisor", "manager"].includes(e.role) && e.status === "active"
  );

  const [openRegister, setOpenRegister] = useState<string | null>(null);
  const [closeShift, setCloseShift] = useState<ApiShift | null>(null);
  const [zReport, setZReport] = useState<ApiZReport | null>(null);
  const [loadingZReport, setLoadingZReport] = useState(false);
  const [closeExpectedCash, setCloseExpectedCash] = useState<number>(0);
  const [loadingCloseSummary, setLoadingCloseSummary] = useState(false);
  const [pastShifts, setPastShifts] = useState<ApiShift[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [reprintLoading, setReprintLoading] = useState<string | null>(null);
  // Filtres historique Z-report: par caissier et par date
  const [histCashier, setHistCashier] = useState<string>("");
  const [histDate, setHistDate] = useState<string>("");
  const [dailyReportLoading, setDailyReportLoading] = useState(false);

  // Map registerId -> active shift
  const shiftByRegister = useMemo(() => {
    const map = new Map<string, ApiShift>();
    if (shifts) {
      for (const s of shifts) {
        map.set(s.registerId, s);
      }
    }
    return map;
  }, [shifts]);

  // Shift propre au caissier connecté (si role cashier)
  const myShift = useMemo(() =>
    shifts?.find((s) => s.employeeId === user?.id && s.status === "open") ?? null,
  [shifts, user]);

  // Registres visibles selon le rôle:
  // — manager/boss/accountant: tous les registres
  // — cashier avec shift ouvert: seulement son registre
  // — cashier sans shift: aucun register affiché (UI dédiée à la place)
  const visibleRegisters = useMemo(() => {
    if (isManager) return REGISTERS;
    if (myShift) return REGISTERS.filter((r) => r.id === myShift.registerId);
    return []; // cashier sans shift: UI dédiée (pas de grille de 4 cartes)
  }, [isManager, myShift, REGISTERS]);

  // Registres disponibles (libres) pour le cashier qui ouvre son shift
  const freeRegisters = useMemo(() =>
    REGISTERS.filter((r) => !shiftByRegister.has(r.id)),
  [shiftByRegister, REGISTERS]);

  const openCount = shiftByRegister.size;
  const totalRevenue = useMemo(() => {
    if (!shifts) return 0;
    return shifts.reduce(
      (sum, s) => sum + Math.max(0, (s.closingCash ?? 0) - s.openingCash),
      0,
    );
  }, [shifts]);
  const totalDifference = useMemo(() => {
    if (!shifts) return 0;
    return shifts.reduce((sum, s) => sum + (s.difference ?? 0), 0);
  }, [shifts]);

  const defaultEmployeeId = user?.id ?? cashiers[0]?.id ?? "";

  // Quand on clique sur "Fermer", calculer le expected cash depuis les transactions
  const handleCloseClick = async (shift: ApiShift) => {
    setCloseShift(shift);
    setLoadingCloseSummary(true);
    setCloseExpectedCash(shift.openingCash); // fallback initial
    try {
      // Récupérer les transactions de cet employé
      const response = await transactionsApi.list(1, 200, shift.employeeId);
      const shiftStart = new Date(shift.openedAt).getTime();
      const now = Date.now();

      // Filtrer les transactions dans la période du shift
      const shiftTx = response.data.filter((tx) => {
        const txTime = new Date(tx.date).getTime();
        return txTime >= shiftStart && txTime <= now && tx.status === "completed";
      });

      // Calculer le expected total = ouverture + toutes les ventes - monnaie rendue
      const cashSales = shiftTx
        .filter((tx) => tx.paymentMethod === "cash")
        .reduce((sum, tx) => sum + (tx.cashGiven || tx.total), 0);
      const cardSales = shiftTx
        .filter((tx) => tx.paymentMethod === "card")
        .reduce((sum, tx) => sum + tx.total, 0);
      const mobileSales = shiftTx
        .filter((tx) => tx.paymentMethod === "mobile")
        .reduce((sum, tx) => sum + tx.total, 0);
      const orangeSales = shiftTx
        .filter((tx) => tx.paymentMethod === "orange")
        .reduce((sum, tx) => sum + tx.total, 0);
      const changeGiven = shiftTx.reduce((sum, tx) => sum + (tx.change || 0), 0);
      const expected = shift.openingCash + cashSales + cardSales + mobileSales + orangeSales - changeGiven;

      console.log("Close shift calc:", { openingCash: shift.openingCash, cashSales, changeGiven, expected, txCount: shiftTx.length });
      setCloseExpectedCash(expected);

      if (shiftTx.length > 0) {
        toast(t.caisses.salesCountExpected.replace("{n}", String(shiftTx.length)).replace("{amount}", formatCurrency(expected)), "info");
      }
    } catch (e: any) {
      console.error("Failed to calculate expected cash:", e?.message);
      // Essayer le Z-report en fallback
      try {
        const report = await shiftsApi.zReport(shift.id);
        setCloseExpectedCash(report.totalExpected || report.cashDrawerTotal);
        if (report.customerCount > 0) {
          toast(t.caisses.salesCountExpected.replace("{n}", String(report.customerCount)).replace("{amount}", formatCurrency(report.totalExpected || report.cashDrawerTotal)), "info");
        }
      } catch {
        toast(t.caisses.expectedCashFallback, "warning");
      }
    } finally {
      setLoadingCloseSummary(false);
    }
  };

  const handleOpen = async (employeeId: string, openingCash: number) => {
    if (!openRegister) return;
    const reg = REGISTERS.find((r) => r.id === openRegister);
    const emp = cashiers.find((e) => e.id === employeeId);
    try {
      await open({
        registerId: openRegister,
        registerName: reg?.name ?? openRegister,
        employeeId,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : employeeId,
        openingCash,
      });
      toast(t.caisses.successOpen, "success");
      setOpenRegister(null);
      reload();
    } catch (e) {
      toast(t.caisses.errorOpen, "warning");
    }
  };

  const handleClose = async (
    closingCash: number,
    expectedCash: number,
    notes: string,
  ) => {
    if (!closeShift) return;
    try {
      await close(closeShift.id, { closingCash, expectedCash, notes });
      toast(t.caisses.successClose, "success");
      setCloseShift(null);
      reload();
      // Fetch Z-report
      setLoadingZReport(true);
      try {
        const report = await shiftsApi.zReport(closeShift.id);
        setZReport(report);
      } catch {
        toast(t.caisses.errorClose, "warning");
      } finally {
        setLoadingZReport(false);
      }
    } catch (e) {
      toast(t.caisses.errorClose, "warning");
    }
  };

  // Charger les shifts passés (fermés) — triés du plus récent au plus ancien
  const loadPastShifts = async () => {
    try {
      const all = await shiftsApi.list();
      const closed = all
        .filter((s) => s.status === "closed")
        .sort((a, b) => new Date(b.closedAt || b.openedAt).getTime() - new Date(a.closedAt || a.openedAt).getTime());
      setPastShifts(closed);
    } catch {
      setPastShifts([]);
    }
  };

  // Historique filtré par caissier et/ou par date
  const filteredPastShifts = useMemo(() => {
    return pastShifts.filter((s) => {
      if (histCashier && s.employeeId !== histCashier) return false;
      if (histDate) {
        const ref = s.closedAt || s.openedAt;
        if (!ref) return false;
        // Comparer sur la date locale (yyyy-mm-dd)
        const d = new Date(ref);
        const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (localDate !== histDate) return false;
      }
      return true;
    });
  }, [pastShifts, histCashier, histDate]);

  // Réimprimer un Z-report
  const reprintZReport = async (shiftId: string) => {
    setReprintLoading(shiftId);
    try {
      const report = await shiftsApi.zReport(shiftId);
      setZReport(report);
    } catch {
      toast("Erreur: impossible de charger le Z-report", "warning");
    } finally {
      setReprintLoading(null);
    }
  };

  // Z-Report journalier par caissier (sans dépendre des shifts)
  const generateDailyZReport = async () => {
    if (!histCashier || !histDate) {
      toast("Sélectionnez un caissier et une date", "warning");
      return;
    }
    setDailyReportLoading(true);
    try {
      const report = await shiftsApi.dailyZReport(histCashier, histDate);
      setZReport(report);
    } catch {
      toast("Erreur: impossible de générer le Z-report journalier", "warning");
    } finally {
      setDailyReportLoading(false);
    }
  };

  const kpis = [
    {
      label: t.caisses.openRegisters,
      value: `${openCount} / ${REGISTERS.length}`,
      icon: <Wallet className="w-5 h-5" />,
      tone: "text-emerald-600 bg-emerald-100",
    },
    {
      label: t.caisses.totalRegisterRevenue,
      value: formatCurrency(totalRevenue),
      icon: <TrendingUp className="w-5 h-5" />,
      tone: "text-blue-600 bg-blue-100",
    },
    {
      label: t.caisses.totalDifferences,
      value: formatCurrency(totalDifference),
      icon: <AlertTriangle className="w-5 h-5" />,
      tone:
        totalDifference === 0
          ? "text-slate-600 bg-slate-100"
          : totalDifference > 0
            ? "text-blue-600 bg-blue-100"
            : "text-red-600 bg-red-100",
    },
  ];

  return (
    <AppShell
      title={t.caisses.title}
      subtitle={t.caisses.subtitle}
    >
      {/* KPI Cards — managers/boss seulement */}
      {isManager && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {kpis.map((kpi) => (
            <Card key={kpi.label} padding="md">
              <div className="flex items-center gap-3">
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", kpi.tone)}>
                  {kpi.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums leading-none truncate">{kpi.value}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{kpi.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Cashier: pas de shift ouvert → UI dédiée d'ouverture ── */}
      {!isManager && !myShift && (
        <div className="flex flex-col items-center justify-center py-16 gap-6">
          <div className="w-20 h-20 rounded-2xl bg-amber-100 flex items-center justify-center">
            <Wallet className="w-10 h-10 text-amber-500" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{t.caisses.noShiftForMe}</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1 max-w-xs">{t.caisses.noShiftHint}</p>
          </div>
          {freeRegisters.length > 0 ? (
            <div className="flex flex-col gap-3 w-full max-w-xs">
              {freeRegisters.map((reg) => (
                <button
                  key={reg.id}
                  onClick={() => setOpenRegister(reg.id)}
                  className="w-full h-14 bg-[#16a34a] hover:bg-[#15803d] text-white text-[15px] font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(22,163,74,.3)] flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  <Unlock className="w-5 h-5" />
                  {t.caisses.open} — {reg.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)] bg-slate-50 border border-[var(--border)] rounded-xl px-6 py-3">
              {t.caisses.noRegisterOpen}
            </p>
          )}
        </div>
      )}

      {/* ── Cashier: shift ouvert → sa seule caisse ── */}
      {/* ── Manager: grille de toutes les caisses ── */}
      {(isManager || myShift) && (
        <div className={cn(
          "grid gap-4",
          isManager ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 max-w-sm"
        )}>
          {visibleRegisters.map((register) => {
            const shift = shiftByRegister.get(register.id);
            const canClose = isManager || (shift?.employeeId === user?.id);
            return (
              <RegisterCard
                key={register.id}
                register={register}
                shift={shift}
                employees={employees}
                onOpen={() => setOpenRegister(register.id)}
                onClose={canClose ? (s) => handleCloseClick(s) : undefined}
              />
            );
          })}
        </div>
      )}

      {/* Loading overlay hint */}
      {loading && shifts === null && (
        <p className="text-xs text-[var(--text-muted)] text-center mt-6">
          {t.caisses.loadingRegisters}
        </p>
      )}

      {/* Z-Report History — Reprint past Z-reports (accessible à tous: manager ET caissiers) */}
      {(
        <div className="mt-6">
          <button
            onClick={() => {
              if (!showHistory) loadPastShifts();
              setShowHistory(!showHistory);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--brand-light)] text-[var(--brand)] rounded-xl font-semibold text-sm hover:opacity-80 transition-opacity"
          >
            <Printer className="w-4 h-4" />
            {showHistory ? "Masquer l'historique" : "Réimprimer un Z-Report"}
          </button>

          {showHistory && (
            <div className="mt-3 bg-white border border-[var(--border)] rounded-xl overflow-hidden">
              {/* Filtres: par caissier + par date */}
              <div className="flex flex-wrap items-end gap-3 px-4 py-3 border-b border-[var(--border)] bg-slate-50">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Caissier</label>
                  <select
                    value={histCashier}
                    onChange={(e) => setHistCashier(e.target.value)}
                    className="bg-white border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--brand)]"
                  >
                    <option value="">Tous les caissiers</option>
                    {cashiers.map((c) => (
                      <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Date</label>
                  <input
                    type="date"
                    value={histDate}
                    onChange={(e) => setHistDate(e.target.value)}
                    className="bg-white border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--brand)]"
                  />
                </div>
                {(histCashier || histDate) && (
                  <button
                    onClick={() => { setHistCashier(""); setHistDate(""); }}
                    className="px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] underline"
                  >
                    Réinitialiser
                  </button>
                )}
                <button
                  onClick={generateDailyZReport}
                  disabled={!histCashier || !histDate || dailyReportLoading}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Génère un Z-Report pour ce caissier à cette date, indépendamment des shifts"
                >
                  {dailyReportLoading ? "..." : "Z-Report journalier"}
                </button>
                <span className="ml-auto text-xs text-[var(--text-muted)] self-center">
                  {filteredPastShifts.length} shift(s)
                </span>
              </div>
              {filteredPastShifts.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">Aucun shift fermé trouvé.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-[var(--border)]">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-xs text-[var(--text-muted)] uppercase">Caisse</th>
                      <th className="px-4 py-2 text-left font-semibold text-xs text-[var(--text-muted)] uppercase">Caissier</th>
                      <th className="px-4 py-2 text-left font-semibold text-xs text-[var(--text-muted)] uppercase">Ouvert</th>
                      <th className="px-4 py-2 text-left font-semibold text-xs text-[var(--text-muted)] uppercase">Fermé</th>
                      <th className="px-4 py-2 text-right font-semibold text-xs text-[var(--text-muted)] uppercase">Total</th>
                      <th className="px-4 py-2 text-center font-semibold text-xs text-[var(--text-muted)] uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPastShifts.map((s) => {
                      const emp = employees.find((e) => e.id === s.employeeId);
                      const reg = REGISTERS.find((r) => r.id === s.registerId);
                      return (
                        <tr key={s.id} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50">
                          <td className="px-4 py-2.5">{reg?.name ?? s.registerId}</td>
                          <td className="px-4 py-2.5">{emp ? `${emp.firstName} ${emp.lastName}` : s.employeeId}</td>
                          <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">{s.openedAt ? new Date(s.openedAt).toLocaleString("fr-FR") : "—"}</td>
                          <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">{s.closedAt ? new Date(s.closedAt).toLocaleString("fr-FR") : "—"}</td>
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatCurrency(s.closingCash ?? 0)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              onClick={() => reprintZReport(s.id)}
                              disabled={reprintLoading === s.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand)] text-white rounded-lg text-xs font-semibold hover:opacity-80 disabled:opacity-50"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              {reprintLoading === s.id ? "..." : "Z-Report"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* Open Shift Modal */}
      {openRegister && (
        <OpenShiftModal
          registerName={
            REGISTERS.find((r) => r.id === openRegister)?.name ?? openRegister
          }
          defaultEmployeeId={defaultEmployeeId}
          employees={cashiers}
          opening={opening}
          onConfirm={handleOpen}
          onCancel={() => setOpenRegister(null)}
        />
      )}

      {/* Close Shift Modal */}
      {closeShift && (
        <CloseShiftModal
          registerName={
            REGISTERS.find((r) => r.id === closeShift.registerId)?.name ??
            closeShift.registerId
          }
          shift={closeShift}
          employees={employees}
          closing={closing}
          expectedCash={closeExpectedCash}
          onConfirm={handleClose}
          onCancel={() => setCloseShift(null)}
        />
      )}

      {/* Z-Report after close */}
      {zReport && (
        <ZReportReceipt
          report={{
            ...zReport,
            registerName: REGISTERS.find((r) => r.id === zReport.registerId)?.name ?? zReport.registerName,
          }}
          onClose={() => setZReport(null)}
        />
      )}
    </AppShell>
  );
}
