import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      devOptions: {
        enabled: true,
      },
      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
        "icon-192.png",
        "icon-512.png",
        "screenshots/desktop-wide.png",
        "screenshots/mobile.png",
      ],
      manifest: {
        id: "/",
        name: "Kip Inventory",
        short_name: "Kip Inventory",
        description:
          "Multi-warehouse inventory management for stock tracking, purchase orders, transfers, and approvals.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#FAFAFA",
        theme_color: "#4F46E5",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
        ],
        screenshots: [
          {
            src: "/screenshots/desktop-wide.png",
            sizes: "1384x932",
            type: "image/png",
            form_factor: "wide",
            label: "Kip Inventory homepage on desktop",
          },
          {
            src: "/screenshots/mobile.png",
            sizes: "495x876",
            type: "image/png",
            form_factor: "narrow",
            label: "Kip Inventory homepage on mobile",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webmanifest}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-static",
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
