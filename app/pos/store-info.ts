import type { ClientConfig } from "@/lib/license/types";

// Info statique par défaut (fallback si pas de licence/config)
export const STORE_INFO = {
  name: "EASY SHOP LIMBE",
  address: "5 NAMBEKE STREET",
  phone: "Tel: 233332600",
  receiptFooter: "Merci de votre visite !",
  logoUrl: null as string | null,
};

// Récupère les infos du magasin depuis la config client (licence)
// Fallback sur STORE_INFO si pas de config
export function getStoreInfo(config: ClientConfig | null) {
  if (!config) return STORE_INFO;

  return {
    name: config.supermarketName || STORE_INFO.name,
    address: config.address || STORE_INFO.address,
    phone: config.phone ? `Tel: ${config.phone}` : STORE_INFO.phone,
    receiptFooter: config.receiptFooter || STORE_INFO.receiptFooter,
    logoUrl: config.logoUrl || null,
  };
}
