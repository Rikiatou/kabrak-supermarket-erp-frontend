"use client";

import { useState } from "react";
import { X, Truck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import type { Supplier } from "@/lib/types";

type FormData = {
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: string;
};

const empty: FormData = {
  name: "", contact: "", phone: "", email: "", address: "", paymentTerms: "30_days",
};

const PAYMENT_TERM_VALUES = ["comptant", "7_days", "15_days", "30_days", "45_days", "50_advance", "60_days"];

interface NewSupplierModalProps {
  onClose: () => void;
  onSave: (supplier: Omit<Supplier, "id" | "rating" | "totalOrders" | "pendingOrders">) => void;
}

export function NewSupplierModal({ onClose, onSave }: NewSupplierModalProps) {
  const { t } = useI18n();
  const [form, setForm] = useState<FormData>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const paymentTermLabels: Record<string, string> = {
    comptant: t.achats.ptComptant,
    "7_days": t.achats.pt7Days,
    "15_days": t.achats.pt15Days,
    "30_days": t.achats.pt30Days,
    "45_days": t.achats.pt45Days,
    "50_advance": t.achats.pt50Advance,
    "60_days": t.achats.pt60Days,
  };

  const set = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = t.common.required;
    if (!form.contact.trim()) errs.contact = t.common.required;
    if (!form.phone.trim()) errs.phone = t.common.required;
    if (!form.email.trim()) errs.email = t.common.required;
    if (!form.address.trim()) errs.address = t.common.required;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      name: form.name,
      contact: form.contact,
      phone: form.phone,
      email: form.email,
      address: form.address,
      paymentTerms: form.paymentTerms,
    });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1400);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-lg pointer-events-auto flex flex-col max-h-[90vh]">

          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
                <Truck className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {t.forms.newSupplier}
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
              <p className="text-base font-semibold text-[var(--text-primary)]">{t.forms.supplierSaved}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                <div className="grid grid-cols-2 gap-4">
                  <Field label={t.achats.suppliers.slice(0, -1) || t.forms.newSupplier} error={errors.name} required span={2}>
                    <input type="text" value={form.name} onChange={set("name")}
                      placeholder={t.forms.supplierPh}
                      className={inputClass(!!errors.name)} />
                  </Field>
                  <Field label={t.forms.contact} error={errors.contact} required span={2}>
                    <input type="text" value={form.contact} onChange={set("contact")}
                      placeholder={t.forms.contactPersonPh}
                      className={inputClass(!!errors.contact)} />
                  </Field>
                  <Field label={t.forms.phone} error={errors.phone} required>
                    <input type="tel" value={form.phone} onChange={set("phone")}
                      placeholder="+237 2 XX XX XX XX"
                      className={inputClass(!!errors.phone)} />
                  </Field>
                  <Field label={t.forms.email} error={errors.email} required>
                    <input type="email" value={form.email} onChange={set("email")}
                      placeholder="contact@fournisseur.cm"
                      className={inputClass(!!errors.email)} />
                  </Field>
                  <Field label={t.forms.address} error={errors.address} required span={2}>
                    <input type="text" value={form.address} onChange={set("address")}
                      placeholder={t.forms.addressPh}
                      className={inputClass(!!errors.address)} />
                  </Field>
                  <Field label={t.forms.paymentTerms} span={2}>
                    <select value={form.paymentTerms} onChange={set("paymentTerms")} className={inputClass(false)}>
                      {PAYMENT_TERM_VALUES.map((v) => <option key={v} value={v}>{paymentTermLabels[v]}</option>)}
                    </select>
                  </Field>
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
