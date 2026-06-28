import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { db, IMAGES_DIR } from "../../db/client.js";
import { processAndStoreImage } from "../../services/imageProcessing.js";
import { requireAdmin } from "../../middleware/adminAuth.js";
import { polygonsIntersect } from "../../services/geometry.js";

export const adminCatalogRouter = Router();
adminCatalogRouter.use(requireAdmin);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB, siehe Anforderungsdokument 18.3
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const PointSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) });

const AreaSchema = z.object({
  id: z.string().optional(),
  polygon: z.array(PointSchema).min(3),
  explanation: z.string(),
});

const UpdateImageSchema = z.object({
  title: z.string().min(1).optional(),
  category: z.enum(["leicht", "mittel", "schwer"]).optional(),
  suitability: z.enum(["kinderfreundlich", "allgemein"]).optional(),
  timeLimitSeconds: z.number().int().positive().optional(),
  maxWrongAttempts: z.number().int().positive().optional(),
  anomalyAreas: z.array(AreaSchema).optional(),
});

// --- GET /api/admin/images – Katalog (alle Status) ---
adminCatalogRouter.get("/", (_req, res) => {
  const images = db.prepare(`SELECT * FROM images ORDER BY created_at DESC`).all();
  const withAreas = (images as any[]).map((img) => ({
    ...img,
    anomalyAreas: db
      .prepare(`SELECT id, polygon_json, explanation FROM anomaly_areas WHERE image_id = ?`)
      .all(img.id)
      .map((a: any) => ({ id: a.id, polygon: JSON.parse(a.polygon_json), explanation: a.explanation })),
  }));
  res.json(withAreas);
});

// --- GET /api/admin/images/:id – Einzelbild ---
adminCatalogRouter.get("/:id", (req, res) => {
  const image = db.prepare(`SELECT * FROM images WHERE id = ?`).get(req.params.id) as any;
  if (!image) { res.status(404).json({ error: "Bild nicht gefunden" }); return; }
  const areas = db
    .prepare(`SELECT id, polygon_json, explanation FROM anomaly_areas WHERE image_id = ?`)
    .all(req.params.id);
  res.json({
    ...image,
    anomalyAreas: (areas as any[]).map((a) => ({
      id: a.id,
      polygon: JSON.parse(a.polygon_json),
      explanation: a.explanation,
    })),
  });
});

// --- POST /api/admin/images – neues Bild (Upload) ---
adminCatalogRouter.post("/", upload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Kein Bild hochgeladen oder Format nicht erlaubt" });
    return;
  }

  const title = (req.body.title as string) ?? req.file.originalname;
  const filename = await processAndStoreImage(req.file.buffer, req.file.originalname);
  const id = randomUUID();

  db.prepare(
    `INSERT INTO images (id, title, image_path, category, suitability, time_limit_seconds, max_wrong_attempts, status)
     VALUES (?, ?, ?, 'leicht', 'allgemein', 60, 6, 'draft')`
  ).run(id, title, filename);

  res.status(201).json({ id, title, imagePath: filename, status: "draft" });
});

// --- PUT /api/admin/images/:id – Bereiche, Erklärungen, Einstellungen ---
adminCatalogRouter.put("/:id", (req, res) => {
  const parsed = UpdateImageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const image = db.prepare(`SELECT * FROM images WHERE id = ?`).get(req.params.id);
  if (!image) {
    res.status(404).json({ error: "Bild nicht gefunden" });
    return;
  }

  const data = parsed.data;

  if (data.anomalyAreas) {
    const overlapError = findOverlappingAreas(data.anomalyAreas);
    if (overlapError) {
      res.status(400).json({ error: overlapError });
      return;
    }
  }

  db.prepare(
    `UPDATE images SET
       title = COALESCE(?, title),
       category = COALESCE(?, category),
       suitability = COALESCE(?, suitability),
       time_limit_seconds = COALESCE(?, time_limit_seconds),
       max_wrong_attempts = COALESCE(?, max_wrong_attempts),
       updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    data.title ?? null,
    data.category ?? null,
    data.suitability ?? null,
    data.timeLimitSeconds ?? null,
    data.maxWrongAttempts ?? null,
    req.params.id
  );

  if (data.anomalyAreas) {
    db.prepare(`DELETE FROM anomaly_areas WHERE image_id = ?`).run(req.params.id);
    const insert = db.prepare(
      `INSERT INTO anomaly_areas (id, image_id, polygon_json, explanation) VALUES (?, ?, ?, ?)`
    );
    for (const area of data.anomalyAreas) {
      insert.run(area.id ?? randomUUID(), req.params.id, JSON.stringify(area.polygon), area.explanation);
    }
  }

  res.json({ status: "ok" });
});

// --- POST /api/admin/images/:id/publish ---
adminCatalogRouter.post("/:id/publish", (req, res) => {
  const image = db.prepare(`SELECT * FROM images WHERE id = ?`).get(req.params.id) as any;
  if (!image) {
    res.status(404).json({ error: "Bild nicht gefunden" });
    return;
  }

  const areas = db
    .prepare(`SELECT * FROM anomaly_areas WHERE image_id = ?`)
    .all(req.params.id) as any[];

  const missing = validateForPublish(image, areas);
  if (missing.length > 0) {
    res.status(400).json({ error: "Bild ist nicht vollständig", missing });
    return;
  }

  db.prepare(`UPDATE images SET status = 'published', updated_at = datetime('now') WHERE id = ?`).run(
    req.params.id
  );
  res.json({ status: "published" });
});

// --- DELETE /api/admin/images/:id ---
adminCatalogRouter.delete("/:id", (req, res) => {
  const image = db.prepare(`SELECT * FROM images WHERE id = ?`).get(req.params.id) as any;
  if (!image) {
    res.status(404).json({ error: "Bild nicht gefunden" });
    return;
  }

  const activeUse = db
    .prepare(
      `SELECT COUNT(*) as n FROM game_tasks gt
       JOIN games g ON g.id = gt.game_id
       WHERE gt.image_id = ?
         AND g.finished_at IS NULL
         AND g.created_at > datetime('now', '-4 hours')`
    )
    .get(req.params.id) as { n: number };
  if (activeUse.n > 0) {
    res.status(409).json({ error: "Bild wird in einem laufenden Spiel verwendet und kann nicht gelöscht werden" });
    return;
  }

  db.transaction(() => {
    // game_task_hits über area_id bereinigen (kein CASCADE von anomaly_areas)
    db.prepare(
      `DELETE FROM game_task_hits
       WHERE area_id IN (SELECT id FROM anomaly_areas WHERE image_id = ?)`
    ).run(req.params.id);
    // abgeschlossene game_tasks bereinigen (image_id hat kein ON DELETE CASCADE)
    db.prepare(`DELETE FROM game_tasks WHERE image_id = ?`).run(req.params.id);
    db.prepare(`DELETE FROM images WHERE id = ?`).run(req.params.id);
  })();

  try {
    fs.unlinkSync(path.join(IMAGES_DIR, image.image_path));
  } catch {
    // Datei fehlt bereits – kein kritischer Fehler
  }

  res.json({ status: "deleted" });
});

// --- Hilfsfunktionen ---

function validateForPublish(image: any, areas: any[]): string[] {
  const missing: string[] = [];
  if (!image.image_path) missing.push("Bild fehlt");
  if (!image.category) missing.push("Kategorie fehlt");
  if (areas.length < 1) missing.push("Mindestens ein Fehlerbereich erforderlich");
  if (areas.some((a) => !a.explanation || a.explanation.trim() === ""))
    missing.push("Erklärung zu mindestens einem Bereich fehlt");
  if (!image.max_wrong_attempts) missing.push("Maximale Fehlversuche fehlen");
  if (!image.time_limit_seconds) missing.push("Zeitlimit fehlt");

  const polygons = areas.map((a) => JSON.parse(a.polygon_json));
  if (hasPolygonOverlap(polygons)) missing.push("Es gibt überlappende Fehlerbereiche");

  return missing;
}

function findOverlappingAreas(areas: { polygon: { x: number; y: number }[] }[]): string | null {
  const polygons = areas.map((a) => a.polygon);
  return hasPolygonOverlap(polygons) ? "Fehlerbereiche dürfen sich nicht überlappen" : null;
}

function hasPolygonOverlap(polygons: { x: number; y: number }[][]): boolean {
  for (let i = 0; i < polygons.length; i++) {
    for (let j = i + 1; j < polygons.length; j++) {
      if (polygonsIntersect(polygons[i], polygons[j])) return true;
    }
  }
  return false;
}
