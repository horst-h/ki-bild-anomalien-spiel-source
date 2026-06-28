const BASE_URL = "http://localhost:3001/api";

export interface GameStartResponse {
  gameId: string;
  taskCount: number;
}

export interface TaskResponse {
  taskIndex: number;
  category: string;
  imageUrl: string;
  timeLimitSeconds: number;
  maxWrongAttempts: number;
  totalAreas: number;
  hitsSoFar: number;
  wrongAttemptsSoFar: number;
}

export interface AttemptResponse {
  result: "hit" | "miss" | "duplicate";
  areaId?: string;
  explanation?: string;
  polygon?: Array<[number, number]>;
  hitsSoFar: number;
  wrongAttemptsSoFar: number;
  totalAreas: number;
  taskComplete: boolean;
}

export interface FinishResponse {
  score: number;
  resolution: {
    areas: Array<{
      id: string;
      polygon: Array<[number, number]>;
      explanation: string;
      found: boolean;
    }>;
  };
}

export interface SummaryResponse {
  playerName: string;
  avatarLevel: string;
  scorePerTask: Array<{ taskIndex: number; score: number }>;
  totalScore: number;
  totalHits: number;
  totalWrongAttempts: number;
  rank: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  avatarLevel: string;
  totalScore: number;
  createdAt: string;
}

export const api = {
  // Start a new game
  async startGame(playerName: string, avatarLevel: string): Promise<GameStartResponse> {
    const res = await fetch(`${BASE_URL}/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName, avatarLevel }),
    });
    if (!res.ok) throw new Error(`Game start failed: ${res.statusText}`);
    return res.json();
  },

  // Get task details
  async getTask(gameId: string, taskIndex: number): Promise<TaskResponse> {
    const res = await fetch(`${BASE_URL}/games/${gameId}/tasks/${taskIndex}`);
    if (!res.ok) throw new Error(`Get task failed: ${res.statusText}`);
    return res.json();
  },

  // Register a click attempt
  async attempt(gameId: string, taskIndex: number, x: number, y: number): Promise<AttemptResponse> {
    const res = await fetch(`${BASE_URL}/games/${gameId}/tasks/${taskIndex}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x, y }),
    });
    if (!res.ok) throw new Error(`Attempt failed: ${res.statusText}`);
    return res.json();
  },

  // Finish a task/round
  async finishTask(
    gameId: string,
    taskIndex: number,
    remainingTimeSeconds: number,
    skipped: boolean
  ): Promise<FinishResponse> {
    const res = await fetch(`${BASE_URL}/games/${gameId}/tasks/${taskIndex}/finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remainingTimeSeconds, skipped }),
    });
    if (!res.ok) throw new Error(`Finish task failed: ${res.statusText}`);
    return res.json();
  },

  // Get game summary & ranking
  async getSummary(gameId: string): Promise<SummaryResponse> {
    const res = await fetch(`${BASE_URL}/games/${gameId}/summary`);
    if (!res.ok) throw new Error(`Get summary failed: ${res.statusText}`);
    return res.json();
  },

  // Get leaderboard
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const res = await fetch(`${BASE_URL}/leaderboard`);
    if (!res.ok) throw new Error(`Get leaderboard failed: ${res.statusText}`);
    return res.json();
  },
};
