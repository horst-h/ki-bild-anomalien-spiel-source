import type { LeaderboardEntry } from "../../../api";

export const TOP_N = 5;

export type DisplayRow =
  | { type: "entry"; entry: LeaderboardEntry; isCurrentPlayer: boolean }
  | { type: "placeholder" };

/**
 * Builds the display list for a truncated leaderboard.
 *
 * Rules:
 * - If the current player is within the top N, the top N rows are returned
 *   with the current player's row marked (no truncation needed).
 * - If the current player is at rank topN+1, the top N rows are returned
 *   plus the player's row appended directly — no placeholder (gap of 0).
 * - If the current player is at rank > topN+1, the top N rows are returned,
 *   followed by a placeholder row, then a context window of [rank-1, rank, rank+1]
 *   (neighbors omitted if they don't exist or if rank-1 falls inside the top N block).
 */
export function buildDisplayList(
  allScores: LeaderboardEntry[],
  currentPlayerRank: number,
  topN: number = TOP_N
): DisplayRow[] {
  if (allScores.length === 0) return [];

  const topEntries = allScores.slice(0, topN);

  if (currentPlayerRank <= topN) {
    return topEntries.map((entry) => ({
      type: "entry" as const,
      entry,
      isCurrentPlayer: entry.rank === currentPlayerRank,
    }));
  }

  const topRows: DisplayRow[] = topEntries.map((entry) => ({
    type: "entry" as const,
    entry,
    isCurrentPlayer: false,
  }));

  const currentIdx = allScores.findIndex((e) => e.rank === currentPlayerRank);
  if (currentIdx === -1) return topRows;

  // Only insert placeholder when the gap between the top-N block and
  // the context window is at least 1 entry (i.e. rank > topN + 1).
  const needsPlaceholder = currentPlayerRank > topN + 1;

  const contextEntries: LeaderboardEntry[] = [];

  // rank - 1: only include if it is outside the top-N block
  if (currentIdx > 0) {
    const prev = allScores[currentIdx - 1];
    if (prev.rank > topN) contextEntries.push(prev);
  }

  contextEntries.push(allScores[currentIdx]);

  // rank + 1: include if it exists
  if (currentIdx < allScores.length - 1) {
    contextEntries.push(allScores[currentIdx + 1]);
  }

  const contextRows: DisplayRow[] = contextEntries.map((entry) => ({
    type: "entry" as const,
    entry,
    isCurrentPlayer: entry.rank === currentPlayerRank,
  }));

  return [
    ...topRows,
    ...(needsPlaceholder ? [{ type: "placeholder" as const }] : []),
    ...contextRows,
  ];
}
