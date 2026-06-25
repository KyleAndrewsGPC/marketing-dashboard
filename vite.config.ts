import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  base: "/marketing-dashboard/",
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
    solid(),
    VitePWA({
      registerType: "autoUpdate",
      // The board must run fully offline on a kiosk display — precache everything.
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // Single-page app: always fall back to the shell when offline.
        navigateFallback: "index.html",
      },
      manifest: {
        name: "Velos · Mission Control",
        short_name: "Mission Control",
        description: "Simulated real-time production board (demo).",
        theme_color: "#080c16",
        background_color: "#080c16",
        display: "fullscreen",
        orientation: "landscape",
        start_url: "/",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
