import { test, expect } from "@playwright/test";

// Hilfsfunktion: Spiel starten und zum Canvas navigieren
async function startGame(page: any, playerName = "E2E-Fuchs") {
  await page.goto("/");
  await page.getByRole("button", { name: "Spiel starten" }).click();
  await page.fill("#playerName", playerName);
  // waldfuchs ist Standard (allgemein-Suitability → passt zu den E2E-Testbildern)
  await page.getByRole("button", { name: "Los geht's!" }).click();
  await expect(page.locator("canvas")).toBeVisible({ timeout: 15_000 });
}

// Hilfsfunktion: eine Aufgabe überspringen und Ergebnis bestätigen
async function skipTaskAndContinue(page: any) {
  await page.getByRole("button", { name: "Weiter (überspringen)" }).click();
  // Ergebnis-Screen
  await expect(page.getByRole("button", { name: "Weiter" })).toBeVisible({ timeout: 8_000 });
  await page.getByRole("button", { name: "Weiter" }).click();
}

test.describe("Vollständiger Spielablauf", () => {
  test("3 Aufgaben überspringen → Zusammenfassung mit Spielername", async ({ page }) => {
    await startGame(page, "SkipFuchs");

    for (let i = 0; i < 3; i++) {
      await skipTaskAndContinue(page);
    }

    await expect(page.getByRole("heading", { name: "Gesamtauswertung" })).toBeVisible();
    await expect(page.getByText("SkipFuchs")).toBeVisible();
    await expect(page.getByText("Gesamtscore")).toBeVisible();
  });

  test("Score nach 3 übersprungenen Aufgaben ist 0", async ({ page }) => {
    await startGame(page, "NullPunkter");

    for (let i = 0; i < 3; i++) {
      await skipTaskAndContinue(page);
    }

    // Beim Überspringen ohne Treffer ist der Score 0
    await expect(page.getByText(/Gesamtscore:\s*0/)).toBeVisible();
  });

  test("API: Klick bei (0.5, 0.5) trifft E2E-Testpolygon (Ray-Casting)", async ({ request }) => {
    // Spiel direkt über die API starten – kein Browser nötig für reine Logik-Tests
    const startResp = await request.post("http://localhost:3099/api/games", {
      data: { playerName: "RayTester", avatarLevel: "waldfuchs" },
    });
    expect(startResp.ok()).toBeTruthy();
    const { gameId } = await startResp.json();

    // Klick in Polygon-Mitte: normalisiert (0.5, 0.5) liegt in (0.2,0.2)-(0.8,0.8)
    const attemptResp = await request.post(
      `http://localhost:3099/api/games/${gameId}/tasks/0/attempt`,
      { data: { x: 0.5, y: 0.5 } }
    );
    const body = await attemptResp.json();
    expect(body.result).toBe("hit");
  });

  test("Treffer erhöht Hit-Zähler in der TopBar", async ({ page }) => {
    await startGame(page, "ZählerFuchs");

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });

    // TopBar zeigt vor dem Klick 0 Treffer
    const topBar = page.locator("body");
    await expect(topBar.getByText(/0\s*\/\s*1/)).toBeVisible();

    await canvas.click({ position: { x: 320, y: 240 } });

    // Nach Treffer: 1/1 → Aufgabe automatisch beendet
    await expect(page.getByRole("button", { name: "Weiter" })).toBeVisible({ timeout: 5_000 });
  });

  test("Fehlklick erhöht Fehlversuch-Zähler", async ({ page }) => {
    await startGame(page, "MissFuchs");

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });

    // Klick in die Ecke (0, 0) px – außerhalb des Polygons (0.2,0.2)-(0.8,0.8)
    await canvas.click({ position: { x: 5, y: 5 } });

    // ✕-Symbol erscheint
    await expect(page.locator("text=✕")).toBeVisible({ timeout: 3_000 });
  });

  test("Zusammenfassung schreibt Eintrag ins Leaderboard", async ({ page }) => {
    const playerName = `LeaderFuchs-${Date.now()}`;
    await startGame(page, playerName);

    for (let i = 0; i < 3; i++) {
      await skipTaskAndContinue(page);
    }

    await expect(page.getByRole("heading", { name: "Gesamtauswertung" })).toBeVisible();

    // Leaderboard aufrufen
    await page.goto("/");
    await page.getByRole("button", { name: "Leaderboard" }).click();
    await expect(page.getByText(playerName)).toBeVisible({ timeout: 5_000 });
  });
});
