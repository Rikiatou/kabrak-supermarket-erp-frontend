import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Autoriser toutes les origines LAN en dev (accès depuis les caisses WiFi)
  allowedDevOrigins: ["*"],

  // Proxy: /api/* → backend localhost:3001
  // Les caisses appellent http://[IP-SERVEUR]:3000/api/...
  // Next.js redirige vers http://localhost:3001/api/...
  // → L'IP du serveur n'a plus besoin d'être configurée côté client
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
