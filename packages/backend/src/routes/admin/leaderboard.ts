import { Router } from "express";
import { db } from "../../db/client.js";
import { requireAdmin } from "../../middleware/adminAuth.js";

export const adminLeaderboardRouter = Router();
adminLeaderboardRouter.use(requireAdmin);

adminLeaderboardRouter.get("/", (_req, res) => {
  const entries = db
    .prepare(
      `SELECT id, player_name, avatar_level, total_score, created_at
       FROM leaderboard_entries ORDER BY total_score DESC, created_at ASC`
    )
    .all();
  res.json(entries);
});

adminLeaderboardRouter.delete("/reset", (_req, res) => {
  db.prepare(`DELETE FROM leaderboard_entries`).run();
  res.json({ status: "reset" });
});

adminLeaderboardRouter.delete("/:id", (req, res) => {
  const entry = db.prepare(`SELECT id FROM leaderboard_entries WHERE id = ?`).get(req.params.id);
  if (!entry) {
    res.status(404).json({ error: "Eintrag nicht gefunden" });
    return;
  }
  db.prepare(`DELETE FROM leaderboard_entries WHERE id = ?`).run(req.params.id);
  res.json({ status: "deleted" });
});
