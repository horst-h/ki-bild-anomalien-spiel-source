import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "KI-Bild-Anomalien-Spiel",
        short_name: "KI-Spiel",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#0c447c",
      },
    }),
  ],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
      "/images": "http://localhost:3001",
    },
  },
});
