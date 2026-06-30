import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "../db/client.js";
import { selectTasksForGame } from "../services/gameSelection.js";
import { calculateScore } from "../services/scoring.js";
import { isPointInPolygon } from "../services/geometry.js";
import { checkPlayerName } from "../services/nameCheck.js";

export const gameRouter = Router();

const StartGameSchema = z.object({
  playerName: z
    .string()
    .min(2, "Name muss mindestens 2 Zeichen lang sein")
    .max(30, "Name darf höchstens 30 Zeichen lang sein"),
  avatarLevel: z.string().min(1),
});

const AttemptSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const FinishSchema = z.object({
  remainingTimeSeconds: z.number().int().min(0),
  skipped: z.boolean(),
  markers: z
    .array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }))
    .optional(),
});

// --- POST /api/games – Spiel starten ---
gameRouter.post("/", async (req, res) => {
  const parsed = StartGameSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const nameCheck = await checkPlayerName(parsed.data.playerName, {
    usePerspective: Boolean(process.env.PERSPECTIVE_API_KEY),
  });
  if (nameCheck.verdict === "blocked") {
    const message =
      nameCheck.stage === "impersonation"
        ? "Dieser Name ist für Systembegriffe reserviert"
        : "Dieser Name ist leider nicht erlaubt";
    res.status(400).json({ error: message });
    return;
  }
  // verdict === "review": Perspective-API nicht erreichbar → Name durchlassen,
  // Spielstart nicht blockieren (kein Fail-Closed für Infrastrukturprobleme).

  let tasks;
  try {
    tasks = selectTasksForGame(parsed.data.avatarLevel);
  } catch (err) {
    res.status(503).json({ error: (err as Error).message });
    return;
  }

  const gameId = randomUUID();
  db.prepare(`INSERT INTO games (id, player_name, avatar_level) VALUES (?, ?, ?)`).run(
    gameId,
    parsed.data.playerName,
    parsed.data.avatarLevel
  );

  const insertTask = db.prepare(
    `INSERT INTO game_tasks (id, game_id, task_index, image_id) VALUES (?, ?, ?, ?)`
  );
  tasks.forEach((image, index) => {
    insertTask.run(randomUUID(), gameId, index, image.id);
  });

  res.status(201).json({ gameId, taskCount: tasks.length });
});

function getTaskRow(gameId: string, taskIndex: number) {
  return db
    .prepare(
      `SELECT gt.*, i.category, i.time_limit_seconds, i.max_wrong_attempts
       FROM game_tasks gt
       JOIN images i ON i.id = gt.image_id
       WHERE gt.game_id = ? AND gt.task_index = ?`
    )
    .get(gameId, taskIndex) as any;
}

function countHits(gameTaskId: string): number {
  const row = db
    .prepare(`SELECT COUNT(*) as n FROM game_task_hits WHERE game_task_id = ?`)
    .get(gameTaskId) as { n: number };
  return row.n;
}

// --- GET /api/games/:gameId/tasks/:taskIndex – Aufgaben-Details (ohne Lösung!) ---
gameRouter.get("/:gameId/tasks/:taskIndex", (req, res) => {
  const taskIndex = Number(req.params.taskIndex);
  const row = getTaskRow(req.params.gameId, taskIndex);

  if (!row) {
    res.status(404).json({ error: "Aufgabe nicht gefunden" });
    return;
  }

  const totalAreas = db
    .prepare(`SELECT COUNT(*) as n FROM anomaly_areas WHERE image_id = ?`)
    .get(row.image_id) as { n: number };

  // Bewusst KEINE anomalyAreas/Erklärungen ausliefern.
  res.json({
    taskIndex,
    category: row.category,
    imageUrl: `/images/${row.image_id}`,
    timeLimitSeconds: row.time_limit_seconds,
    maxWrongAttempts: row.max_wrong_attempts,
    totalAreas: totalAreas.n,
    hitsSoFar: countHits(row.id),
    wrongAttemptsSoFar: row.wrong_attempts,
  });
});

// --- POST /api/games/:gameId/tasks/:taskIndex/attempt – ein Klick wird geprüft ---
gameRouter.post("/:gameId/tasks/:taskIndex/attempt", (req, res) => {
  const taskIndex = Number(req.params.taskIndex);
  const parsed = AttemptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const task = getTaskRow(req.params.gameId, taskIndex);
  if (!task) {
    res.status(404).json({ error: "Aufgabe nicht gefunden" });
    return;
  }
  if (task.completed_at) {
    res.status(409).json({ error: "Aufgabe ist bereits beendet" });
    return;
  }

  const areas = db
    .prepare(`SELECT id, polygon_json, explanation FROM anomaly_areas WHERE image_id = ?`)
    .all(task.image_id) as any[];

  const alreadyFound = new Set(
    (
      db
        .prepare(`SELECT area_id FROM game_task_hits WHERE game_task_id = ?`)
        .all(task.id) as { area_id: string }[]
    ).map((r) => r.area_id)
  );

  const point = { x: parsed.data.x, y: parsed.data.y };

  for (const area of areas) {
    const polygon = JSON.parse(area.polygon_json);
    if (isPointInPolygon(point, polygon)) {
      if (alreadyFound.has(area.id)) {
        // Wiederholter Klick auf bereits gefundenen Bereich: ignorieren (siehe 18.3)
        res.json({
          result: "duplicate",
          hitsSoFar: alreadyFound.size,
          wrongAttemptsSoFar: task.wrong_attempts,
          totalAreas: areas.length,
        });
        return;
      }

      db.prepare(`INSERT INTO game_task_hits (game_task_id, area_id) VALUES (?, ?)`).run(
        task.id,
        area.id
      );

      const hitsSoFar = countHits(task.id);
      res.json({
        result: "hit",
        areaId: area.id,
        explanation: area.explanation,
        polygon,
        hitsSoFar,
        wrongAttemptsSoFar: task.wrong_attempts,
        totalAreas: areas.length,
        taskComplete: hitsSoFar >= areas.length,
      });
      return;
    }
  }

  // Kein Treffer -> Fehlversuch
  const newWrongAttempts = task.wrong_attempts + 1;
  db.prepare(`UPDATE game_tasks SET wrong_attempts = ? WHERE id = ?`).run(
    newWrongAttempts,
    task.id
  );

  res.json({
    result: "miss",
    hitsSoFar: countHits(task.id),
    wrongAttemptsSoFar: newWrongAttempts,
    totalAreas: areas.length,
    taskComplete: newWrongAttempts >= task.max_wrong_attempts,
  });
});

// --- POST /api/games/:gameId/tasks/:taskIndex/finish – Runde beenden ---
gameRouter.post("/:gameId/tasks/:taskIndex/finish", (req, res) => {
  const taskIndex = Number(req.params.taskIndex);
  const parsed = FinishSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const task = getTaskRow(req.params.gameId, taskIndex);
  if (!task) {
    res.status(404).json({ error: "Aufgabe nicht gefunden" });
    return;
  }
  if (task.completed_at) {
    res.status(409).json({ error: "Aufgabe ist bereits beendet" });
    return;
  }

  const areas = db
    .prepare(`SELECT id, polygon_json, explanation FROM anomaly_areas WHERE image_id = ?`)
    .all(task.image_id) as any[];

  const { remainingTimeSeconds, skipped, markers } = parsed.data;

  let foundIds: Set<string>;
  let wrongAttempts: number;

  if (markers !== undefined) {
    // Re-evaluate from final marker positions — clears any intermediate attempt hits
    db.prepare(`DELETE FROM game_task_hits WHERE game_task_id = ?`).run(task.id);
    foundIds = new Set<string>();
    wrongAttempts = 0;

    for (const marker of markers) {
      let hit = false;
      for (const area of areas) {
        const polygon = JSON.parse(area.polygon_json);
        if (!foundIds.has(area.id) && isPointInPolygon(marker, polygon)) {
          foundIds.add(area.id);
          db.prepare(`INSERT INTO game_task_hits (game_task_id, area_id) VALUES (?, ?)`).run(
            task.id,
            area.id
          );
          hit = true;
          break;
        }
      }
      if (!hit) wrongAttempts++;
    }

    db.prepare(`UPDATE game_tasks SET wrong_attempts = ? WHERE id = ?`).run(wrongAttempts, task.id);
  } else {
    foundIds = new Set(
      (
        db
          .prepare(`SELECT area_id FROM game_task_hits WHERE game_task_id = ?`)
          .all(task.id) as { area_id: string }[]
      ).map((r) => r.area_id)
    );
    wrongAttempts = task.wrong_attempts;
  }

  const score = calculateScore({
    totalAreas: areas.length,
    hits: foundIds.size,
    wrongAttempts,
    maxWrongAttempts: task.max_wrong_attempts,
    remainingTime: remainingTimeSeconds,
    timeLimit: task.time_limit_seconds,
    skipped,
  });

  db.prepare(
    `UPDATE game_tasks SET remaining_time_seconds = ?, skipped = ?, score = ?, completed_at = datetime('now')
     WHERE id = ?`
  ).run(remainingTimeSeconds, skipped ? 1 : 0, score, task.id);

  res.json({
    score,
    resolution: {
      areas: areas.map((a) => ({
        id: a.id,
        polygon: JSON.parse(a.polygon_json),
        explanation: a.explanation,
        found: foundIds.has(a.id),
      })),
    },
  });
});

// --- GET /api/games/:gameId/summary ---
gameRouter.get("/:gameId/summary", (req, res) => {
  const game = db.prepare(`SELECT * FROM games WHERE id = ?`).get(req.params.gameId) as any;
  if (!game) {
    res.status(404).json({ error: "Spiel nicht gefunden" });
    return;
  }

  const tasks = db
    .prepare(`SELECT * FROM game_tasks WHERE game_id = ? ORDER BY task_index`)
    .all(req.params.gameId) as any[];

  if (tasks.some((t) => t.score === null)) {
    res.status(400).json({ error: "Noch nicht alle Aufgaben abgeschlossen" });
    return;
  }

  const totalHits = tasks.reduce((sum, t) => sum + countHits(t.id), 0);
  const totalWrongAttempts = tasks.reduce((sum, t) => sum + t.wrong_attempts, 0);

  // Beim ersten Aufruf: Score berechnen, Spiel abschließen, ins Leaderboard schreiben.
  // Bei weiteren Aufrufen (z. B. Seiten-Reload): gespeicherte Werte zurückgeben,
  // kein erneuter Leaderboard-Eintrag.
  if (!game.finished_at) {
    const totalScore = tasks.reduce((sum, t) => sum + t.score, 0);

    db.prepare(`UPDATE games SET total_score = ?, finished_at = datetime('now') WHERE id = ?`).run(
      totalScore,
      req.params.gameId
    );

    db.prepare(
      `INSERT INTO leaderboard_entries (id, game_id, player_name, avatar_level, total_score)
       VALUES (?, ?, ?, ?, ?)`
    ).run(randomUUID(), req.params.gameId, game.player_name, game.avatar_level, totalScore);
  }

  const totalScore = game.total_score ?? tasks.reduce((sum: number, t: any) => sum + t.score, 0);

  const rank = db
    .prepare(`SELECT COUNT(*) as higher FROM leaderboard_entries WHERE total_score > ?`)
    .get(totalScore) as { higher: number };

  res.json({
    playerName: game.player_name,
    avatarLevel: game.avatar_level,
    scorePerTask: tasks.map((t) => ({ taskIndex: t.task_index, score: t.score })),
    totalScore,
    totalHits,
    totalWrongAttempts,
    rank: rank.higher + 1,
  });
});
