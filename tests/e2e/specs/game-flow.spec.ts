import { test, expect } from "@playwright/test";

async function startGame(page: any, playerName = "E2E-Fuchs") {
  await page.goto("/");
  await page.getByRole("button", { name: "Spiel starten" }).click();
  await page.fill("#playerName", playerName);
  await page.getByRole("button", { name: "Los geht's!" }).click();
  await page.getByRole("button", { name: "Los geht's →" }).click();
  await expect(page.getByRole("button", { name: "Auswertung →" })).toBeVisible({ timeout: 15_000 });
}

async function skipTaskAndContinue(page: any) {
  await page.getByRole("button", { name: "Auswertung →" }).click();
  const nextBtn = page.getByRole("button", { name: /NÄCHSTES BILD|AUSWERTUNG/ });
  await expect(nextBtn).toBeVisible({ timeout: 8_000 });
  await nextBtn.dispatchEvent("click");
}

test.describe("Vollständiger Spielablauf", () => {
  test("3 Aufgaben überspringen → Zusammenfassung mit Spielername", async ({ page }) => {
    await startGame(page, "SkipFuchs");

    for (let i = 0; i < 3; i++) {
      await skipTaskAndContinue(page);
    }

    await expect(page.getByText("DAS WAR STARK!")).toBeVisible();
    await expect(page.getByRole("heading", { name: "SkipFuchs" })).toBeVisible();
    await expect(page.getByText("GESAMTPUNKTZAHL")).toBeVisible();
  });

  test("Score nach 3 übersprungenen Aufgaben ist 0", async ({ page }) => {
    await startGame(page, "NullPunkter");

    for (let i = 0; i < 3; i++) {
      await skipTaskAndContinue(page);
    }

    await expect(page.getByText("DAS WAR STARK!")).toBeVisible();
    // 0 Treffer → Basis-Score 0 (keine Zeit- oder Trefferbonus)
    await expect(page.getByText("GESAMTPUNKTZAHL").locator("~ p").first()).toContainText("0");
  });

  test("API: Klick bei (0.5, 0.5) trifft E2E-Testpolygon (Ray-Casting)", async ({ request }) => {
    const startResp = await request.post("http://localhost:3099/api/games", {
      data: { playerName: "RayTester", avatarLevel: "waldfuchs" },
    });
    expect(startResp.ok()).toBeTruthy();
    const { gameId } = await startResp.json();

    const attemptResp = await request.post(
      `http://localhost:3099/api/games/${gameId}/tasks/0/attempt`,
      { data: { x: 0.5, y: 0.5 } }
    );
    const body = await attemptResp.json();
    expect(body.result).toBe("hit");
  });

  test("Klick auf Overlay platziert Marker", async ({ page }) => {
    await startGame(page, "MarkerFuchs");

    const overlay = page.locator("[data-testid='game-overlay']");
    await expect(overlay).toBeVisible({ timeout: 10_000 });

    await overlay.click({ position: { x: 320, y: 240 } });

    // Nach Klick: Marker mit Nummer 1 erscheint
    await expect(page.locator("text=1").first()).toBeVisible({ timeout: 3_000 });
  });

  test("Klick außerhalb Polygon platziert Marker (Miss-Pfad)", async ({ page }) => {
    await startGame(page, "MissFuchs");

    const overlay = page.locator("[data-testid='game-overlay']");
    await expect(overlay).toBeVisible({ timeout: 10_000 });

    await overlay.click({ position: { x: 5, y: 5 } });

    // Marker erscheint auch bei Miss
    await expect(page.locator("text=1").first()).toBeVisible({ timeout: 3_000 });
  });

  test("Zusammenfassung schreibt Eintrag: Spielername erscheint im Abschluss-Screen", async ({ page }) => {
    const playerName = `LeaderFuchs-${Date.now()}`;
    await startGame(page, playerName);

    for (let i = 0; i < 3; i++) {
      await skipTaskAndContinue(page);
    }

    await expect(page.getByText("DAS WAR STARK!")).toBeVisible();
    await expect(page.getByRole("heading", { name: playerName })).toBeVisible();
  });
});
