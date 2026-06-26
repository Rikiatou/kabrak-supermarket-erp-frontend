"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  Plus,
  X,
  Clock,
  Store,
  User,
  Trash2,
  Copy,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import {
  useEmployees,
  useSchedules,
  useCreateSchedule,
  useDeleteSchedule,
} from "@/lib/hooks/useApi";
import { schedulesApi } from "@/lib/api";
import type { ApiSchedule, ApiEmployee } from "@/lib/api";

const REGISTER_COLORS: Record<string, string> = {
  reg1: "bg-blue-100 text-blue-700 border-blue-200",
  reg2: "bg-emerald-100 text-emerald-700 border-emerald-200",
  reg3: "bg-purple-100 text-purple-700 border-purple-200",
  reg4: "bg-amber-100 text-amber-700 border-amber-200",
};

// Palette de couleurs pour les caisses UUID
const REGISTER_COLOR_PALETTE = [
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
];

function registerColor(id: string): string {
  if (REGISTER_COLORS[id]) return REGISTER_COLORS[id];
  // Hash simple pour assigner une couleur stable basée sur l'UUID
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % REGISTER_COLOR_PALETTE.length;
  return REGISTER_COLOR_PALETTE[hash];
}

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00",
];

export default function PlanningPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  const DAYS = [
    { num: 1, label: t.common.monday },
    { num: 2, label: t.common.tuesday },
    { num: 3, label: t.common.wednesday },
    { num: 4, label: t.common.thursday },
    { num: 5, label: t.common.friday },
    { num: 6, label: t.common.saturday },
    { num: 0, label: t.common.sunday },
  ];

  const REGISTERS_FALLBACK = [
    { id: "reg1", name: t.common.register1 },
    { id: "reg2", name: t.common.register2 },
    { id: "reg3", name: t.common.register3 },
    { id: "reg4", name: t.common.register4 },
  ];

  // Charger les vraies caisses depuis le backend
  const [apiRegisters, setApiRegisters] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [registersLoading, setRegistersLoading] = useState(true);
  useEffect(() => {
    setRegistersLoading(true);
    schedulesApi.registers()
      .then((regs) => setApiRegisters(regs))
      .catch(() => {
        setApiRegisters([]);
        console.warn("Impossible de charger les caisses depuis le backend");
      })
      .finally(() => setRegistersLoading(false));
  }, []);

  const REGISTERS = apiRegisters.length > 0
    ? apiRegisters.map((r) => ({ id: r.id, name: r.name }))
    : REGISTERS_FALLBACK;

  const { employees } = useEmployees();
  const { data: scheduleData, loading, reload } = useSchedules();
  const { create, creating } = useCreateSchedule();
  const { remove, deleting } = useDeleteSchedule();

  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmployee, setAddEmployee] = useState<ApiEmployee | null>(null);
  const [addDay, setAddDay] = useState<number>(1);
  const [form, setForm] = useState({
    registerId: "",
    startTime: "08:00",
    endTime: "17:00",
    breakStart: "",
    breakEnd: "",
    notes: "",
  });

  // Filtrer les employés assignables (tous les employés actifs)
  const cashiers = useMemo(
    () => employees.filter((e) => e.status !== "inactive" && (e.role === "cashier" || e.role === "manager" || e.role === "boss")),
    [employees],
  );

  // Grouper les schedules par employé × jour
  const scheduleMap = useMemo(() => {
    const map: Record<string, ApiSchedule[]> = {};
    const all = scheduleData?.all || [];
    all.forEach((s) => {
      const key = `${s.employeeId}-${s.dayOfWeek}`;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [scheduleData]);

  const getSchedules = (employeeId: string, dayOfWeek: number): ApiSchedule[] => {
    return scheduleMap[`${employeeId}-${dayOfWeek}`] || [];
  };

  const handleAdd = (employee: ApiEmployee, day: number) => {
    setAddEmployee(employee);
    setAddDay(day);
    setForm({
      registerId: REGISTERS[0]?.id || "",
      startTime: "08:00",
      endTime: "17:00",
      breakStart: "",
      breakEnd: "",
      notes: "",
    });
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    if (!addEmployee) return;
    if (form.startTime >= form.endTime) {
      toast(t.planning.errorTime, "warning");
      return;
    }
    try {
      await create({
        employeeId: addEmployee.id,
        registerId: form.registerId,
        dayOfWeek: addDay,
        startTime: form.startTime,
        endTime: form.endTime,
        breakStart: form.breakStart || undefined,
        breakEnd: form.breakEnd || undefined,
        notes: form.notes || undefined,
      });
      toast(`${t.planning.slotAdded} ${addEmployee.firstName} ${DAYS.find(d => d.num === addDay)?.label}`, "success");
      setShowAddModal(false);
      reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t.planning.errorAdd;
      toast(msg, "warning");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await remove(id);
      toast(`${t.planning.slotDeleted} ${name}`, "info");
      reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t.planning.errorDelete;
      toast(msg, "warning");
    }
  };

  const today = new Date().getDay();

  return (
    <AppShell title={t.planning.title} subtitle={t.planning.subtitle}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[var(--brand)]" />
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t.planning.weeklyPlanning}</h2>
              <p className="text-xs text-[var(--text-muted)]">
                {cashiers.length} {t.planning.employeesEligible} · {scheduleData?.total || 0} {t.planning.slotsPlanned}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => reload()}
          >
            {t.planning.refresh}
          </Button>
        </div>

        {/* Légende caisses */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--text-muted)] font-medium">{t.planning.registers}</span>
          {REGISTERS.map((reg) => (
            <span
              key={reg.id}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border",
                registerColor(reg.id),
              )}
            >
              <Store className="w-3 h-3" />
              {reg.name}
            </span>
          ))}
        </div>

        {/* Grille planning */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                  <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-3 py-3 sticky left-0 bg-[var(--background)] z-10">
                    {t.planning.employee}
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day.num}
                      className={cn(
                        "text-center text-xs font-semibold uppercase tracking-wide px-2 py-3 min-w-[120px]",
                        day.num === today ? "text-[var(--brand)]" : "text-[var(--text-muted)]",
                      )}
                    >
                      <div className="flex flex-col items-center">
                        <span>{day.label}</span>
                        {day.num === today && (
                          <span className="text-[9px] bg-[var(--brand)] text-white px-1.5 py-0 rounded-full mt-0.5">{t.common.today}</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cashiers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-[var(--text-muted)]">{t.planning.noCashiers}</p>
                    </td>
                  </tr>
                ) : (
                  cashiers.map((employee) => (
                    <tr key={employee.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]">
                      <td className="px-3 py-3 sticky left-0 bg-white z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {employee.firstName?.charAt(0) || "?"}{employee.lastName?.charAt(0) || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {employee.firstName} {employee.lastName}
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)] capitalize">{employee.role}</p>
                          </div>
                        </div>
                      </td>
                      {DAYS.map((day) => {
                        const slots = getSchedules(employee.id, day.num);
                        return (
                          <td key={day.num} className="px-2 py-2 align-top">
                            <div className="space-y-1">
                              {slots.map((slot) => {
                                const reg = REGISTERS.find((r) => r.id === slot.registerId);
                                return (
                                  <div
                                    key={slot.id}
                                    className={cn(
                                      "group relative rounded-lg border px-2 py-1.5 text-xs",
                                      registerColor(slot.registerId),
                                    )}
                                  >
                                    <div className="flex items-center gap-1 font-semibold">
                                      <Store className="w-3 h-3 shrink-0" />
                                      <span className="truncate">{slot.registerName || reg?.name || t.common.register1}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] mt-0.5 opacity-80">
                                      <Clock className="w-2.5 h-2.5 shrink-0" />
                                      <span className="tabular-nums">{slot.startTime}–{slot.endTime}</span>
                                    </div>
                                    {slot.breakStart && slot.breakEnd && (
                                      <div className="text-[9px] opacity-60 mt-0.5">
                                        Pause: {slot.breakStart}–{slot.breakEnd}
                                      </div>
                                    )}
                                    {slot.notes && (
                                      <div className="text-[9px] opacity-70 mt-0.5 italic truncate">{slot.notes}</div>
                                    )}
                                    <button
                                      onClick={() => handleDelete(slot.id, `${employee.firstName} ${day.label}`)}
                                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/50"
                                      title={t.planning.delete}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              })}
                              <button
                                onClick={() => handleAdd(employee, day.num)}
                                className="w-full flex items-center justify-center gap-1 py-1 rounded-lg border border-dashed border-slate-200 text-[10px] text-[var(--text-muted)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                {slots.length === 0 ? t.planning.add : t.planning.another}
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {DAYS.map((day) => {
            const count = scheduleData?.byDay?.[day.num]?.length || 0;
            return (
              <Card key={day.num} className={cn("p-3", day.num === today && "border-[var(--brand)] border-2")}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{day.label}</p>
                    <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{count}</p>
                  </div>
                  <Calendar className={cn("w-5 h-5", count > 0 ? "text-[var(--brand)]" : "text-slate-300")} />
                </div>
              </Card>
            );
          }).slice(0, 4)}
        </div>
      </div>

      {/* Modal ajout créneau */}
      {showAddModal && addEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--brand)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {t.planning.newSlot} — {addEmployee.firstName} {addEmployee.lastName}
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p className="text-[var(--text-muted)] text-xs">{t.planning.day}</p>
              <p className="font-semibold">{DAYS.find((d) => d.num === addDay)?.label}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.planning.register}</label>
                <select
                  value={form.registerId}
                  onChange={(e) => setForm({ ...form, registerId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)] bg-white"
                >
                  {REGISTERS.map((reg) => (
                    <option key={reg.id} value={reg.id}>{reg.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.planning.start}</label>
                  <select
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)] bg-white tabular-nums"
                  >
                    {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.planning.end}</label>
                  <select
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)] bg-white tabular-nums"
                  >
                    {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.planning.breakStart}</label>
                  <select
                    value={form.breakStart}
                    onChange={(e) => setForm({ ...form, breakStart: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)] bg-white tabular-nums"
                  >
                    <option value="">—</option>
                    {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.planning.breakEnd}</label>
                  <select
                    value={form.breakEnd}
                    onChange={(e) => setForm({ ...form, breakEnd: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)] bg-white tabular-nums"
                  >
                    <option value="">—</option>
                    {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 block">{t.planning.note}</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder={t.planning.notePh}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--brand)]"
                />
              </div>
            </div>

            {form.startTime >= form.endTime && (
              <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 rounded-lg p-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {t.planning.errorTime}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)}>{t.planning.cancel}</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={creating || form.startTime >= form.endTime}>
                {creating ? t.planning.adding : t.planning.addSlot}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
