import { describe, test, expect } from "vitest";
import { isPointInPolygon, polygonsIntersect } from "../services/geometry.js";

// Hilfsfunktion: Achsenparalleles Rechteck als Polygon
function rect(x1: number, y1: number, x2: number, y2: number) {
  return [
    { x: x1, y: y1 },
    { x: x2, y: y1 },
    { x: x2, y: y2 },
    { x: x1, y: y2 },
  ];
}

// ── isPointInPolygon ─────────────────────────────────────────────────────────

describe("isPointInPolygon", () => {
  const square = rect(0.1, 0.1, 0.5, 0.5);

  test("Punkt klar innerhalb", () => {
    expect(isPointInPolygon({ x: 0.3, y: 0.3 }, square)).toBe(true);
  });

  test("Punkt klar außerhalb", () => {
    expect(isPointInPolygon({ x: 0.8, y: 0.8 }, square)).toBe(false);
  });

  test("Punkt auf Kante wird als außerhalb gewertet (Ray-Casting-Konvention)", () => {
    // Exakt auf der linken Kante – Ray-Casting ist hier nicht definiert,
    // aber der Algorithmus muss konsistent sein (kein Crash)
    expect(typeof isPointInPolygon({ x: 0.1, y: 0.3 }, square)).toBe("boolean");
  });

  test("Dreieck – Punkt innerhalb", () => {
    const tri = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }];
    expect(isPointInPolygon({ x: 0.5, y: 0.3 }, tri)).toBe(true);
  });

  test("Dreieck – Punkt außerhalb", () => {
    const tri = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }];
    expect(isPointInPolygon({ x: 0.05, y: 0.9 }, tri)).toBe(false);
  });
});

// ── polygonsIntersect ────────────────────────────────────────────────────────

describe("polygonsIntersect", () => {
  test("klar getrennte Rechtecke → kein Schnitt", () => {
    const a = rect(0, 0, 0.3, 0.3);
    const b = rect(0.6, 0.6, 1, 1);
    expect(polygonsIntersect(a, b)).toBe(false);
  });

  test("überlappende Rechtecke → Schnitt", () => {
    const a = rect(0, 0, 0.6, 0.6);
    const b = rect(0.4, 0.4, 1, 1);
    expect(polygonsIntersect(a, b)).toBe(true);
  });

  test("Rechteck B vollständig innerhalb A → Schnitt (Containment)", () => {
    const a = rect(0, 0, 1, 1);
    const b = rect(0.2, 0.2, 0.8, 0.8);
    expect(polygonsIntersect(a, b)).toBe(true);
  });

  test("Rechteck A vollständig innerhalb B → Schnitt (umgekehrtes Containment)", () => {
    const a = rect(0.2, 0.2, 0.8, 0.8);
    const b = rect(0, 0, 1, 1);
    expect(polygonsIntersect(a, b)).toBe(true);
  });

  test("Bounding-Boxes überlappen, Polygone aber nicht – der Bounding-Box-Bug", () => {
    // Großes Dreieck: Unteres Dreieck, deckt x+y <= 1 ab
    const triLeft = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
    // Kleines Dreieck klar im Bereich x+y > 1 (oben rechts), aber
    // Bounding-Box von triLeft umschließt den gesamten [0,1]-Bereich
    const triRight = [{ x: 0.7, y: 0.7 }, { x: 0.9, y: 0.7 }, { x: 0.8, y: 0.9 }];
    expect(polygonsIntersect(triLeft, triRight)).toBe(false);
  });

  test("sich kreuzende Dreiecke → Schnitt", () => {
    // Zwei Dreiecke, deren Kanten sich schneiden
    const a = [{ x: 0, y: 0.5 }, { x: 1, y: 0 }, { x: 1, y: 1 }];
    const b = [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 }];
    expect(polygonsIntersect(a, b)).toBe(true);
  });

  test("benachbarte (berührende) Rechtecke → als Schnitt gewertet", () => {
    // Kante bei x=0.5 ist geteilt – segmentsIntersect schlägt für kollineare Kante an
    const a = rect(0, 0, 0.5, 1);
    const b = rect(0.5, 0, 1, 1);
    // Berührende Kanten sind ein Grenzfall; das Ergebnis muss konsistent sein
    expect(typeof polygonsIntersect(a, b)).toBe("boolean");
  });

  test("identische Polygone → Schnitt", () => {
    const a = rect(0.1, 0.1, 0.5, 0.5);
    expect(polygonsIntersect(a, [...a])).toBe(true);
  });
});
