import { db } from "../db/client.js";

export type Category = "leicht" | "mittel" | "schwer";
export type Suitability = "jungfuchs" | "waldfuchs" | "erzfuchs";

export interface ImageRow {
  id: string;
  title: string;
  image_path: string;
  category: Category;
  suitability: Suitability;
  time_limit_seconds: number;
  max_wrong_attempts: number;
}

// Avatar-Level-Namen stimmen 1:1 mit den suitability-Werten in der DB überein.
const AVATAR_LEVELS = ["jungfuchs", "waldfuchs", "erzfuchs"] as const;
const VALID_SUITABILITIES = new Set<string>(AVATAR_LEVELS);

export function suitabilityForLevel(avatarLevel: string): Suitability {
  return VALID_SUITABILITIES.has(avatarLevel) ? (avatarLevel as Suitability) : "waldfuchs";
}

function fetchPublished(
  category: Category,
  dbInst: typeof db,
  suitability?: Suitability
): ImageRow[] {
  if (suitability) {
    return dbInst
      .prepare(
        `SELECT * FROM images WHERE status = 'published' AND category = ? AND suitability = ?`
      )
      .all(category, suitability) as ImageRow[];
  }
  return dbInst
    .prepare(`SELECT * FROM images WHERE status = 'published' AND category = ?`)
    .all(category) as ImageRow[];
}

function pickRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Wählt für eine Zielkategorie ein Bild aus, gefiltert nach Eignungs-Tag (Level).
 * Fallback-Kette (Abschnitt 4 / 4a):
 *  - Reicht das level-gefilterte Angebot der Kategorie nicht aus, wird auf
 *    die gesamte Kategorie (ohne Level-Filter) zurückgefallen.
 *  - Reicht auch das nicht, wird die nächst-leichtere Kategorie verwendet
 *    (schwer -> mittel -> leicht).
 *  - Bereits verwendete Bilder werden vermieden, außer der Katalog reicht
 *    dafür nicht aus.
 */
function pickImageForCategory(
  category: Category,
  suitability: Suitability,
  excludeIds: Set<string>,
  dbInst: typeof db
): ImageRow | undefined {
  const fallbackChain: Category[] =
    category === "schwer"
      ? ["schwer", "mittel", "leicht"]
      : category === "mittel"
        ? ["mittel", "leicht"]
        : ["leicht"];

  for (const cat of fallbackChain) {
    const levelFiltered = fetchPublished(cat, dbInst, suitability).filter((i) => !excludeIds.has(i.id));
    if (levelFiltered.length > 0) return pickRandom(levelFiltered);

    const anySuitability = fetchPublished(cat, dbInst).filter((i) => !excludeIds.has(i.id));
    if (anySuitability.length > 0) return pickRandom(anySuitability);
  }

  // Letzter Ausweg: Duplikate erlauben, falls der Katalog insgesamt zu klein ist
  for (const cat of fallbackChain) {
    const levelFiltered = fetchPublished(cat, dbInst, suitability);
    if (levelFiltered.length > 0) return pickRandom(levelFiltered);
    const anySuitability = fetchPublished(cat, dbInst);
    if (anySuitability.length > 0) return pickRandom(anySuitability);
  }

  return undefined;
}

export function selectTasksForGame(avatarLevel: string, dbInst: typeof db = db): ImageRow[] {
  const suitability = suitabilityForLevel(avatarLevel);
  const used = new Set<string>();
  const tasks: ImageRow[] = [];

  for (const category of ["leicht", "mittel", "schwer"] as Category[]) {
    const image = pickImageForCategory(category, suitability, used, dbInst);
    if (!image) {
      throw new Error(
        `Kein Bild für Kategorie "${category}" verfügbar – Spiel kann nicht gestartet werden.`
      );
    }
    used.add(image.id);
    tasks.push(image);
  }

  return tasks;
}

export { AVATAR_LEVELS };
