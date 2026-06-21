"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import type { ClientConfig } from "@/lib/license/types";

export default function SettingsPage() {
  const { config, license, updateConfig, refreshConfig, stores } = useLicense();
  const { user } = useAuth();
  const { t } = useI18n();

  const [form, setForm] = useState<Partial<ClientConfig>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

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
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Store className="w-6 h-6" />
            Paramètres du Supermarché
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Personnalisez votre ERP: nom, logo, tickets, factures
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enregistrement...
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Enregistré!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Enregistrer
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
              <h3 className="font-semibold text-blue-900 text-sm">Licence Active</h3>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-blue-800">
                <div>
                  <span className="font-medium">Type:</span> {license.type === "STANDARD" ? "Standard" : "Multi-Store"}
                </div>
                <div>
                  <span className="font-medium">Magasins:</span> {stores.length} / {license.maxStores}
                </div>
                <div>
                  <span className="font-medium">Expire le:</span> {new Date(license.expiresAt).toLocaleDateString("fr-FR")}
                </div>
                <div>
                  <span className="font-medium">Jours restants:</span> {license.daysRemaining}
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
          Identité du Supermarché
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nom du supermarché *
            </label>
            <input
              type="text"
              value={form.supermarketName || ""}
              onChange={(e) => handleChange("supermarketName", e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              placeholder="Easy Shop"
            />
            <p className="text-xs text-slate-400 mt-1">Affiché sur le dashboard, tickets et factures</p>
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
              placeholder="Votre supermarché de proximité"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              URL du logo
            </label>
            <input
              type="text"
              value={form.logoUrl || ""}
              onChange={(e) => handleChange("logoUrl", e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              placeholder="https://... ou /uploads/logo.png"
            />
            <p className="text-xs text-slate-400 mt-1">Logo affiché sur la sidebar et les tickets</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Couleur principale
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
          Coordonnées
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
              placeholder="Carrefour Obili, Yaoundé"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Phone className="w-3.5 h-3.5 inline mr-1" />
              Téléphone
            </label>
            <input
              type="text"
              value={form.phone || ""}
              onChange={(e) => handleChange("phone", e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              placeholder="+237 6 XX XX XX XX"
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

      {/* Personnalisation Tickets */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-600" />
          Tickets de Caisse
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              En-tête du ticket
            </label>
            <textarea
              value={form.receiptHeader || ""}
              onChange={(e) => handleChange("receiptHeader", e.target.value)}
              disabled={!canEdit}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              placeholder="Bienvenue chez Easy Shop!"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Pied de page du ticket
            </label>
            <textarea
              value={form.receiptFooter || ""}
              onChange={(e) => handleChange("receiptFooter", e.target.value)}
              disabled={!canEdit}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              placeholder="Merci de votre visite! À bientôt chez Easy Shop"
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
              Afficher le logo sur les tickets
            </label>
          </div>
        </div>
      </div>

      {/* Factures */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-600" />
          Factures A4
        </h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Pied de page des factures
          </label>
          <textarea
            value={form.invoiceFooter || ""}
            onChange={(e) => handleChange("invoiceFooter", e.target.value)}
            disabled={!canEdit}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
            placeholder="Easy Shop SARL · RCCM: CM/.../... · N° Contribuable: ... · Carrefour Obili, Yaoundé · Tél: +237 ..."
          />
        </div>
      </div>

      {/* Paramètres POS */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-blue-600" />
          Paramètres POS
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
              Activer le programme de fidélité (points clients)
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
              Impression automatique des tickets après paiement
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Taux de TVA par défaut (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.taxRate ?? 15.5}
              onChange={(e) => handleChange("taxRate", parseFloat(e.target.value))}
              disabled={!canEdit}
              className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
            />
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
          Seul le gérant (Boss) peut modifier ces paramètres.
        </div>
      )}
    </div>
  );
}
