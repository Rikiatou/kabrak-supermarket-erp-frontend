"use client";

import { useState } from "react";
import { X, ShoppingCart, CheckCircle2, Plus, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { cn, formatCurrency } from "@/lib/utils";
import { suppliers as mockSuppliers } from "@/lib/mock-data";
import { useSuppliers } from "@/lib/hooks/useApi";
import type { Supplier } from "@/lib/types";

type OrderLine = {
  id: number;
  productName: string;
  quantity: number;
  unitCost: number;
};

type FormData = {
  supplierId: string;
  expectedDate: string;
  notes: string;
};

const emptyForm: FormData = {
  supplierId: "",
  expectedDate: "",
  notes: "",
};

const emptyLine = (): OrderLine => ({
  id: Date.now() + Math.random(),
  productName: "",
  quantity: 1,
  unitCost: 0,
});

interface NewOrderModalProps {
  onClose: () => void;
  onSave: (order: {
    supplier: Supplier;
    expectedDate: string;
    lines: OrderLine[];
    total: number;
    notes: string;
  }) => void;
  defaultSupplier?: Supplier;
}

export function NewOrderModal({ onClose, onSave, defaultSupplier }: NewOrderModalProps) {
  const { t } = useI18n();
  const { suppliers: apiSuppliers } = useSuppliers();

  // Convertir les suppliers API au format frontend, fallback sur mock
  const suppliers: Supplier[] = apiSuppliers.length > 0
    ? apiSuppliers.map((s) => ({
        id: s.id,
        name: s.name,
        contact: s.contact,
        phone: s.phone,
        email: s.email || "",
        address: s.address || "",
        paymentTerms: s.paymentTerms,
        rating: s.rating,
        totalOrders: s._count?.purchaseOrders || 0,
        pendingOrders: 0,
      }))
    : mockSuppliers;

  const [form, setForm] = useState<FormData>({
    ...emptyForm,
    supplierId: defaultSupplier?.id ?? "",
  });
  const [lines, setLines] = useState<OrderLine[]>([emptyLine()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const set = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const updateLine = (id: number, field: keyof Omit<OrderLine, "id">, raw: string) => {
    setLines((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              [field]:
                field === "quantity" || field === "unitCost"
                  ? Math.max(0, Number(raw) || 0)
                  : raw,
            }
          : l
      )
    );
    setErrors((prev) => ({ ...prev, lines: "" }));
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const removeLine = (id: number) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));

  const total = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.supplierId) errs.supplierId = t.common.required;
    if (!form.expectedDate) errs.expectedDate = t.common.required;
    const validLines = lines.filter((l) => l.productName.trim() && l.quantity > 0 && l.unitCost > 0);
    if (validLines.length === 0) errs.lines = t.common.required;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const supplier = suppliers.find((s) => s.id === form.supplierId)!;
    const validLines = lines.filter((l) => l.productName.trim() && l.quantity > 0 && l.unitCost > 0);
    onSave({ supplier, expectedDate: form.expectedDate, lines: validLines, total, notes: form.notes });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1400);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-2xl pointer-events-auto flex flex-col max-h-[92vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[var(--brand-light)] rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-[var(--brand)]" />
              </div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {t.forms.newOrder}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Success state */}
          {saved ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 bg-[var(--success-light)] rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-base font-semibold text-[var(--text-primary)]">
                {t.forms.orderSaved}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* Supplier + date */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label={t.forms.supplier} error={errors.supplierId} required span={1}>
                    <div className="relative">
                      <select
                        value={form.supplierId}
                        onChange={set("supplierId")}
                        className={cn(inputClass(!!errors.supplierId), "appearance-none pr-8")}
                      >
                        <option value="">— {t.forms.supplier} —</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </Field>

                  <Field label={t.achats.expectedDelivery} error={errors.expectedDate} required span={1}>
                    <input
                      type="date"
                      value={form.expectedDate}
                      onChange={set("expectedDate")}
                      min={new Date().toISOString().split("T")[0]}
                      className={inputClass(!!errors.expectedDate)}
                    />
                  </Field>
                </div>

                {/* Line items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                      {t.achats.items}
                    </label>
                    {errors.lines && (
                      <p className="text-xs text-red-500">{errors.lines}</p>
                    )}
                  </div>

                  <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_80px_120px_36px] gap-2 px-3 py-2 bg-slate-50 border-b border-[var(--border)]">
                      <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                        {t.common.name}
                      </span>
                      <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide text-center">
                        {t.common.quantity}
                      </span>
                      <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide text-right">
                        {t.common.price} (FCFA)
                      </span>
                      <span />
                    </div>

                    {/* Lines */}
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {lines.map((line) => (
                        <div key={line.id} className="grid grid-cols-[1fr_80px_120px_36px] gap-2 px-3 py-2 items-center">
                          <input
                            type="text"
                            value={line.productName}
                            onChange={(e) => updateLine(line.id, "productName", e.target.value)}
                            placeholder="Nom du produit…"
                            className="text-sm border-0 outline-none bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] w-full"
                          />
                          <input
                            type="number"
                            min={1}
                            value={line.quantity || ""}
                            onChange={(e) => updateLine(line.id, "quantity", e.target.value)}
                            className="text-sm border border-[var(--border)] rounded-lg px-2 py-1 text-center outline-none focus:border-[var(--brand)] tabular-nums bg-white"
                          />
                          <input
                            type="number"
                            min={0}
                            value={line.unitCost || ""}
                            onChange={(e) => updateLine(line.id, "unitCost", e.target.value)}
                            placeholder="0"
                            className="text-sm border border-[var(--border)] rounded-lg px-2 py-1 text-right outline-none focus:border-[var(--brand)] tabular-nums bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => removeLine(line.id)}
                            className={cn(
                              "w-7 h-7 flex items-center justify-center rounded-lg transition-colors",
                              lines.length === 1
                                ? "text-slate-200 cursor-not-allowed"
                                : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                            )}
                            disabled={lines.length === 1}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add line */}
                    <button
                      type="button"
                      onClick={addLine}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-[var(--brand)] hover:bg-[var(--brand-light)] transition-colors border-t border-[var(--border-subtle)]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter une ligne
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <Field label="Notes" span={2}>
                  <textarea
                    value={form.notes}
                    onChange={set("notes")}
                    rows={2}
                    placeholder="Instructions de livraison, références, conditions particulières…"
                    className={cn(inputClass(false), "resize-none")}
                  />
                </Field>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] shrink-0 gap-4">
                <div className="text-sm">
                  <span className="text-[var(--text-muted)]">{t.common.total} : </span>
                  <span className="font-bold text-[var(--text-primary)] tabular-nums text-base">
                    {formatCurrency(total)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="secondary" onClick={onClose}>
                    {t.common.cancel}
                  </Button>
                  <Button type="submit" icon={<CheckCircle2 className="w-4 h-4" />}>
                    {t.common.save}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

function Field({
  label, error, required, children, span,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  span?: number;
}) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return cn(
    "w-full border rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors bg-white placeholder:text-[var(--text-muted)]",
    hasError
      ? "border-red-400 focus:border-red-500"
      : "border-[var(--border)] focus:border-[var(--brand)]"
  );
}
