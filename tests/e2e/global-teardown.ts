import path from "path";
import fs from "fs";

const E2E_DATA_DIR = path.join(process.cwd(), "packages/backend/data/e2e");

export default async function globalTeardown() {
  fs.rmSync(E2E_DATA_DIR, { recursive: true, force: true });
}
