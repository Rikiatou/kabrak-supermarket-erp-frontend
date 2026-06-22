import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KABRAK Retail",
    short_name: "KABRAK",
    description: "Complete retail management solution",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f4f6fb",
    theme_color: "#1a56db",
    orientation: "landscape",
    icons: [
      {
        src: "/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
    categories: ["business", "productivity"],
  };
}
