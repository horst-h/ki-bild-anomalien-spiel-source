import { Router } from "express";
import path from "node:path";
import { db, IMAGES_DIR } from "../db/client.js";

export const imagesRouter = Router();

// GET /images/:id – liefert die Bilddatei zum jeweiligen Katalog-Eintrag aus.
// Bewusst ohne Zusatzdaten (keine Anomalie-Infos), siehe Anforderungsdokument 17a.
imagesRouter.get("/:id", (req, res) => {
  const image = db.prepare(`SELECT image_path FROM images WHERE id = ?`).get(req.params.id) as
    | { image_path: string }
    | undefined;

  if (!image) {
    res.status(404).end();
    return;
  }

  res.sendFile(path.join(IMAGES_DIR, image.image_path));
});
