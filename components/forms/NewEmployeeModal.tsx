"use client";

import { useState } from "react";
import { X, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import type { Employee } from "@/lib/types";

const ROLES: Employee["role"][] = ["boss", "manager", "supervisor", "cashier", "stockist", "accountant"];

type FormData = {
  firstName: string;
  lastName: string;
  role: Employee["role"] | "";
  department: string;
  phone: string;
  email: string;
  hireDate: string;
};

const empty: FormData = {
  firstName: "", lastName: "", role: "", department: "",
  phone: "", email: "", hireDate: "",
};

interface NewEmployeeModalProps {
  onClose: () => void;
  onSave: (employee: Omit<Employee, "id" | "status" | "hoursThisWeek">) => void;
}

export function NewEmployeeModal({ onClose, onSave }: NewEmployeeModalProps) {
  const { t } = useI18n();
  const [form, setForm] = useState<FormData>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const set = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = t.common.required;
    if (!form.lastName.trim()) errs.lastName = t.common.required;
    if (!form.role) errs.role = t.common.required;
    if (!form.department.trim()) errs.department = t.common.required;
    if (!form.phone.trim()) errs.phone = t.common.required;
    if (!form.email.trim()) errs.email = t.common.required;
    if (!form.hireDate) errs.hireDate = t.common.required;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      firstName: form.firstName,
      lastName: form.lastName,
      role: form.role as Employee["role"],
      department: form.department,
      phone: form.phone,
      email: form.email,
      hireDate: form.hireDate,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1400);
  };

  const initials = form.firstName && form.lastName
    ? `${form.firstName[0]}${form.lastName[0]}`.toUpperCase()
    : "??";

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-xl pointer-events-auto flex flex-col max-h-[90vh]">

          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {t.forms.newEmployee}
              </h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>

          {saved ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 bg-[var(--success-light)] rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-base font-semibold text-[var(--text-primary)]">{t.forms.employeeSaved}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* Avatar preview */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {form.firstName || "First name"} {form.lastName || "Last name"}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {form.role ? t.employes.roles[form.role] : t.forms.selectRole}
                    </p>
                  </div>
                </div>

                {/* Identity */}
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
                    {t.employes.title}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label={t.forms.firstName} error={errors.firstName} required>
                      <input type="text" value={form.firstName} onChange={set("firstName")}
                        placeholder="Amina" className={inputClass(!!errors.firstName)} />
                    </Field>
                    <Field label={t.forms.lastName} error={errors.lastName} required>
                      <input type="text" value={form.lastName} onChange={set("lastName")}
                        placeholder="Bello" className={inputClass(!!errors.lastName)} />
                    </Field>
                    <Field label={t.forms.role} error={errors.role} required>
                      <select value={form.role} onChange={set("role")} className={inputClass(!!errors.role)}>
                        <option value="">{t.forms.selectRole}</option>
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{t.employes.roles[r]}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label={t.forms.dept} error={errors.department} required>
                      <input type="text" value={form.department} onChange={set("department")}
                        placeholder={t.forms.deptPh} className={inputClass(!!errors.department)} />
                    </Field>
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
                    {t.employes.contact || "Contact"}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label={t.forms.phone} error={errors.phone} required>
                      <input type="tel" value={form.phone} onChange={set("phone")}
                        placeholder="+237 6 XX XX XX XX" className={inputClass(!!errors.phone)} />
                    </Field>
                    <Field label={t.forms.email} error={errors.email} required>
                      <input type="email" value={form.email} onChange={set("email")}
                        placeholder="prenom.nom@kabrak.cm" className={inputClass(!!errors.email)} />
                    </Field>
                    <Field label={t.forms.hireDate} error={errors.hireDate} required span={2}>
                      <input type="date" value={form.hireDate} onChange={set("hireDate")}
                        className={inputClass(!!errors.hireDate)} />
                    </Field>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)] shrink-0">
                <Button type="button" variant="secondary" onClick={onClose}>{t.common.cancel}</Button>
                <Button type="submit" icon={<CheckCircle2 className="w-4 h-4" />}>{t.common.save}</Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

function Field({ label, error, required, children, span }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode; span?: number;
}) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return cn(
    "w-full border rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors bg-white placeholder:text-[var(--text-muted)]",
    hasError ? "border-red-400 focus:border-red-500" : "border-[var(--border)] focus:border-[var(--brand)]"
  );
}
