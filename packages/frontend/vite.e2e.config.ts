import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Separate Vite-Konfig für E2E-Tests:
// - Kein PWA-Plugin (beschleunigt den Start)
// - Proxy zeigt auf E2E-Backend (Port 3099)
// - Dev-Server läuft auf Port 5174 (kein Konflikt mit laufendem npm run dev)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:3099",
      "/images": "http://localhost:3099",
    },
  },
});
