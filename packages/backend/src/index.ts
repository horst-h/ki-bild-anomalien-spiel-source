import express from "express";
import cookieSession from "cookie-session";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { gameRouter } from "./routes/game.js";
import { leaderboardRouter } from "./routes/leaderboard.js";
import { imagesRouter } from "./routes/images.js";
import { adminAuthRouter } from "./routes/admin/auth.js";
import { adminCatalogRouter } from "./routes/admin/catalog.js";
import { checkPlayerName } from "./services/nameCheck.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET ?? "dev-secret-change-me"],
    maxAge: 4 * 60 * 60 * 1000, // 4 Stunden, reicht für einen Admin-Pflegedurchgang
  })
);

// --- Health-Check ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// --- Namens-Vorprüfung (öffentlich, vor Spielstart) ---
app.post("/api/validate-name", async (req, res) => {
  const { name } = req.body;
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Name fehlt" });
    return;
  }
  const result = await checkPlayerName(name.trim());
  res.json(result);
});

// --- Spieler-Bereich (öffentlich) ---
app.use("/api/games", gameRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/images", imagesRouter);

// --- Admin-Bereich ---
app.use("/api/admin", adminAuthRouter); // /login, /logout (kein Auth-Schutz nötig)
app.use("/api/admin/images", adminCatalogRouter); // ab hier durch requireAdmin geschützt

// --- Statische Auslieferung des Frontend-Builds (Produktion) ---
const frontendDist = path.resolve(__dirname, "../../frontend/dist");
app.use(express.static(frontendDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Backend läuft auf Port ${PORT}`);
});
