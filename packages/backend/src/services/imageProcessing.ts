import sharp from "sharp";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { IMAGES_DIR } from "../db/client.js";

const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1600;

/**
 * Verarbeitet ein hochgeladenes Bild: Resize auf eine bildschirmtaugliche
 * Standardgröße (siehe Anforderungsdokument Abschnitt 18, Punkt 3) und
 * Speicherung im Daten-Volume. Gibt den relativen Dateinamen zurück.
 */
export async function processAndStoreImage(buffer: Buffer, originalName: string): Promise<string> {
  const ext = ".webp"; // einheitliches Format unabhängig vom Upload-Format
  const filename = `${randomUUID()}${ext}`;
  const targetPath = path.join(IMAGES_DIR, filename);

  await sharp(buffer)
    .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(targetPath);

  return filename;
}
