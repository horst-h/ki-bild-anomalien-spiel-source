import { z } from "zod";

// Bild-Kategorie und Eignungs-Tag (siehe Anforderungsdokument Abschnitt 4 / 4a)
export const ImageCategory = z.enum(["leicht", "mittel", "schwer"]);
export const ImageSuitability = z.enum(["kinderfreundlich", "allgemein", "anspruchsvoll"]);
export const ImageStatus = z.enum(["draft", "published", "archived"]);

// Normalisierte Polygon-Koordinaten (0..1, relativ zur Bildgröße)
export const PolygonPoint = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const AnomalyArea = z.object({
  id: z.string(),
  polygon: z.array(PolygonPoint).min(3),
  explanation: z.string().min(1),
});

export const ImageRecord = z.object({
  id: z.string(),
  title: z.string().min(1),
  imageUrl: z.string(),
  category: ImageCategory,
  suitability: ImageSuitability,
  timeLimitSeconds: z.number().int().positive(),
  maxWrongAttempts: z.number().int().positive(),
  anomalyAreas: z.array(AnomalyArea).min(1),
  status: ImageStatus,
});

// Request: Spiel starten
export const StartGameRequest = z.object({
  playerName: z.string().min(2).max(30),
  avatarLevel: z.string(),
});

// Request: Rundenergebnis übermitteln
export const TaskResultRequest = z.object({
  hits: z.number().int().min(0),
  wrongAttempts: z.number().int().min(0),
  remainingTimeSeconds: z.number().int().min(0),
  skipped: z.boolean(),
});

export type ImageRecordT = z.infer<typeof ImageRecord>;
export type AnomalyAreaT = z.infer<typeof AnomalyArea>;
export type StartGameRequestT = z.infer<typeof StartGameRequest>;
export type TaskResultRequestT = z.infer<typeof TaskResultRequest>;
