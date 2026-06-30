"use client";

import { useState } from "react";
import { X, Users, CheckCircle2, Eye, EyeOff, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import type { Employee } from "@/lib/types";

const ROLES: Employee["role"][] = ["boss", "cashier", "stockist", "accountant"];

type FormData = {
  firstName: string;
  lastName: string;
  role: Employee["role"] | "";
  department: string;
  phone: string;
  email: string;
  hireDate: string;
  pin: string;
};

const empty: FormData = {
  firstName: "", lastName: "", role: "", department: "",
  phone: "", email: "", hireDate: "", pin: "",
};

interface NewEmployeeModalProps {
  onClose: () => void;
  onSave: (employee: Omit<Employee, "id" | "status" | "hoursThisWeek"> & { pin?: string }) => void;
}

export function NewEmployeeModal({ onClose, onSave }: NewEmployeeModalProps) {
  const { t } = useI18n();
  const [form, setForm] = useState<FormData>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<{ name: string; code: string; pin: string } | null>(null);

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
    // email is optional
    if (!form.hireDate) errs.hireDate = t.common.required;
    if (form.pin && (form.pin.length !== 4 || !/^\d{4}$/.test(form.pin))) {
      errs.pin = "PIN doit être 4 chiffres";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const generatedCode = `EMP${Date.now().toString().slice(-5)}`;
    const finalPin = form.pin.trim() || String(Math.floor(1000 + Math.random() * 9000));
    setCreatedInfo({ name: `${form.firstName} ${form.lastName}`, code: generatedCode, pin: finalPin });
    onSave({
      firstName: form.firstName,
      lastName: form.lastName,
      role: form.role as Employee["role"],
      department: form.department,
      phone: form.phone,
      email: form.email || undefined as unknown as string,
      hireDate: form.hireDate,
      pin: finalPin,
    });
    setSaved(true);
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

          {/* Écran de confirmation après création */}
          {saved && createdInfo ? (
            <div className="flex flex-col items-center justify-center py-10 px-8 gap-4">
              <div className="w-16 h-16 bg-[var(--success-light)] rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-base font-semibold text-[var(--text-primary)]">{createdInfo.name} — créé(e) !</p>

              {/* Carte à donner à l'employé */}
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-center">
                  Informations de connexion — à communiquer à l&apos;employé
                </p>
                <div className="flex items-center justify-between gap-3 bg-white rounded-lg px-4 py-3 border border-slate-200">
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Code employé</p>
                    <p className="text-lg font-bold font-mono text-[var(--text-primary)]">{createdInfo.code}</p>
                  </div>
                  <button
                    onClick={() => navigator.clipboard?.writeText(createdInfo.code)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Copier"
                  >
                    <Copy className="w-4 h-4 text-[var(--text-muted)]" />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3 bg-indigo-50 rounded-lg px-4 py-3 border border-indigo-200">
                  <div>
                    <p className="text-[10px] text-indigo-600 uppercase tracking-wide font-semibold">PIN secret</p>
                    <p className="text-2xl font-bold font-mono text-indigo-700 tracking-[0.3em]">{createdInfo.pin}</p>
                  </div>
                  <button
                    onClick={() => navigator.clipboard?.writeText(createdInfo.pin)}
                    className="p-2 rounded-lg hover:bg-indigo-100 transition-colors"
                    title="Copier PIN"
                  >
                    <Copy className="w-4 h-4 text-indigo-500" />
                  </button>
                </div>
                <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                  ⚠️ Notez ce PIN maintenant. Vous pourrez le réinitialiser depuis la fiche de l&apos;employé.
                </p>
              </div>

              <Button onClick={onClose} className="w-full mt-2">Fermer</Button>
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
                      {form.firstName || t.forms.firstNamePh} {form.lastName || t.forms.lastNamePh}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {form.role ? t.employes.roles[form.role] : t.forms.selectRole}
                    </p>
                  </div>
                </div>

                {/* Identity */}
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
                    {t.forms.identity}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label={t.forms.firstName} error={errors.firstName} required>
                      <input type="text" value={form.firstName} onChange={set("firstName")}
                        placeholder={t.forms.firstNameExample} className={inputClass(!!errors.firstName)} />
                    </Field>
                    <Field label={t.forms.lastName} error={errors.lastName} required>
                      <input type="text" value={form.lastName} onChange={set("lastName")}
                        placeholder={t.forms.lastNameExample} className={inputClass(!!errors.lastName)} />
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
                    {t.forms.contact}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label={t.forms.phone} error={errors.phone} required>
                      <input type="tel" value={form.phone} onChange={set("phone")}
                        placeholder={t.forms.phonePh} className={inputClass(!!errors.phone)} />
                    </Field>
                    <Field label={`${t.forms.email} (optionnel)`} error={errors.email}>
                      <input type="email" value={form.email} onChange={set("email")}
                        placeholder={t.forms.emailPh} className={inputClass(!!errors.email)} />
                    </Field>
                    <Field label={t.forms.hireDate} error={errors.hireDate} required span={2}>
                      <input type="date" value={form.hireDate} onChange={set("hireDate")}
                        className={inputClass(!!errors.hireDate)} />
                    </Field>
                  </div>
                </div>

                {/* PIN personnalisé */}
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
                    PIN de connexion
                  </p>
                  <Field label="PIN (4 chiffres)" error={errors.pin}>
                    <div className="relative">
                      <input
                        type={showPin ? "text" : "password"}
                        value={form.pin}
                        onChange={set("pin")}
                        maxLength={4}
                        placeholder="Laisser vide = généré automatiquement"
                        className={`${inputClass(!!errors.pin)} pr-10 font-mono tracking-widest`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </Field>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    Si vide, un PIN aléatoire sera généré et affiché après la sauvegarde.
                  </p>
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
    <div className={cn("flex flex-col gap-1.5", span === 2 && "col-span-2")}>
      <label className="text-xs font-medium text-[var(--text-secondary)]">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return cn(
    "w-full px-3 py-2 rounded-lg border text-sm bg-white transition-colors",
    "focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent",
    hasError ? "border-red-300 bg-red-50" : "border-[var(--border)] hover:border-slate-300"
  );
}
