import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // forks-Pool erforderlich, damit native Module (better-sqlite3) korrekt laden
    pool: "forks",
    include: ["src/**/*.test.ts"],
  },
});
