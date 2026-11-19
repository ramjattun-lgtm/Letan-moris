import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Letan Moris — Mauritius & Rodrigues weather",
    short_name: "Letan Moris",
    description: "Konn letan Moris ek Rodrig, planifie to zournee.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F8F9",
    theme_color: "#0B2A3C",
    lang: "en",
    categories: ["weather", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
