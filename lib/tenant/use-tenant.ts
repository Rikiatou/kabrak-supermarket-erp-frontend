"use client";

import { useEffect, useState } from "react";

export interface TenantInfo {
  tenantId: string;
  clientName: string;
  subdomain: string;
  supermarketName: string;
  logoUrl: string | null;
  primaryColor: string;
  currency: string;
  stores: Array<{ id: string; name: string; code: string; city: string | null }>;
  expiresAt: string;
}

/**
 * Detect subdomain from the browser URL and resolve tenant info.
 * Returns null if not on a tenant subdomain (marketing site or local dev).
 */
export function useTenantResolution() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function resolveTenant() {
      try {
        const host = window.location.hostname;

        // Check if we're on a tenant subdomain
        if (!host.includes("kabrak-retail.com")) {
          // Local dev or other domain - no tenant resolution
          setLoading(false);
          return;
        }

        const parts = host.split(".");
        if (parts.length < 3) {
          // www.kabrak-retail.com or kabrak-retail.com - marketing site
          setLoading(false);
          return;
        }

        const subdomain = parts[0];
        const MARKETING = ["www", "app", "admin", "api", "mail", "blog"];
        if (MARKETING.includes(subdomain)) {
          setLoading(false);
          return;
        }

        // Resolve tenant via backend
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
        const res = await fetch(`${apiUrl}/licenses/resolve/${subdomain}`);

        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Tenant not found" }));
          setError(err.message || "Tenant not found");
          setLoading(false);
          return;
        }

        const data = await res.json();
        setTenant(data);

        // Store tenantId in localStorage for API calls
        localStorage.setItem("kabrak_tenant_id", data.tenantId);
        localStorage.setItem("kabrak_tenant_info", JSON.stringify(data));

        setLoading(false);
      } catch (e: any) {
        setError(e.message || "Failed to resolve tenant");
        setLoading(false);
      }
    }

    resolveTenant();
  }, []);

  return { tenant, loading, error };
}
