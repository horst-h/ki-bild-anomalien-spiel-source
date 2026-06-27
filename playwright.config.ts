import { defineConfig } from "@playwright/test";
import path from "path";

const E2E_DATA_DIR = path.join(process.cwd(), "packages/backend/data/e2e");

// E2E-Backend läuft auf Port 3099 (kein Konflikt mit Dev-Backend auf 3001).
// E2E-Frontend läuft auf Port 5174 mit Proxy auf 3099 (kein Konflikt mit Dev-Frontend auf 5173).
// reuseExistingServer: false → Playwright startet immer eigene Server mit E2E-Testdaten.
const E2E_BACKEND_PORT = 3099;
const E2E_FRONTEND_PORT = 5174;

export default defineConfig({
  testDir: "./tests/e2e/specs",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",

  use: {
    baseURL: `http://localhost:${E2E_FRONTEND_PORT}`,
    trace: "on-first-retry",
  },

  timeout: 30_000,
  expect: { timeout: 8_000 },

  // Sequenziell, damit globale DB-State nicht durch parallele Tests korrumpiert wird
  workers: 1,

  webServer: [
    {
      command: "npm run start:e2e --workspace=backend",
      port: E2E_BACKEND_PORT,
      env: {
        ...(process.env as Record<string, string>),
        DATA_DIR: E2E_DATA_DIR,
        PORT: String(E2E_BACKEND_PORT),
      },
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npm run dev:e2e --workspace=frontend",
      port: E2E_FRONTEND_PORT,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
