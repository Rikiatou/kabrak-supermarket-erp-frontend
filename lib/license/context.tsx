"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { LicenseValidator } from "./license-validator";
import type { LicenseData, ClientConfig, Store } from "./types";

interface LicenseContextType {
  // État
  license: LicenseData | null;
  config: ClientConfig | null;
  stores: Store[];
  loading: boolean;
  isActivated: boolean;
  isExpired: boolean;
  daysRemaining: number;

  // Actions
  activate: (licenseKey: string) => Promise<boolean>;
  deactivate: () => void;
  refreshConfig: () => Promise<void>;
  updateConfig: (updates: Partial<ClientConfig>) => Promise<boolean>;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [license, setLicense] = useState<LicenseData | null>(null);
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger depuis localStorage au démarrage
  useEffect(() => {
    const lic = LicenseValidator.getLicense();
    const cfg = LicenseValidator.getConfig();
    const str = LicenseValidator.getStores();
    setLicense(lic);
    setConfig(cfg);
    setStores(str);
    setLoading(false);

    // Re-valider avec le serveur en arrière-plan (si licence présente)
    if (lic) {
      LicenseValidator.revalidate()
        .then(() => {
          // Mettre à jour les states si revalidation OK
          const updatedLic = LicenseValidator.getLicense();
          const updatedCfg = LicenseValidator.getConfig();
          const updatedStr = LicenseValidator.getStores();
          if (updatedLic) setLicense(updatedLic);
          if (updatedCfg) setConfig(updatedCfg);
          if (updatedStr) setStores(updatedStr);
        })
        .catch(() => {
          // Erreur réseau — on garde les données locales (offline)
        });
    }
  }, []);

  // Activer une licence
  const activate = useCallback(async (licenseKey: string): Promise<boolean> => {
    try {
      const key = licenseKey.trim().toUpperCase();
      const encKey = encodeURIComponent(key);

      // 1. Fetch status
      const statusRes = await fetch(`/api/licenses/${encKey}/status`);
      if (!statusRes.ok) throw new Error(`Status ${statusRes.status}`);
      const status = await statusRes.json();

      // 2. Fetch config
      let config: any = null;
      try {
        const configRes = await fetch(`/api/licenses/${encKey}/config`);
        if (configRes.ok) config = await configRes.json();
      } catch {}

      // 3. Fetch stores
      let stores: any[] = [];
      try {
        const storesRes = await fetch(`/api/licenses/${encKey}/stores`);
        if (storesRes.ok) stores = await storesRes.json();
      } catch {}

      // 4. Build license data
      const now = new Date();
      const expiresAt = new Date(status.expiresAt);
      const isExpired = now > expiresAt;

      if (isExpired || status.status !== "ACTIVE") {
        throw new Error("Licence expirée ou inactive");
      }

      const licenseData = {
        licenseKey: status.licenseKey,
        clientName: status.clientName,
        type: status.type,
        maxStores: status.maxStores,
        modules: ["pos", "inventory", "purchases", "suppliers", "customers", "loyalty", "reports", "dashboard", "invoices", "employees", "cashiers", "schedules", "scanner", "losses", "accounting", "ai", "import", "notifications", "offline_sync", "cloud_backup"],
        issuedAt: status.issuedAt,
        expiresAt: status.expiresAt,
        daysRemaining: Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        status: status.status,
      };

      // 5. Save to localStorage
      localStorage.setItem("kabrak_license_data", JSON.stringify(licenseData));
      localStorage.setItem("kabrak_client_config", JSON.stringify(config));
      localStorage.setItem("kabrak_stores", JSON.stringify(stores));
      localStorage.setItem("kabrak_license_last_check", String(Date.now()));

      // 6. Update state
      setLicense(licenseData as any);
      setConfig(config);
      setStores(stores);

      return true;
    } catch (err: any) {
      console.error("License activation error:", err?.message || err);
      (window as any).__licenseError = err?.message || "Unknown error";
      return false;
    }
  }, []);

  // Désactiver
  const deactivate = useCallback(() => {
    LicenseValidator.clear();
    setLicense(null);
    setConfig(null);
    setStores([]);
  }, []);

  // Rafraîchir la config depuis le serveur
  const refreshConfig = useCallback(async () => {
    if (!license) return;
    const cfg = await LicenseValidator.fetchConfig(license.licenseKey);
    if (cfg) setConfig(cfg);
  }, [license]);

  // Mettre à jour la config
  const updateConfig = useCallback(
    async (updates: Partial<ClientConfig>): Promise<boolean> => {
      // Mode sans licence (mono-magasin) : sauvegarder en localStorage uniquement
      if (!license) {
        const currentCfg = LicenseValidator.getConfig();
        const merged = { ...currentCfg, ...updates } as ClientConfig;
        LicenseValidator.saveConfigLocal(merged);
        setConfig(merged);
        return true;
      }
      try {
        const cfg = await LicenseValidator.updateConfig(license.licenseKey, updates);
        if (cfg) {
          setConfig(cfg);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [license]
  );

  const isExpired = license ? new Date() > new Date(license.expiresAt) : true;
  const daysRemaining = license
    ? Math.ceil((new Date(license.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <LicenseContext.Provider
      value={{
        license,
        config,
        stores,
        loading,
        isActivated: !!license && !isExpired,
        isExpired,
        daysRemaining,
        activate,
        deactivate,
        refreshConfig,
        updateConfig,
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  const ctx = useContext(LicenseContext);
  if (!ctx) {
    // Retourner des valeurs par défaut pendant le SSR/prerender
    return {
      license: null,
      config: null,
      stores: [],
      loading: true,
      isActivated: false,
      isExpired: false,
      daysRemaining: 0,
      activate: async () => false,
      deactivate: () => {},
      refreshConfig: async () => {},
      updateConfig: async () => false,
    } as LicenseContextType;
  }
  return ctx;
}
