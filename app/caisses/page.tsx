"use client";

import { useState, useMemo } from "react";
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
import type { ApiShift, ApiEmployee } from "@/lib/api";

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
  const [openingCash, setOpeningCash] = useState("0");
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
  onConfirm,
  onCancel,
}: {
  registerName: string;
  shift: ApiShift;
  employees: ApiEmployee[];
  closing: boolean;
  onConfirm: (closingCash: number, expectedCash: number, notes: string) => void;
  onCancel: () => void;
}) {
  const [closingCash, setClosingCash] = useState(
    String(shift.openingCash),
  );
  const [expectedCash, setExpectedCash] = useState(
    String(shift.openingCash),
  );
  const [notes, setNotes] = useState("");
  const { t } = useI18n();

  const closingNum = Number(closingCash) || 0;
  const expectedNum = Number(expectedCash) || 0;
  const difference = closingNum - expectedNum;

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
              Caisse attendue
            </label>
            <div className="relative">
              <Calculator className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="number"
                min={0}
                value={expectedCash}
                onChange={(e) => setExpectedCash(e.target.value)}
                className="w-full bg-white border border-[var(--border)] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand)] transition-colors tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Actual cash counted
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
              Variance
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
              Notes (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Anomalies, explications…"
              className="w-full bg-white border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand)] transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={closing}
            disabled={closingNum <= 0 || expectedNum <= 0}
            onClick={() => onConfirm(closingNum, expectedNum, notes)}
          >
            Fermer la caisse
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
  onClose: (shift: ApiShift) => void;
}) {
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
          {isOpen ? "Open" : "Closed"}
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
              <span className="text-[var(--text-muted)]">Fonds:</span>
              <span className="font-semibold text-[var(--text-primary)] tabular-nums ml-auto">
                {formatCurrency(shift.openingCash)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-[var(--text-muted)]">Opened at:</span>
              <span className="font-medium text-[var(--text-primary)] tabular-nums ml-auto">
                {formatTime(shift.openedAt)}
              </span>
            </div>
          </div>
          <Button
            variant="danger"
            className="w-full mt-auto"
            icon={<Lock className="w-4 h-4" />}
            onClick={() => onClose(shift)}
          >
            Fermer
          </Button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-6">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-xs text-[var(--text-muted)] text-center mb-4">
            No register open
          </p>
          <Button
            variant="success"
            className="w-full"
            icon={<Unlock className="w-4 h-4" />}
            onClick={onOpen}
          >
            Ouvrir
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

  // Filtrer les employés qui peuvent ouvrir une caisse
  const cashiers = employees.filter((e) =>
    ["cashier", "supervisor", "manager"].includes(e.role) && e.status === "active"
  );

  const [openRegister, setOpenRegister] = useState<string | null>(null);
  const [closeShift, setCloseShift] = useState<ApiShift | null>(null);

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

  const handleOpen = async (employeeId: string, openingCash: number) => {
    if (!openRegister) return;
    try {
      await open({ registerId: openRegister, employeeId, openingCash });
      toast("Register opened", "success");
      setOpenRegister(null);
      reload();
    } catch (e) {
      toast("Erreur lors de l'ouverture de la caisse", "warning");
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
      toast("Register closed", "success");
      setCloseShift(null);
      reload();
    } catch (e) {
      toast("Erreur lors de la fermeture de la caisse", "warning");
    }
  };

  const kpis = [
    {
      label: "Caisses ouvertes",
      value: `${openCount} / ${REGISTERS.length}`,
      icon: <Wallet className="w-5 h-5" />,
      tone: "text-emerald-600 bg-emerald-100",
    },
    {
      label: "CA total caisses",
      value: formatCurrency(totalRevenue),
      icon: <TrendingUp className="w-5 h-5" />,
      tone: "text-blue-600 bg-blue-100",
    },
    {
      label: "Total variance",
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
      title={t.pos.title}
      subtitle="Gestion multi-caisses — ouvertures et fermetures de shifts"
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label} padding="md">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                  kpi.tone,
                )}
              >
                {kpi.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums leading-none truncate">
                  {kpi.value}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {kpi.label}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Registers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {REGISTERS.map((register) => (
          <RegisterCard
            key={register.id}
            register={register}
            shift={shiftByRegister.get(register.id)}
            employees={employees}
            onOpen={() => setOpenRegister(register.id)}
            onClose={(s) => setCloseShift(s)}
          />
        ))}
      </div>

      {/* Loading overlay hint */}
      {loading && shifts === null && (
        <p className="text-xs text-[var(--text-muted)] text-center mt-6">
          Loading active registers...
        </p>
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
          onConfirm={handleClose}
          onCancel={() => setCloseShift(null)}
        />
      )}
    </AppShell>
  );
}
