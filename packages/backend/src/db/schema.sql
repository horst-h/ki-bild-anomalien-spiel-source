CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  image_path TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('leicht','mittel','schwer')),
  suitability TEXT NOT NULL CHECK (suitability IN ('jungfuchs','waldfuchs','erzfuchs')),
  time_limit_seconds INTEGER NOT NULL,
  max_wrong_attempts INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','published','archived')) DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS anomaly_areas (
  id TEXT PRIMARY KEY,
  image_id TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  polygon_json TEXT NOT NULL,
  explanation TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  player_name TEXT NOT NULL,
  avatar_level TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  total_score INTEGER,
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS game_tasks (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  task_index INTEGER NOT NULL,
  image_id TEXT NOT NULL REFERENCES images(id),
  wrong_attempts INTEGER NOT NULL DEFAULT 0,
  remaining_time_seconds INTEGER,
  skipped INTEGER,
  score INTEGER,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS game_task_hits (
  game_task_id TEXT NOT NULL REFERENCES game_tasks(id) ON DELETE CASCADE,
  area_id TEXT NOT NULL REFERENCES anomaly_areas(id),
  PRIMARY KEY (game_task_id, area_id)
);

CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  player_name TEXT NOT NULL,
  avatar_level TEXT NOT NULL,
  total_score INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
