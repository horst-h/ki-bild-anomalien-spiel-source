export interface ScoreInput {
  totalAreas: number;
  hits: number;
  wrongAttempts: number;
  maxWrongAttempts: number;
  remainingTime: number;
  timeLimit: number;
  skipped: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Score-Formel laut Anforderungsdokument, Abschnitt 13.
 * Ergebnis liegt immer im Bereich 0..1000.
 */
export function calculateScore(input: ScoreInput): number {
  const { totalAreas, hits, wrongAttempts, maxWrongAttempts, remainingTime, timeLimit, skipped } =
    input;

  const hitRatio = totalAreas > 0 ? hits / totalAreas : 0;
  const timeRatio = timeLimit > 0 ? remainingTime / timeLimit : 0;
  const wrongRatio = maxWrongAttempts > 0 ? wrongAttempts / maxWrongAttempts : 0;

  const baseScore = 1000 * hitRatio;
  const timeBonus = 250 * hitRatio * timeRatio;
  const wrongPenalty = 300 * wrongRatio;
  const skipPenalty = skipped ? 200 * (1 - hitRatio) : 0;

  const rawScore = baseScore + timeBonus - wrongPenalty - skipPenalty;
  return clamp(Math.round(rawScore), 0, 1000);
}
