"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Phone,
  Mail,
  Clock,
  X,
  Calendar,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { employees as mockEmployees } from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/Toast";
import { NewEmployeeModal } from "@/components/forms/NewEmployeeModal";
import { useEmployees } from "@/lib/hooks/useApi";
import { employeesApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/context";
import { formatDate, cn } from "@/lib/utils";
import type { Employee } from "@/lib/types";

const roleColors: Record<Employee["role"], string> = {
  boss: "bg-indigo-100 text-indigo-700",
  manager: "bg-violet-100 text-violet-700",
  cashier: "bg-blue-100 text-blue-700",
  stockist: "bg-amber-100 text-amber-700",
  accountant: "bg-emerald-100 text-emerald-700",
};

const avatarGradients = [
  "from-blue-400 to-indigo-600",
  "from-emerald-400 to-teal-600",
  "from-pink-400 to-rose-600",
  "from-amber-400 to-orange-600",
  "from-violet-400 to-purple-600",
  "from-cyan-400 to-sky-600",
];

function getInitials(emp: Employee) {
  return `${emp.firstName[0]}${emp.lastName[0]}`;
}

function EmployeeCard({
  employee,
  index,
  onSelect,
}: {
  employee: Employee;
  index: number;
  onSelect: (e: Employee) => void;
}) {
  const { t } = useI18n();
  const isActive = employee.status === "active";
  const gradient = avatarGradients[index % avatarGradients.length];

  return (
    <div
      onClick={() => onSelect(employee)}
      className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow)] hover:border-blue-200 transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="relative">
          <div
            className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-base`}
          >
            {getInitials(employee)}
          </div>
          <span
            className={cn(
              "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white",
              isActive ? "bg-emerald-400" : "bg-slate-300"
            )}
          />
        </div>
        <span
          className={cn(
            "text-[11px] font-semibold px-2 py-0.5 rounded-full",
            roleColors[employee.role]
          )}
        >
          {t.employes.roles[employee.role]}
        </span>
      </div>

      <h3 className="font-semibold text-[var(--text-primary)] text-sm leading-snug">
        {employee.firstName} {employee.lastName}
      </h3>
      <p className="text-xs text-[var(--text-muted)] mt-0.5">{employee.department}</p>

      <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Clock className="w-3.5 h-3.5" />
          <span className="tabular-nums">
            {isActive ? `${employee.hoursThisWeek}h` : t.employes.onLeave}
          </span>
        </div>
        <Badge variant={isActive ? "success" : "neutral"} size="sm">
          {isActive ? t.employes.status.present : t.employes.status.absent}
        </Badge>
      </div>
    </div>
  );
}

export default function EmployesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { employees: apiEmployees, reload: reloadEmployees } = useEmployees();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [filterStatus, setFilterStatus] = useState("Tous");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showNewEmployee, setShowNewEmployee] = useState(false);
  const [saving, setSaving] = useState(false);

  // Convertir les employés API au format frontend, fallback sur mock
  useEffect(() => {
    if (apiEmployees.length > 0) {
      const mapped: Employee[] = apiEmployees.map((e) => ({
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        role: e.role as Employee["role"],
        department: e.department,
        phone: e.phone,
        email: e.email || "",
        hireDate: e.hireDate,
        status: e.status as Employee["status"],
        hoursThisWeek: 0,
      }));
      setEmployees(mapped);
    } else if (employees.length === 0) {
      setEmployees(mockEmployees);
    }
  }, [apiEmployees]);

  const handleNewEmployee = async (data: Omit<Employee, "id" | "status" | "hoursThisWeek">) => {
    setSaving(true);
    try {
      // Générer un numéro d'employé et PIN aléatoire
      const empCount = employees.length + 1;
      const employeeNumber = `EMP${String(empCount).padStart(3, "0")}`;
      const generatedPin = String(Math.floor(1000 + Math.random() * 9000)); // PIN 4 chiffres aléatoire
      const created = await employeesApi.create({
        employeeNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        department: data.department,
        phone: data.phone,
        email: data.email || undefined,
        hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
        status: "active",
        pin: generatedPin, // PIN aléatoire, communiquer à l'employé
      });
      const newEmp: Employee = {
        id: created.id,
        firstName: created.firstName,
        lastName: created.lastName,
        role: created.role as Employee["role"],
        department: created.department,
        phone: created.phone || "",
        email: created.email || "",
        hireDate: created.hireDate ? new Date(created.hireDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        status: "active" as const,
        hoursThisWeek: 0,
      };
      setEmployees((prev) => [newEmp, ...prev]);
      toast(`${data.firstName} ${data.lastName} added — temporary PIN: ${generatedPin}`, "success");
      reloadEmployees();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t.employes.errorAdd;
      toast(msg, "warning");
      // Fallback local
      const newEmp: Employee = { ...data, id: `e${Date.now()}`, status: "active", hoursThisWeek: 0 };
      setEmployees((prev) => [newEmp, ...prev]);
    } finally {
      setSaving(false);
    }
  };

  const activeCount = employees.filter((e) => e.status === "active").length;
  const totalHours = employees.reduce((s, e) => s + (e.hoursThisWeek ?? 0), 0);

  const filtered = employees.filter((e) => {
    const name = `${e.firstName} ${e.lastName}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchRole = filterRole === "All" || e.role === filterRole;
    const matchStatus =
      filterStatus === "Tous" ||
      (filterStatus === "active" && e.status === "active") ||
      (filterStatus === "on_leave" && e.status === "on_leave");
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <AppShell
      title={t.employes.title}
      subtitle={`${activeCount} / ${employees.length} — ${totalHours}h`}
    >
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: t.employes.totalEmployees, value: employees.length },
          { label: t.employes.presentToday, value: activeCount },
          { label: t.employes.onLeave, value: employees.length - activeCount },
          { label: t.employes.hoursPerWeek, value: `${totalHours}h` },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-[var(--shadow-sm)]"
          >
            <p className="text-xl font-semibold text-[var(--text-primary)] tabular-nums leading-none">
              {value}
            </p>
            <p className="text-[12px] text-[var(--text-muted)] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white border border-[var(--border)] rounded-xl px-3 py-2 flex-1 min-w-[200px] focus-within:border-[var(--brand)] transition-colors">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.employes.searchEmployee}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
          />
        </div>

        <div className="relative">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="appearance-none bg-white border border-[var(--border)] rounded-xl px-3 py-2 pr-8 text-sm text-[var(--text-secondary)] outline-none cursor-pointer"
          >
            {["All", "manager", "cashier", "stockist", "boss", "accountant"].map((r) => (
              <option key={r} value={r}>
                {r === "All" ? t.employes.allRoles : t.employes.roles[r as Employee["role"]] ?? r}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1 bg-[var(--background)] border border-[var(--border)] rounded-xl p-1">
          {[
            { key: "Tous", label: t.common.all },
            { key: "active", label: t.employes.status.active },
            { key: "on_leave", label: t.employes.status.leave },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-lg transition-all",
                filterStatus === key
                  ? "bg-white text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Button size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setShowNewEmployee(true)}>
          {t.employes.newEmployee}
        </Button>
      </div>

      {/* Employee grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
        {filtered.map((emp, i) => (
          <EmployeeCard
            key={emp.id}
            employee={emp}
            index={i}
            onSelect={setSelectedEmployee}
          />
        ))}
      </div>

      {/* Weekly schedule preview */}
      <Card padding="md">
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">
          {t.employes.weeklySchedule}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr>
                <th className="text-left text-xs font-semibold text-[var(--text-muted)] pb-3 pr-4">
                  Employee
                </th>
                {[
                  t.common.monday,
                  t.common.tuesday,
                  t.common.wednesday,
                  t.common.thursday,
                  t.common.friday,
                  t.common.saturday,
                  t.common.sunday,
                ].map((day) => (
                  <th
                    key={day}
                    className="text-center text-xs font-semibold text-[var(--text-muted)] pb-3 px-2"
                  >
                    {day}
                  </th>
                ))}
                <th className="text-center text-xs font-semibold text-[var(--text-muted)] pb-3 pl-4">
                  {t.common.total}
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => {
                const gradient = avatarGradients[i % avatarGradients.length];
                const schedule = generateSchedule(emp);
                return (
                  <tr key={emp.id} className="border-t border-[var(--border-subtle)]">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}
                        >
                          {getInitials(emp)}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[var(--text-primary)]">
                            {emp.firstName} {emp.lastName.charAt(0)}.
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">{emp.department}</p>
                        </div>
                      </div>
                    </td>
                    {schedule.map((shift, j) => (
                      <td key={j} className="text-center px-2 py-2.5">
                        {shift ? (
                          <span className="inline-block px-1.5 py-0.5 bg-[var(--brand-light)] text-[var(--brand)] text-[10px] font-medium rounded tabular-nums">
                            {shift}
                          </span>
                        ) : (
                          <span className="text-[var(--border)] text-xs">—</span>
                        )}
                      </td>
                    ))}
                    <td className="text-center pl-4 py-2.5">
                      <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums">
                        {emp.hoursThisWeek ?? 0}h
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Employee detail panel */}
      {selectedEmployee && (
        <EmployeeDetailPanel
          employee={selectedEmployee}
          index={employees.findIndex((e) => e.id === selectedEmployee.id)}
          onClose={() => setSelectedEmployee(null)}
        />
      )}

      {/* New employee modal */}
      {showNewEmployee && (
        <NewEmployeeModal
          onClose={() => setShowNewEmployee(false)}
          onSave={handleNewEmployee}
        />
      )}
    </AppShell>
  );
}

function generateSchedule(emp: Employee): (string | null)[] {
  if (emp.status === "on_leave") return [null, null, null, null, null, null, null];
  const shifts = ["8h-16h", "10h-18h", "14h-22h"];
  const base = emp.role === "boss" ? [0, 0, 0, 0, 0, null, null] : [0, 0, 1, 1, 0, 2, null];
  return base.map((v) => (v === null ? null : shifts[v]));
}

function EmployeeDetailPanel({
  employee,
  index,
  onClose,
}: {
  employee: Employee;
  index: number;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const gradient = avatarGradients[index % avatarGradients.length];
  const [showPin, setShowPin] = useState(false);
  const [pinValue, setPinValue] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const canManagePin = user?.role === "boss" || user?.role === "manager";

  const handleResetPin = async () => {
    setResetting(true);
    const newPin = String(Math.floor(1000 + Math.random() * 9000));
    try {
      await employeesApi.update(employee.id, { pin: newPin });
      setPinValue(newPin);
      setShowPin(true);
      toast(`PIN reset for ${employee.firstName} — new PIN: ${newPin}`, "success");
    } catch {
      toast("Failed to reset PIN", "warning");
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-screen w-[380px] bg-white shadow-[var(--shadow-lg)] z-50 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--text-primary)]">{t.employes.employeeFile}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center text-center gap-2">
            <div
              className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-2xl font-bold`}
            >
              {getInitials(employee)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {employee.firstName} {employee.lastName}
              </h3>
              <span
                className={cn(
                  "text-xs font-semibold px-2.5 py-1 rounded-full mt-1 inline-block",
                  roleColors[employee.role]
                )}
              >
                {t.employes.roles[employee.role]}
              </span>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
              {t.employes.contact}
            </p>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Phone className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <span className="text-sm text-[var(--text-primary)]">{employee.phone}</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Mail className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <span className="text-sm text-[var(--text-primary)]">{employee.email}</span>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-2">
            {[
              { label: t.employes.department, value: employee.department },
              { label: t.employes.hireDate, value: formatDate(employee.hireDate) },
              { label: t.common.status, value: employee.status === "active" ? t.employes.statusActive : t.employes.statusOnLeave },
              { label: t.employes.hoursThisWeek, value: `${employee.hoursThisWeek ?? 0}h` },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between py-2 border-b border-[var(--border-subtle)] last:border-0"
              >
                <span className="text-xs text-[var(--text-muted)]">{label}</span>
                <span className="text-xs font-medium text-[var(--text-primary)]">{value}</span>
              </div>
            ))}
          </div>

          {/* PIN section — boss/manager only */}
          {canManagePin && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Login PIN
              </p>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                <span className="flex-1 font-mono text-sm tracking-widest text-[var(--text-primary)]">
                  {pinValue !== null
                    ? (showPin ? pinValue : "••••")
                    : (showPin ? "see DB" : "••••")}
                </span>
                <button
                  onClick={() => setShowPin((v) => !v)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  title={showPin ? "Hide" : "Show"}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleResetPin}
                  disabled={resetting}
                  className="flex items-center gap-1 text-xs text-[var(--brand)] hover:text-[var(--brand-hover)] font-medium transition-colors disabled:opacity-50"
                  title="Generate new PIN"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
                  Reset
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Only you can see this. Share the new PIN directly with the employee.
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--border)] flex gap-2">
          <Button variant="secondary" className="flex-1" size="md" icon={<Calendar className="w-4 h-4" />} onClick={() => toast(`${t.employes.weeklySchedule} — ${employee.firstName} ${employee.lastName}`, "info")}>
            {t.employes.schedule}
          </Button>
          <Button className="flex-1" size="md" onClick={() => toast(`${t.common.edit} — ${employee.firstName} ${employee.lastName}`, "info")}>
            {t.common.edit}
          </Button>
        </div>
      </div>
    </>
  );
}
