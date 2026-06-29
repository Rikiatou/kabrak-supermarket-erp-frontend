"use client";

import { useState, useRef } from "react";
import { X, Package, CheckCircle2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

const CATEGORIES = [
  "Grocery", "Beverages", "Dairy",
  "Hygiene", "Butchery", "Bakery", "Frozen",
];

const UNITS = ["bottle", "can", "pack", "sack", "kg", "liter", "box", "bar", "jar", "unit"];

interface NewProductModalProps {
  onClose: () => void;
  onSave: (product: Omit<Product, "id">) => void;
  prefillBarcode?: string;
}

type FormData = {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  price: string;
  costPrice: string;
  stock: string;
  minStock: string;
  unit: string;
  supplier: string;
  expiryDate: string;
};

const empty: FormData = {
  name: "", sku: "", barcode: "", category: "", price: "",
  costPrice: "", stock: "", minStock: "", unit: "unit", supplier: "", expiryDate: "",
};

export function NewProductModal({ onClose, onSave, prefillBarcode }: NewProductModalProps) {
  const { t } = useI18n();

  const categoryLabels: Record<string, string> = {
    Grocery: t.common.catGrocery,
    Beverages: t.common.catDrinks,
    Dairy: t.common.catDairy,
    Hygiene: t.common.catHygiene,
    Butchery: t.common.catButcher,
    Bakery: t.common.catBakery,
    Frozen: t.common.catFrozen,
  };

  const unitLabels: Record<string, string> = {
    bottle: t.forms.unitBottle,
    can: t.forms.unitCan,
    pack: t.forms.unitPack,
    sack: t.forms.unitSack,
    kg: t.forms.unitKg,
    liter: t.forms.unitLiter,
    box: t.forms.unitBox,
    bar: t.forms.unitBar,
    jar: t.forms.unitJar,
    unit: t.forms.unitUnit,
  };

  const [form, setForm] = useState<FormData>({
    ...empty,
    barcode: prefillBarcode || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const errs: Partial<FormData> = {};
    if (!form.name.trim()) errs.name = t.common.required;
    if (!form.category) errs.category = t.common.required;
    if (!form.price || isNaN(Number(form.price))) errs.price = t.common.required;
    if (!form.costPrice || isNaN(Number(form.costPrice))) errs.costPrice = t.common.required;
    if (!form.stock || isNaN(Number(form.stock))) errs.stock = t.common.required;
    if (!form.minStock || isNaN(Number(form.minStock))) errs.minStock = t.common.required;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      sku: form.sku,
      name: form.name,
      category: form.category,
      price: Number(form.price),
      costPrice: Number(form.costPrice),
      stock: Number(form.stock),
      minStock: Number(form.minStock),
      unit: form.unit,
      barcode: form.barcode,
      supplier: form.supplier || undefined,
      expiryDate: form.expiryDate || undefined,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1400);
  };

  const margin = form.price && form.costPrice
    ? Math.round(((Number(form.price) - Number(form.costPrice)) / Number(form.price)) * 100)
    : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-2xl pointer-events-auto flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[var(--brand-light)] rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-[var(--brand)]" />
              </div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {t.forms.newProduct}
              </h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Success state */}
          {saved ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 bg-[var(--success-light)] rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-base font-semibold text-[var(--text-primary)]">{t.forms.productSaved}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* Section: Identity */}
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
                    {t.forms.sectionIdentity}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label={t.forms.productName} error={errors.name} required span={2}>
                      <input
                        type="text" value={form.name} onChange={set("name")}
                        placeholder={t.forms.productNamePh}
                        className={inputClass(!!errors.name)}
                      />
                    </Field>
                    <Field label={t.forms.sku}>
                      <input type="text" value={form.sku} onChange={set("sku")}
                        placeholder={t.forms.skuPh || t.forms.skuAutoGenerated}
                        className={inputClass(false)} />
                    </Field>
                    <Field label={t.forms.barcode}>
                      <div className="flex gap-2">
                        <input
                          ref={barcodeRef}
                          type="text"
                          value={form.barcode}
                          onChange={set("barcode")}
                          placeholder={t.forms.barcodePh}
                          className={inputClass(false)}
                        />
                        <button
                          type="button"
                          onClick={() => { barcodeRef.current?.focus(); barcodeRef.current?.select(); }}
                          className="shrink-0 h-[42px] w-[42px] bg-[#f0fdf4] border border-[#86efac] rounded-lg flex items-center justify-center text-[#15803d] hover:bg-[#dcfce7] transition-colors"
                          title={t.forms.scanBarcodeHint}
                        >
                          <ScanLine className="w-5 h-5" />
                        </button>
                      </div>
                    </Field>
                    <Field label={t.forms.category} error={errors.category} required span={2}>
                      <select value={form.category} onChange={set("category")} className={inputClass(!!errors.category)}>
                        <option value="">{t.forms.selectCategory}</option>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabels[c]}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>

                {/* Section: Pricing */}
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
                    {t.forms.sectionPricing}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label={t.forms.salePrice} error={errors.price} required>
                      <input type="number" value={form.price} onChange={set("price")}
                        placeholder="0" min="0"
                        className={inputClass(!!errors.price)} />
                    </Field>
                    <Field label={t.forms.costPrice} error={errors.costPrice} required>
                      <input type="number" value={form.costPrice} onChange={set("costPrice")}
                        placeholder="0" min="0"
                        className={inputClass(!!errors.costPrice)} />
                    </Field>
                    {margin !== null && (
                      <div className="col-span-2">
                        <div className={cn(
                          "flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl",
                          margin >= 20 ? "bg-[var(--success-light)] text-emerald-700"
                            : margin >= 10 ? "bg-[var(--warning-light)] text-amber-700"
                            : "bg-[var(--danger-light)] text-red-600"
                        )}>
                          <span>{t.forms.grossMargin}:</span>
                          <span className="tabular-nums">{margin}%</span>
                          <span className="text-xs font-normal opacity-70">
                            {margin >= 20 ? `✓ ${t.forms.marginGood}` : margin >= 10 ? `⚠ ${t.forms.marginLow}` : `✗ ${t.forms.marginBad}`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section: Stock */}
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
                    {t.forms.sectionStock}
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <Field label={t.forms.initialStock} error={errors.stock} required>
                      <input type="number" value={form.stock} onChange={set("stock")}
                        placeholder="0" min="0"
                        className={inputClass(!!errors.stock)} />
                    </Field>
                    <Field label={t.forms.minStock} error={errors.minStock} required>
                      <input type="number" value={form.minStock} onChange={set("minStock")}
                        placeholder="0" min="0"
                        className={inputClass(!!errors.minStock)} />
                    </Field>
                    <Field label={t.forms.unit}>
                      <select value={form.unit} onChange={set("unit")} className={inputClass(false)}>
                        {UNITS.map((u) => <option key={u} value={u}>{unitLabels[u]}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>

                {/* Section: Supplier & Expiry */}
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
                    {t.forms.sectionSupplier}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label={t.forms.supplier}>
                      <input type="text" value={form.supplier} onChange={set("supplier")}
                        placeholder={t.forms.supplierPh}
                        className={inputClass(false)} />
                    </Field>
                    <Field label={t.forms.expiryDate}>
                      <input type="date" value={form.expiryDate} onChange={set("expiryDate")}
                        className={inputClass(false)} />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)] shrink-0">
                <Button type="button" variant="secondary" onClick={onClose}>
                  {t.common.cancel}
                </Button>
                <Button type="submit" icon={<CheckCircle2 className="w-4 h-4" />}>
                  {t.common.save}
                </Button>
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
    "w-full border rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors bg-white",
    "placeholder:text-[var(--text-muted)]",
    hasError
      ? "border-red-400 focus:border-red-500"
      : "border-[var(--border)] focus:border-[var(--brand)]"
  );
}
