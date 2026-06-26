"use client";

import { useState, useEffect, useRef } from "react";
import { useLicense } from "@/lib/license/context";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import {
  Store,
  Save,
  Loader2,
  CheckCircle2,
  Building2,
  Receipt,
  Palette,
  Phone,
  MapPin,
  Globe,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { ClientConfig } from "@/lib/license/types";

export default function SettingsPage() {
  const { config, license, updateConfig, refreshConfig, stores } = useLicense();
  const { user } = useAuth();
  const { t } = useI18n();

  const [form, setForm] = useState<Partial<ClientConfig>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seul le boss peut modifier les paramètres
  const canEdit = user?.role === "boss";

  useEffect(() => {
    if (config) {
      setForm(config);
      setLoading(false);
    }
  }, [config]);

  const handleChange = (field: keyof ClientConfig, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !license?.licenseKey) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (JPG, PNG, GIF, etc.)");
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("L'image est trop grande (max 5MB)");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const token = typeof window !== "undefined" ? localStorage.getItem("kabrak_auth_token") : null;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/licenses/${license.licenseKey}/upload-logo`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      );

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      handleChange("logoUrl", data.logoUrl);
      
      // Sauvegarder automatiquement
      await updateConfig({ ...form, logoUrl: data.logoUrl });
      await refreshConfig();
    } catch (error) {
      console.error("Upload error:", error);
      alert("Erreur lors de l'upload du logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const ok = await updateConfig(form);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <AppShell title={t.settings?.title || "Settings"} subtitle={t.settings?.subtitle || ""}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={t.settings?.title || "Settings"} subtitle={t.settings?.subtitle || "Nom, logo, tickets, factures"}>
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Store className="w-6 h-6" />
            {t.settings?.title || "Settings"}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {t.settings?.subtitle || "Personnalisez votre ERP: nom, logo, tickets, factures"}
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t.settings?.saving || "Enregistrement..."}
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                {t.settings?.saved || "Saved!"}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t.settings?.save || "Save"}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Licence Info */}
      {license && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 text-sm">Active License</h3>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-blue-800">
                <div>
                  <span className="font-medium">Type:</span> {license.type === "STANDARD" ? "Standard" : "Multi-Store"}
                </div>
                <div>
                  <span className="font-medium">Stores:</span> {stores.length} / {license.maxStores}
                </div>
                <div>
                  <span className="font-medium">Expires:</span> {new Date(license.expiresAt).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Days left:</span> {license.daysRemaining}
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2 font-mono">{license.licenseKey}</p>
            </div>
          </div>
        </div>
      )}

      {/* Identité */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Store className="w-5 h-5 text-blue-600" />
          Store Identity
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Store name *
            </label>
            <input
              type="text"
              value={form.supermarketName || ""}
              onChange={(e) => handleChange("supermarketName", e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              placeholder="Easy Shop"
            />
            <p className="text-xs text-slate-400 mt-1">Shown on dashboard, receipts and invoices</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Slogan
            </label>
            <input
              type="text"
              value={form.supermarketSlogan || ""}
              onChange={(e) => handleChange("supermarketSlogan", e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              placeholder="Your neighborhood store"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Store logo
            </label>
            
            {/* Aperçu du logo */}
            {form.logoUrl && (
              <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <img
                  src={form.logoUrl}
                  alt="Logo"
                  className="h-16 w-auto object-contain"
                />
              </div>
            )}

            {/* Bouton upload */}
            <div className="flex gap-2 mb-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadLogo}
                disabled={!canEdit || uploading}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canEdit || uploading}
                className="flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload logo
                  </>
                )}
              </Button>
              
              {form.logoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleChange("logoUrl", "")}
                  disabled={!canEdit}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              )}
            </div>

            {/* Champ URL manuel (optionnel) */}
            <details className="mt-2">
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
              Or enter a URL manually
              </summary>
              <input
                type="text"
                value={form.logoUrl || ""}
                onChange={(e) => handleChange("logoUrl", e.target.value)}
                disabled={!canEdit}
                className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                placeholder="https://... ou /uploads/logo.png"
              />
            </details>

            <p className="text-xs text-slate-400 mt-1">
              Logo shown in sidebar, receipts and invoices (max 5MB)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Brand color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={form.primaryColor || "#2563eb"}
                onChange={(e) => handleChange("primaryColor", e.target.value)}
                disabled={!canEdit}
                className="w-12 h-10 border border-slate-300 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={form.primaryColor || "#2563eb"}
                onChange={(e) => handleChange("primaryColor", e.target.value)}
                disabled={!canEdit}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Coordonnées */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          Contact details
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
            <input
              type="text"
              value={form.address || ""}
              onChange={(e) => handleChange("address", e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              placeholder="123 Main St, City"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Phone className="w-3.5 h-3.5 inline mr-1" />
              Phone
            </label>
            <input
              type="text"
              value={form.phone || ""}
              onChange={(e) => handleChange("phone", e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              placeholder="+237 233 332 600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              placeholder="contact@easyshop.cm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Globe className="w-3.5 h-3.5 inline mr-1" />
              Site web
            </label>
            <input
              type="text"
              value={form.website || ""}
              onChange={(e) => handleChange("website", e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              placeholder="www.easyshop.cm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Devise</label>
            <input
              type="text"
              value={form.currency || "FCFA"}
              onChange={(e) => handleChange("currency", e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
            />
          </div>
        </div>
      </div>

      {/* Legal Information */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-600" />
          Legal Information (on invoices)
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">RCCM / RC Number</label>
            <input
              type="text"
              value={(form as any).rccmNumber || ""}
              onChange={(e) => handleChange("rccmNumber" as any, e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              placeholder="CM/YDE/2024/B/123"
            />
            <p className="text-xs text-slate-400 mt-1">Shown on invoice header</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tax ID / N° Contribuable</label>
            <input
              type="text"
              value={(form as any).taxNumber || ""}
              onChange={(e) => handleChange("taxNumber" as any, e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              placeholder="M0123456789012"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Legal Form</label>
            <input
              type="text"
              value={(form as any).legalForm || ""}
              onChange={(e) => handleChange("legalForm" as any, e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              placeholder="SARL, EURL, SA..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Capital</label>
            <input
              type="text"
              value={(form as any).capital || ""}
              onChange={(e) => handleChange("capital" as any, e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              placeholder="5,000,000 FCFA"
            />
          </div>
        </div>
      </div>

      {/* Personnalisation Tickets */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-600" />
          Receipts
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Receipt header
            </label>
            <textarea
              value={form.receiptHeader || ""}
              onChange={(e) => handleChange("receiptHeader", e.target.value)}
              disabled={!canEdit}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              placeholder="Welcome to Easy Shop!"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Receipt footer
            </label>
            <textarea
              value={form.receiptFooter || ""}
              onChange={(e) => handleChange("receiptFooter", e.target.value)}
              disabled={!canEdit}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              placeholder="Goods sold are non refundable. Thanks for patronizing us"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="receiptShowLogo"
              checked={form.receiptShowLogo ?? true}
              onChange={(e) => handleChange("receiptShowLogo", e.target.checked)}
              disabled={!canEdit}
              className="w-4 h-4 accent-blue-600"
            />
            <label htmlFor="receiptShowLogo" className="text-sm text-slate-700">
              Show logo on receipts
            </label>
          </div>
        </div>
      </div>

      {/* Factures */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-600" />
          Invoices
        </h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Invoice footer
          </label>
          <textarea
            value={form.invoiceFooter || ""}
            onChange={(e) => handleChange("invoiceFooter", e.target.value)}
            disabled={!canEdit}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
            placeholder="Easy Shop Ltd · Reg: ... · Tax ID: ... · 123 Main St · Tel: +237 ..."
          />
        </div>
      </div>

      {/* POS Settings */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-blue-600" />
          POS Settings
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enableLoyalty"
              checked={form.enableLoyalty ?? true}
              onChange={(e) => handleChange("enableLoyalty", e.target.checked)}
              disabled={!canEdit}
              className="w-4 h-4 accent-blue-600"
            />
            <label htmlFor="enableLoyalty" className="text-sm text-slate-700">
              Enable loyalty program (customer points)
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enableAutoPrint"
              checked={form.enableAutoPrint ?? false}
              onChange={(e) => handleChange("enableAutoPrint", e.target.checked)}
              disabled={!canEdit}
              className="w-4 h-4 accent-blue-600"
            />
            <label htmlFor="enableAutoPrint" className="text-sm text-slate-700">
              Auto-print receipts after payment
            </label>
          </div>
        </div>
      </div>

      {/* Magasins (Multi-Store) */}
      {license?.type === "MULTI_STORE" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Magasins ({stores.length} / {license.maxStores})
          </h2>
          <div className="space-y-2">
            {stores.map((store) => (
              <div key={store.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm text-slate-900">{store.name}</p>
                  <p className="text-xs text-slate-500">
                    {store.code} · {store.city || "—"} · {store.isActive ? "Actif" : "Inactif"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Read-only notice */}
      {!canEdit && (
        <div className="text-center text-sm text-slate-400">
          {t.settings?.onlyBoss || "Only the manager (Boss) can edit these settings."}
        </div>
      )}
    </div>
    </AppShell>
  );
}
