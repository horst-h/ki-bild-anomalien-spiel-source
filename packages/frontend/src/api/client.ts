export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  avatarLevel: string;
  totalScore: number;
  createdAt: string;
}

export interface AdminImage {
  id: string;
  title: string;
  image_path: string;
  category: "leicht" | "mittel" | "schwer";
  suitability: "kinderfreundlich" | "allgemein";
  time_limit_seconds: number;
  max_wrong_attempts: number;
  status: "draft" | "published" | "archived";
  anomalyAreas: { id: string; polygon: { x: number; y: number }[]; explanation: string }[];
}

export interface TaskDetails {
  taskIndex: number;
  category: "leicht" | "mittel" | "schwer";
  imageUrl: string;
  timeLimitSeconds: number;
  maxWrongAttempts: number;
  totalAreas: number;
  hitsSoFar: number;
  wrongAttemptsSoFar: number;
}

export interface AttemptResponse {
  result: "hit" | "duplicate" | "miss";
  areaId?: string;
  explanation?: string;
  polygon?: { x: number; y: number }[];
  hitsSoFar: number;
  wrongAttemptsSoFar: number;
  totalAreas: number;
  taskComplete?: boolean;
}

export interface FinishResponse {
  score: number;
  resolution: {
    areas: {
      id: string;
      polygon: { x: number; y: number }[];
      explanation: string;
      found: boolean;
    }[];
  };
}

export interface SummaryResponse {
  playerName: string;
  avatarLevel: string;
  scorePerTask: { taskIndex: number; score: number }[];
  totalScore: number;
  totalHits: number;
  totalWrongAttempts: number;
  rank: number;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = typeof body.error === "string" ? body.error : JSON.stringify(body.error);
    throw new Error(msg || `Anfrage fehlgeschlagen (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  validateName(name: string) {
    return request<{ verdict: "allowed" | "blocked" | "review"; stage?: "blocklist" | "impersonation" | "perspective" }>(
      "/api/validate-name",
      { method: "POST", body: JSON.stringify({ name }) }
    );
  },

  startGame(playerName: string, avatarLevel: string) {
    return request<{ gameId: string; taskCount: number }>("/api/games", {
      method: "POST",
      body: JSON.stringify({ playerName, avatarLevel }),
    });
  },

  getTask(gameId: string, taskIndex: number) {
    return request<TaskDetails>(`/api/games/${gameId}/tasks/${taskIndex}`);
  },

  attempt(gameId: string, taskIndex: number, x: number, y: number) {
    return request<AttemptResponse>(`/api/games/${gameId}/tasks/${taskIndex}/attempt`, {
      method: "POST",
      body: JSON.stringify({ x, y }),
    });
  },

  finishTask(gameId: string, taskIndex: number, remainingTimeSeconds: number, skipped: boolean) {
    return request<FinishResponse>(`/api/games/${gameId}/tasks/${taskIndex}/finish`, {
      method: "POST",
      body: JSON.stringify({ remainingTimeSeconds, skipped }),
    });
  },

  getSummary(gameId: string) {
    return request<SummaryResponse>(`/api/games/${gameId}/summary`);
  },

  getLeaderboard() {
    return request<LeaderboardEntry[]>("/api/leaderboard");
  },

  adminLogin(password: string) {
    return request<{ status: string }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },

  adminLogout() {
    return request<{ status: string }>("/api/admin/logout", { method: "POST" });
  },

  adminGetImages() {
    return request<AdminImage[]>("/api/admin/images");
  },

  adminPublishImage(id: string) {
    return request<{ status: string }>(`/api/admin/images/${id}/publish`, { method: "POST" });
  },

  adminArchiveImage(id: string) {
    return request<{ status: string }>(`/api/admin/images/${id}`, { method: "DELETE" });
  },

  adminGetImage(id: string) {
    return request<AdminImage>(`/api/admin/images/${id}`);
  },

  adminUpdateImage(
    id: string,
    data: {
      title?: string;
      category?: "leicht" | "mittel" | "schwer";
      suitability?: "kinderfreundlich" | "allgemein";
      timeLimitSeconds?: number;
      maxWrongAttempts?: number;
      anomalyAreas?: { id?: string; polygon: { x: number; y: number }[]; explanation: string }[];
    }
  ) {
    return request<{ status: string }>(`/api/admin/images/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Multipart-Upload – kein JSON, daher eigener fetch ohne Content-Type-Header
  async adminUploadImage(file: File, title?: string): Promise<{ id: string; title: string; imagePath: string; status: string }> {
    const formData = new FormData();
    formData.append("image", file);
    if (title) formData.append("title", title);
    const res = await fetch("/api/admin/images", { method: "POST", body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ? JSON.stringify(body.error) : `Upload fehlgeschlagen (${res.status})`);
    }
    return res.json();
  },
};
