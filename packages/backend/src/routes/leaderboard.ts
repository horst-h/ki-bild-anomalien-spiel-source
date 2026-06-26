import { Router } from "express";
import { db } from "../db/client.js";

export const leaderboardRouter = Router();

// GET /api/leaderboard – jeder Versuch wird angezeigt (siehe Anforderungsdokument 16)
leaderboardRouter.get("/", (_req, res) => {
  const entries = db
    .prepare(
      `SELECT player_name, avatar_level, total_score, created_at
       FROM leaderboard_entries
       ORDER BY total_score DESC, created_at ASC
       LIMIT 100`
    )
    .all();

  res.json(
    (entries as any[]).map((e, index) => ({
      rank: index + 1,
      playerName: e.player_name,
      avatarLevel: e.avatar_level,
      totalScore: e.total_score,
      createdAt: e.created_at,
    }))
  );
});
