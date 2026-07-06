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
      const data = await LicenseValidator.validate(licenseKey);
      setLicense(data.license);
      setConfig(data.config);
      setStores(data.stores);
      return true;
    } catch (err) {
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
