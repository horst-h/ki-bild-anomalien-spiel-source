/**
 * Seed-Skript für E2E-Tests: fügt 3 veröffentlichte Testbilder
 * (leicht/mittel/schwer) mit je einem Anomalie-Bereich ein.
 *
 * Nutzung:
 *   node packages/backend/scripts/seed-test-data.mjs
 *
 * Polygon-Quadrat je Bild: {x:0.1,y:0.1} … {x:0.3,y:0.3}
 *   → Treffer-Klick:  x=0.2, y=0.2
 *   → Fehler-Klick:   x=0.9, y=0.9
 */

import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import fs from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "../data/app.db");
const dataDir = dirname(dbPath);
const imagesDir = join(dataDir, "images");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// Schema anwenden (idempotent dank CREATE TABLE IF NOT EXISTS)
const schema = fs.readFileSync(join(__dirname, "../src/db/schema.sql"), "utf-8");
db.exec(schema);

// Polygon: einfaches Quadrat oben-links
const testPolygon = [
  { x: 0.1, y: 0.1 },
  { x: 0.3, y: 0.1 },
  { x: 0.3, y: 0.3 },
  { x: 0.1, y: 0.3 },
];

const images = [
  { category: "leicht",  title: "Testbild Leicht",  suitability: "kinderfreundlich" },
  { category: "mittel",  title: "Testbild Mittel",  suitability: "allgemein" },
  { category: "schwer",  title: "Testbild Schwer",  suitability: "allgemein" },
];

const insertImage = db.prepare(`
  INSERT OR IGNORE INTO images (id, title, image_path, category, suitability, time_limit_seconds, max_wrong_attempts, status)
  VALUES (?, ?, ?, ?, ?, 60, 6, 'published')
`);

const insertArea = db.prepare(`
  INSERT OR IGNORE INTO anomaly_areas (id, image_id, polygon_json, explanation)
  VALUES (?, ?, ?, ?)
`);

const imageIds = [];

for (const img of images) {
  const id = randomUUID();
  insertImage.run(id, img.title, `${id}.webp`, img.category, img.suitability);
  insertArea.run(
    randomUUID(),
    id,
    JSON.stringify(testPolygon),
    `KI-Fehler: Musterbeispiel für ${img.category}e Kategorie`
  );
  imageIds.push({ id, category: img.category });
  console.log(`✓ ${img.category.padEnd(7)} ${id}`);
}

console.log("\nSeed abgeschlossen. Bilder:");
console.log("  Treffer-Klick:  x=0.2, y=0.2");
console.log("  Fehler-Klick:   x=0.9, y=0.9");
console.log("\nImage-IDs für manuelle Tests:");
imageIds.forEach(({ id, category }) => console.log(`  ${category}: ${id}`));
