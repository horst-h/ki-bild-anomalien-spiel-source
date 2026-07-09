import { describe, test, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  selectTasksForGame,
  suitabilityForLevel,
  AVATAR_LEVELS,
  type ImageRow,
} from "../services/gameSelection.js";

// ── Test-Datenbank (in-memory, Schema wie Produktion) ────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(__dirname, "../db/schema.sql"), "utf-8");

const testDb = new Database(":memory:");
testDb.pragma("journal_mode = WAL");
testDb.exec(schema);

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

let idCounter = 0;

function insertImage(
  category: "leicht" | "mittel" | "schwer",
  suitability: "jungfuchs" | "waldfuchs" | "erzfuchs" = "waldfuchs"
): string {
  const id = `img-${++idCounter}`;
  testDb
    .prepare(
      `INSERT INTO images (id, title, image_path, category, suitability, time_limit_seconds, max_wrong_attempts, status)
       VALUES (?, ?, ?, ?, ?, 60, 6, 'published')`
    )
    .run(id, `Testbild ${id}`, `${id}.webp`, category, suitability);
  return id;
}

function categories(tasks: ImageRow[]): string[] {
  return tasks.map((t) => t.category);
}

function uniqueIds(tasks: ImageRow[]): number {
  return new Set(tasks.map((t) => t.id)).size;
}

beforeEach(() => {
  // Alle Daten vor jedem Test löschen (Cascade löscht abhängige Tabellen)
  testDb.exec(
    "DELETE FROM game_task_hits; DELETE FROM game_tasks; DELETE FROM leaderboard_entries; DELETE FROM games; DELETE FROM anomaly_areas; DELETE FROM images;"
  );
});

// ── suitabilityForLevel ───────────────────────────────────────────────────────

describe("suitabilityForLevel", () => {
  test("jungfuchs → jungfuchs", () => {
    expect(suitabilityForLevel("jungfuchs")).toBe("jungfuchs");
  });

  test("waldfuchs → waldfuchs", () => {
    expect(suitabilityForLevel("waldfuchs")).toBe("waldfuchs");
  });

  test("erzfuchs → erzfuchs", () => {
    expect(suitabilityForLevel("erzfuchs")).toBe("erzfuchs");
  });

  test("unbekanntes Level → waldfuchs (sicherer Default)", () => {
    expect(suitabilityForLevel("unbekannt")).toBe("waldfuchs");
    expect(suitabilityForLevel("")).toBe("waldfuchs");
  });
});

// ── AVATAR_LEVELS ─────────────────────────────────────────────────────────────

describe("AVATAR_LEVELS", () => {
  test("enthält genau jungfuchs, waldfuchs, erzfuchs in dieser Reihenfolge", () => {
    expect(Array.from(AVATAR_LEVELS)).toEqual(["jungfuchs", "waldfuchs", "erzfuchs"]);
  });
});

// ── selectTasksForGame ────────────────────────────────────────────────────────

describe("selectTasksForGame", () => {
  test("gibt genau 3 Aufgaben zurück (eine pro Kategorie)", () => {
    insertImage("leicht");
    insertImage("mittel");
    insertImage("schwer");

    const tasks = selectTasksForGame("waldfuchs", testDb);

    expect(tasks).toHaveLength(3);
    expect(categories(tasks)).toContain("leicht");
    expect(categories(tasks)).toContain("mittel");
    expect(categories(tasks)).toContain("schwer");
  });

  test("keine Duplikate wenn der Katalog ausreicht", () => {
    insertImage("leicht");
    insertImage("mittel");
    insertImage("schwer");

    const tasks = selectTasksForGame("waldfuchs", testDb);

    expect(uniqueIds(tasks)).toBe(3);
  });

  test("Duplikate werden erlaubt wenn der Katalog zu klein ist (schwer fehlt)", () => {
    // Mit nur leicht+mittel: schwer-Slot fällt per Last-Resort-Loop auf mittel zurück
    insertImage("leicht");
    insertImage("mittel");

    const tasks = selectTasksForGame("waldfuchs", testDb);

    expect(tasks).toHaveLength(3);
    expect(uniqueIds(tasks)).toBeLessThan(3);
  });

  test("jungfuchs bevorzugt jungfuchs-Bilder", () => {
    // Je eine jungfuchs- und eine waldfuchs-Version pro Kategorie
    const jfLeicht = insertImage("leicht", "jungfuchs");
    insertImage("leicht", "waldfuchs");
    const jfMittel = insertImage("mittel", "jungfuchs");
    insertImage("mittel", "waldfuchs");
    const jfSchwer = insertImage("schwer", "jungfuchs");
    insertImage("schwer", "waldfuchs");

    const tasks = selectTasksForGame("jungfuchs", testDb);

    // Mit je 1 jungfuchs-Option pro Kategorie ist das Ergebnis deterministisch
    const ids = tasks.map((t) => t.id);
    expect(ids).toContain(jfLeicht);
    expect(ids).toContain(jfMittel);
    expect(ids).toContain(jfSchwer);
    tasks.forEach((t) => expect(t.suitability).toBe("jungfuchs"));
  });

  test("jungfuchs fällt auf waldfuchs zurück wenn keine jungfuchs-Bilder vorhanden", () => {
    insertImage("leicht", "waldfuchs");
    insertImage("mittel", "waldfuchs");
    insertImage("schwer", "waldfuchs");

    const tasks = selectTasksForGame("jungfuchs", testDb);

    expect(tasks).toHaveLength(3);
    tasks.forEach((t) => expect(t.suitability).toBe("waldfuchs"));
  });

  test("Fallback schwer → mittel → leicht wenn schwer-Bilder fehlen", () => {
    const leichtId = insertImage("leicht");
    insertImage("mittel");
    // Kein schwer-Bild

    const tasks = selectTasksForGame("waldfuchs", testDb);

    // Die ersten zwei Slots (leicht, mittel) werden eindeutig befüllt
    expect(tasks[0].category).toBe("leicht");
    expect(tasks[0].id).toBe(leichtId);
    expect(tasks[1].category).toBe("mittel");
    // Der schwer-Slot greift auf mittel zurück (Last-Resort-Duplikat)
    expect(tasks[2].category).toBe("mittel");
  });

  test("wirft Fehler wenn leicht-Bilder vollständig fehlen", () => {
    // Kein einziges Bild → bereits die erste Kategorie (leicht) schlägt fehl
    expect(() => selectTasksForGame("waldfuchs", testDb)).toThrow(
      'Kein Bild für Kategorie "leicht"'
    );
  });

  test("wirft Fehler wenn nur schwer-Bilder vorhanden sind (leicht bleibt leer)", () => {
    // leicht hat weder direkte noch Fallback-Bilder
    insertImage("schwer");
    insertImage("schwer");

    expect(() => selectTasksForGame("waldfuchs", testDb)).toThrow(
      'Kein Bild für Kategorie "leicht"'
    );
  });

  test("erzfuchs fällt auf waldfuchs-Bilder zurück wenn keine erzfuchs-Bilder vorhanden", () => {
    insertImage("leicht", "waldfuchs");
    insertImage("mittel", "waldfuchs");
    insertImage("schwer", "waldfuchs");

    const tasks = selectTasksForGame("erzfuchs", testDb);

    expect(tasks).toHaveLength(3);
    tasks.forEach((t) => expect(t.suitability).toBe("waldfuchs"));
  });

  test("erzfuchs bevorzugt erzfuchs-Bilder wenn vorhanden", () => {
    const efLeicht = insertImage("leicht", "erzfuchs");
    insertImage("leicht", "waldfuchs");
    const efMittel = insertImage("mittel", "erzfuchs");
    insertImage("mittel", "waldfuchs");
    const efSchwer = insertImage("schwer", "erzfuchs");
    insertImage("schwer", "waldfuchs");

    const tasks = selectTasksForGame("erzfuchs", testDb);

    const ids = tasks.map((t) => t.id);
    expect(ids).toContain(efLeicht);
    expect(ids).toContain(efMittel);
    expect(ids).toContain(efSchwer);
    tasks.forEach((t) => expect(t.suitability).toBe("erzfuchs"));
  });

  test("nur veröffentlichte Bilder (status='published') werden berücksichtigt", () => {
    // Draft-Bild direkt per SQL einfügen
    testDb
      .prepare(
        `INSERT INTO images (id, title, image_path, category, suitability, time_limit_seconds, max_wrong_attempts, status)
         VALUES ('draft-1', 'Draft', 'draft.webp', 'leicht', 'waldfuchs', 60, 6, 'draft')`
      )
      .run();

    // Kein published-Bild → leicht nicht bedienbar → Fehler
    expect(() => selectTasksForGame("waldfuchs", testDb)).toThrow(
      'Kein Bild für Kategorie "leicht"'
    );
  });
});
