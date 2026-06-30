import { describe, test, expect } from "vitest";
import { buildDisplayList, TOP_N } from "./buildDisplayList";
import type { LeaderboardEntry } from "../../../api";

function makeEntry(rank: number): LeaderboardEntry {
  return {
    rank,
    playerName: `Spieler${rank}`,
    avatarLevel: "jungfuchs",
    totalScore: 1000 - rank * 50,
    createdAt: "2024-01-01T00:00:00.000Z",
  };
}

function makeList(count: number): LeaderboardEntry[] {
  return Array.from({ length: count }, (_, i) => makeEntry(i + 1));
}

function entryRanks(rows: ReturnType<typeof buildDisplayList>) {
  return rows.map((r) => (r.type === "entry" ? r.entry.rank : "…"));
}

describe("buildDisplayList", () => {
  test("leere Liste → leeres Array", () => {
    expect(buildDisplayList([], 1)).toEqual([]);
  });

  test("alleiniger Eintrag (Rang 1) → wird als aktueller Spieler markiert", () => {
    const result = buildDisplayList([makeEntry(1)], 1);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: "entry", isCurrentPlayer: true });
  });

  test("Spieler in Top N → Top N anzeigen, aktueller Spieler hervorgehoben, kein Platzhalter", () => {
    const result = buildDisplayList(makeList(20), 3);
    expect(result).toHaveLength(TOP_N);
    expect(result.some((r) => r.type === "placeholder")).toBe(false);
    const current = result.find((r) => r.type === "entry" && r.isCurrentPlayer);
    expect(current).toBeDefined();
    expect(current?.type === "entry" && current.entry.rank).toBe(3);
  });

  test("Spieler auf Rang 1 → in Top N, als aktueller Spieler markiert", () => {
    const result = buildDisplayList(makeList(10), 1);
    expect(result[0]).toMatchObject({ type: "entry", isCurrentPlayer: true });
    if (result[0].type === "entry") expect(result[0].entry.rank).toBe(1);
  });

  test("Spieler knapp außerhalb (Rang = TOP_N + 1) → kein Platzhalter, direkt angehängt", () => {
    const playerRank = TOP_N + 1;
    const result = buildDisplayList(makeList(20), playerRank);

    expect(result.some((r) => r.type === "placeholder")).toBe(false);
    // rank (TOP_N) is NOT added as context (it's inside the top-N block)
    // context: [current=TOP_N+1, next=TOP_N+2]
    expect(entryRanks(result)).toEqual([1, 2, 3, 4, 5, playerRank, playerRank + 1]);

    const current = result.find((r) => r.type === "entry" && r.isCurrentPlayer);
    expect(current?.type === "entry" && current.entry.rank).toBe(playerRank);
  });

  test("Spieler weit außerhalb → Platzhalter nach Top N, Kontext-Fenster rank-1/rank/rank+1", () => {
    const result = buildDisplayList(makeList(20), 10);

    const placeholderIdx = result.findIndex((r) => r.type === "placeholder");
    expect(placeholderIdx).toBe(TOP_N); // immediately after top-N block

    expect(entryRanks(result)).toEqual([1, 2, 3, 4, 5, "…", 9, 10, 11]);

    const current = result.find((r) => r.type === "entry" && r.isCurrentPlayer);
    expect(current?.type === "entry" && current.entry.rank).toBe(10);
  });

  test("Spieler am letzten Platz → kein rank+1 Eintrag im Kontext-Fenster", () => {
    const result = buildDisplayList(makeList(8), 8);
    expect(entryRanks(result)).toEqual([1, 2, 3, 4, 5, "…", 7, 8]);
  });

  test("Spieler auf Rang TOP_N + 2 → Platzhalter, Kontext beginnt bei TOP_N + 1", () => {
    const playerRank = TOP_N + 2;
    const result = buildDisplayList(makeList(20), playerRank);

    expect(result.some((r) => r.type === "placeholder")).toBe(true);
    // rank-1 = TOP_N+1 which is > TOP_N → included as context
    expect(entryRanks(result)).toEqual([1, 2, 3, 4, 5, "…", TOP_N + 1, TOP_N + 2, TOP_N + 3]);
  });

  test("allScores kürzer als topN → zeigt alle vorhandenen Einträge", () => {
    const result = buildDisplayList(makeList(3), 2);
    expect(result).toHaveLength(3);
    expect(result.some((r) => r.type === "placeholder")).toBe(false);
  });
});
