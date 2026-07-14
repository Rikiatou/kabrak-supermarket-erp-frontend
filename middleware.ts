import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Subdomains du marketing site (a ignorer - pas des tenants)
const MARKETING_SUBDOMAINS = ["www", "app", "admin", "api", "mail", "blog"];

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  // Extraire le subdomain: "easyshop.kabrak-retail.com" -> "easyshop"
  // Pour le dev local: "localhost:3000" -> pas de subdomain
  const parts = host.split(".");
  let subdomain: string | null = null;

  if (host.includes("kabrak-retail.com")) {
    if (parts.length >= 3) {
      // easyshop.kabrak-retail.com -> parts = ["easyshop", "kabrak-retail", "com"]
      subdomain = parts[0];
    }
    // Si www.kabrak-retail.com ou kabrak-retail.com -> pas de tenant (marketing site)
  }

  // Ignorer les subdomains du marketing/site principal
  if (subdomain && MARKETING_SUBDOMAINS.includes(subdomain)) {
    subdomain = null;
  }

  if (subdomain) {
    // Ajouter X-Tenant-Subdomain header pour que le frontend puisse le lire
    const response = NextResponse.next();
    response.headers.set("X-Tenant-Subdomain", subdomain);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|logo|images|icons).*)"],
};
