"use client";

import type {
  LicenseData,
  ClientConfig,
  Store,
  LicenseValidationResponse,
} from "./types";

const STORAGE_KEY = "kabrak_license_data";
const CONFIG_KEY = "kabrak_client_config";
const STORES_KEY = "kabrak_stores";
const LAST_CHECK_KEY = "kabrak_license_last_check";

// Utiliser une URL relative /api pour passer par le proxy Next.js
// (next.config.ts rewrites /api/* → http://localhost:3001/api/*)
// Comme ça, peu importe l'IP du serveur (192.168.100.10 ou autre),
// le navigateur appelle /api/... sur le même host que le frontend
const API_URL = "/api";

// ========================================
// VALIDATEUR DE LICENCE (côté client)
// ========================================

export class LicenseValidator {
  // Charger la licence depuis localStorage
  static getLicense(): LicenseData | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // Charger la config client
  static getConfig(): ClientConfig | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(CONFIG_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // Charger les magasins
  static getStores(): Store[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Sauvegarder la licence + config + stores
  static save(data: LicenseValidationResponse) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.license));
    if (data.config) {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(data.config));
    }
    if (data.stores) {
      localStorage.setItem(STORES_KEY, JSON.stringify(data.stores));
    }
    localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
  }

  // Effacer la licence (logout / désactivation)
  static clear() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CONFIG_KEY);
    localStorage.removeItem(STORES_KEY);
    localStorage.removeItem(LAST_CHECK_KEY);
  }

  // Vérifier si une licence est présente
  static hasLicense(): boolean {
    return this.getLicense() !== null;
  }

  // Vérifier si la licence est expirée
  static isExpired(): boolean {
    const license = this.getLicense();
    if (!license) return true;
    return new Date() > new Date(license.expiresAt);
  }

  // Jours restants
  static getDaysRemaining(): number {
    const license = this.getLicense();
    if (!license) return 0;
    const diff = new Date(license.expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // Vérifier si on peut ajouter un magasin
  static canAddStore(): boolean {
    const license = this.getLicense();
    const stores = this.getStores();
    if (!license) return false;
    return stores.length < license.maxStores;
  }

  // Valider une clé de licence auprès du serveur
  static async validate(licenseKey: string): Promise<LicenseValidationResponse> {
    const res = await fetch(`${API_URL}/licenses/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Erreur de validation" }));
      throw new Error(error.message || `Erreur ${res.status}`);
    }

    const data: LicenseValidationResponse = await res.json();
    this.save(data);
    return data;
  }

  // Re-valider avec le serveur (vérification périodique)
  static async revalidate(): Promise<boolean> {
    const license = this.getLicense();
    if (!license) return false;

    // Ne pas re-valider plus d'une fois par 24h
    const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
    const now = Date.now();
    if (lastCheck && now - parseInt(lastCheck) < 24 * 60 * 60 * 1000) {
      return !this.isExpired();
    }

    try {
      await this.validate(license.licenseKey);
      return true;
    } catch {
      // Si le serveur est injoignable, on garde la licence locale
      // (mode offline — la licence reste valide jusqu'à expiration)
      return !this.isExpired();
    }
  }

  // Obtenir la config client (depuis le cache local ou le serveur)
  static async fetchConfig(licenseKey: string): Promise<ClientConfig | null> {
    try {
      const res = await fetch(`${API_URL}/licenses/${licenseKey}/config`);
      if (!res.ok) return null;
      const config: ClientConfig = await res.json();
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      return config;
    } catch {
      return this.getConfig();
    }
  }

  // Mettre à jour la config client
  static async updateConfig(
    licenseKey: string,
    updates: Partial<ClientConfig>
  ): Promise<ClientConfig | null> {
    const res = await fetch(`${API_URL}/licenses/${licenseKey}/config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Erreur" }));
      throw new Error(error.message || "Erreur de mise à jour");
    }

    const config: ClientConfig = await res.json();
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    return config;
  }
}
