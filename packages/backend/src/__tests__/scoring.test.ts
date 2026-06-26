import { describe, test, expect } from "vitest";
import { calculateScore } from "../services/scoring.js";

// Alle erwarteten Werte manuell verifiziert anhand der Formel aus Abschnitt 13:
//   baseScore  = 1000 * hitRatio
//   timeBonus  = 250  * hitRatio * timeRatio
//   wrongPenalty = 300 * wrongRatio
//   skipPenalty  = skipped ? 200 * (1 – hitRatio) : 0
//   score = clamp(round(rawScore), 0, 1000)

describe("calculateScore", () => {
  test("perfekter Lauf → 1250 intern, Deckel bei 1000", () => {
    expect(
      calculateScore({
        totalAreas: 3, hits: 3,
        wrongAttempts: 0, maxWrongAttempts: 6,
        remainingTime: 60, timeLimit: 60,
        skipped: false,
      })
    ).toBe(1000);
  });

  test("kein Treffer, volle Fehlversuche → –300 intern, Boden bei 0", () => {
    expect(
      calculateScore({
        totalAreas: 3, hits: 0,
        wrongAttempts: 6, maxWrongAttempts: 6,
        remainingTime: 0, timeLimit: 60,
        skipped: false,
      })
    ).toBe(0);
  });

  test("Zeitbonus gilt nicht ohne Treffer (hitRatio = 0 → timeBonus = 0)", () => {
    expect(
      calculateScore({
        totalAreas: 3, hits: 0,
        wrongAttempts: 0, maxWrongAttempts: 6,
        remainingTime: 60, timeLimit: 60,
        skipped: false,
      })
    ).toBe(0);
  });

  test("Anforderungsdokument §13 Beispiel, kein Skip → 672", () => {
    // 2/3 gefunden, 1/6 Fehlversuche, 20/60 Zeit übrig, kein Skip
    // raw = 666.6̄ + 55.5̄ – 50 = 672.2̄  → round → 672
    // (Dokument nennt 674 – Rundungsdifferenz im Rechenbeispiel des Dokuments)
    expect(
      calculateScore({
        totalAreas: 3, hits: 2,
        wrongAttempts: 1, maxWrongAttempts: 6,
        remainingTime: 20, timeLimit: 60,
        skipped: false,
      })
    ).toBe(672);
  });

  test("Anforderungsdokument §13 Beispiel, mit Skip → 606", () => {
    // Same + skipPenalty = 200*(1–2/3) = 66.6̄  → 672.2̄ – 66.6̄ = 605.5̄ → 606
    // (Dokument nennt 608 – gleiche Rundungsdifferenz)
    expect(
      calculateScore({
        totalAreas: 3, hits: 2,
        wrongAttempts: 1, maxWrongAttempts: 6,
        remainingTime: 20, timeLimit: 60,
        skipped: true,
      })
    ).toBe(606);
  });

  test("Zeit abgelaufen, alles gefunden → kein Zeitbonus, Score genau 1000", () => {
    expect(
      calculateScore({
        totalAreas: 3, hits: 3,
        wrongAttempts: 0, maxWrongAttempts: 6,
        remainingTime: 0, timeLimit: 60,
        skipped: false,
      })
    ).toBe(1000);
  });

  test("Skip ohne Treffer → –200 intern, Boden bei 0", () => {
    expect(
      calculateScore({
        totalAreas: 3, hits: 0,
        wrongAttempts: 0, maxWrongAttempts: 6,
        remainingTime: 30, timeLimit: 60,
        skipped: true,
      })
    ).toBe(0);
  });

  test("Skip wenn alle Bereiche bereits gefunden → skipPenalty = 0, Deckel bei 1000", () => {
    // hitRatio=1 → skipPenalty=200*(1–1)=0; raw=1000+125=1125 → 1000
    expect(
      calculateScore({
        totalAreas: 2, hits: 2,
        wrongAttempts: 0, maxWrongAttempts: 6,
        remainingTime: 30, timeLimit: 60,
        skipped: true,
      })
    ).toBe(1000);
  });

  test("volle Fehlversuche reduzieren Score proportional um 300", () => {
    // hitRatio=1, timeRatio=1, wrongRatio=1, no skip → 1000+250–300=950
    expect(
      calculateScore({
        totalAreas: 3, hits: 3,
        wrongAttempts: 6, maxWrongAttempts: 6,
        remainingTime: 60, timeLimit: 60,
        skipped: false,
      })
    ).toBe(950);
  });

  test("gemischter Fall: ½ Treffer, ½ Zeit, ½ Fehlversuche → 413", () => {
    // hitRatio=0.5, timeRatio=0.5, wrongRatio=0.5
    // raw = 500 + 62.5 – 150 = 412.5 → round → 413
    expect(
      calculateScore({
        totalAreas: 2, hits: 1,
        wrongAttempts: 3, maxWrongAttempts: 6,
        remainingTime: 30, timeLimit: 60,
        skipped: false,
      })
    ).toBe(413);
  });

  test("totalAreas = 0 (kein Bild mit Bereichen) → 0", () => {
    expect(
      calculateScore({
        totalAreas: 0, hits: 0,
        wrongAttempts: 0, maxWrongAttempts: 6,
        remainingTime: 30, timeLimit: 60,
        skipped: false,
      })
    ).toBe(0);
  });

  test("timeLimit = 0 → kein Zeitbonus (Division durch 0 wird sicher behandelt)", () => {
    expect(
      calculateScore({
        totalAreas: 3, hits: 3,
        wrongAttempts: 0, maxWrongAttempts: 6,
        remainingTime: 0, timeLimit: 0,
        skipped: false,
      })
    ).toBe(1000);
  });
});
