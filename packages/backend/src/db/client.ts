import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dataDir = process.env.DATA_DIR ?? path.resolve(__dirname, "../../data");
const imagesDir = path.join(dataDir, "images");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

export const db = new Database(path.join(dataDir, "app.db"));
db.pragma("journal_mode = WAL");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);

// Migration: suitability CHECK-Constraint um 'anspruchsvoll' erweitern
const imagesDdl = (
  db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='images'").get() as
  { sql: string } | undefined
)?.sql ?? "";
if (!imagesDdl.includes("anspruchsvoll")) {
  db.pragma("foreign_keys = OFF");
  db.exec(`
    BEGIN TRANSACTION;
    CREATE TABLE images_new (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      image_path TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('leicht','mittel','schwer')),
      suitability TEXT NOT NULL CHECK (suitability IN ('kinderfreundlich','allgemein','anspruchsvoll')),
      time_limit_seconds INTEGER NOT NULL,
      max_wrong_attempts INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('draft','published','archived')) DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO images_new SELECT * FROM images;
    DROP TABLE images;
    ALTER TABLE images_new RENAME TO images;
    COMMIT;
  `);
  db.pragma("foreign_keys = ON");
}

export const IMAGES_DIR = imagesDir;
