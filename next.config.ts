import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Autoriser tous les LAN privés (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  // Nécessaire pour que les caisses/téléphones WiFi chargent le JS React
  allowedDevOrigins: [
    "192.168.0.0/16",
    "10.0.0.0/8",
    "172.16.0.0/12",
  ],

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
