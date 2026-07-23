import { describe, test, expect } from "vitest";
import { calculateScore } from "../services/scoring.js";

// Alle erwarteten Werte manuell verifiziert anhand der Formel aus Abschnitt 13:
//   baseScore  = 750 * hitRatio
//   timeBonus  = 250 * hitRatio * timeRatio
//   wrongPenalty = 300 * wrongRatio
//   skipPenalty  = skipped ? 200 * (1 – hitRatio) : 0
//   score = clamp(round(rawScore), 0, 1000)
//
// baseScore + timeBonus erreichen bei hitRatio = 1 zusammen maximal 1000
// (750 + 250) — die Basis allein sättigt den Deckel nicht mehr, damit die
// Restzeit auch bei perfekter Trefferquote noch score-relevant bleibt.

describe("calculateScore", () => {
  test("perfekter Lauf mit voller Restzeit → exakt 1000", () => {
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

  test("Anforderungsdokument §13 Beispiel, kein Skip → 506", () => {
    // 2/3 gefunden, 1/6 Fehlversuche, 20/60 Zeit übrig, kein Skip
    // raw = 500 + 55.5̄ – 50 = 505.5̄ → round → 506
    expect(
      calculateScore({
        totalAreas: 3, hits: 2,
        wrongAttempts: 1, maxWrongAttempts: 6,
        remainingTime: 20, timeLimit: 60,
        skipped: false,
      })
    ).toBe(506);
  });

  test("Anforderungsdokument §13 Beispiel, mit Skip → 439", () => {
    // Same + skipPenalty = 200*(1–2/3) = 66.6̄  → 505.5̄ – 66.6̄ = 438.8̄ → 439
    expect(
      calculateScore({
        totalAreas: 3, hits: 2,
        wrongAttempts: 1, maxWrongAttempts: 6,
        remainingTime: 20, timeLimit: 60,
        skipped: true,
      })
    ).toBe(439);
  });

  test("Zeit abgelaufen, alles gefunden → kein Zeitbonus, nur Basis-Score (750)", () => {
    expect(
      calculateScore({
        totalAreas: 3, hits: 3,
        wrongAttempts: 0, maxWrongAttempts: 6,
        remainingTime: 0, timeLimit: 60,
        skipped: false,
      })
    ).toBe(750);
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

  test("Skip wenn alle Bereiche bereits gefunden → skipPenalty = 0, kein Deckel nötig", () => {
    // hitRatio=1 → skipPenalty=200*(1–1)=0; raw=750+125=875
    expect(
      calculateScore({
        totalAreas: 2, hits: 2,
        wrongAttempts: 0, maxWrongAttempts: 6,
        remainingTime: 30, timeLimit: 60,
        skipped: true,
      })
    ).toBe(875);
  });

  test("volle Fehlversuche reduzieren Score proportional um 300", () => {
    // hitRatio=1, timeRatio=1, wrongRatio=1, no skip → 750+250–300=700
    expect(
      calculateScore({
        totalAreas: 3, hits: 3,
        wrongAttempts: 6, maxWrongAttempts: 6,
        remainingTime: 60, timeLimit: 60,
        skipped: false,
      })
    ).toBe(700);
  });

  test("gemischter Fall: ½ Treffer, ½ Zeit, ½ Fehlversuche → 288", () => {
    // hitRatio=0.5, timeRatio=0.5, wrongRatio=0.5
    // raw = 375 + 62.5 – 150 = 287.5 → round → 288
    expect(
      calculateScore({
        totalAreas: 2, hits: 1,
        wrongAttempts: 3, maxWrongAttempts: 6,
        remainingTime: 30, timeLimit: 60,
        skipped: false,
      })
    ).toBe(288);
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
    ).toBe(750);
  });
});
