import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import sharp from "sharp";

const E2E_DATA_DIR = path.join(process.cwd(), "packages/backend/data/e2e");
const SCHEMA_PATH = path.join(process.cwd(), "packages/backend/src/db/schema.sql");

// Polygon das 20-80% des Bildes abdeckt: jeder Klick nahe der Mitte trifft.
const TEST_POLYGON = JSON.stringify([
  { x: 0.2, y: 0.2 },
  { x: 0.8, y: 0.2 },
  { x: 0.8, y: 0.8 },
  { x: 0.2, y: 0.8 },
]);

export default async function globalSetup() {
  const imagesDir = path.join(E2E_DATA_DIR, "images");
  fs.mkdirSync(imagesDir, { recursive: true });

  // Minimales 10×10 WebP damit der Backend-Statik-Server kein ENOENT wirft
  await sharp({
    create: { width: 10, height: 10, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .webp()
    .toFile(path.join(imagesDir, "e2e-placeholder.webp"));

  const db = new Database(path.join(E2E_DATA_DIR, "app.db"));
  db.pragma("journal_mode = WAL");
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf-8"));

  const insertImage = db.prepare(
    `INSERT OR IGNORE INTO images
       (id, title, image_path, category, suitability, time_limit_seconds, max_wrong_attempts, status)
     VALUES (?, ?, 'e2e-placeholder.webp', ?, 'allgemein', 60, 6, 'published')`
  );
  const insertArea = db.prepare(
    `INSERT OR IGNORE INTO anomaly_areas (id, image_id, polygon_json, explanation)
     VALUES (?, ?, ?, 'E2E-Test-Anomalie')`
  );

  for (const [id, title, category] of [
    ["e2e-leicht", "E2E Testbild Leicht", "leicht"],
    ["e2e-mittel", "E2E Testbild Mittel", "mittel"],
    ["e2e-schwer", "E2E Testbild Schwer", "schwer"],
  ] as const) {
    insertImage.run(id, title, category);
    insertArea.run(`${id}-area`, id, TEST_POLYGON);
  }

  db.close();
}
