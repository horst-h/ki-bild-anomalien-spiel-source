import { test, expect } from "@playwright/test";

test.describe("Namens-Validierung", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Spiel starten" }).click();
  });

  test("Blocklist-Name zeigt Inline-Fehler ohne Navigation", async ({ page }) => {
    await page.fill("#playerName", "4rsch");
    await page.getByRole("button", { name: "Los geht's!" }).click();
    await expect(page.getByText("Dieser Name ist leider nicht erlaubt")).toBeVisible();
    // Sicherstellen: wir sind noch auf dem Name/Avatar-Screen
    await expect(page.getByRole("button", { name: "Los geht's!" })).toBeVisible();
  });

  test("Impersonation-Name zeigt Inline-Fehler", async ({ page }) => {
    await page.fill("#playerName", "4dm1n");
    await page.getByRole("button", { name: "Los geht's!" }).click();
    await expect(page.getByText("Dieser Name ist für Systembegriffe reserviert")).toBeVisible();
  });

  test("zu kurzer Name (1 Zeichen) zeigt Validierungsfehler", async ({ page }) => {
    await page.fill("#playerName", "X");
    await page.getByRole("button", { name: "Los geht's!" }).click();
    await expect(page.getByText("mindestens 2 Zeichen")).toBeVisible();
  });

  test("gültiger Name navigiert zum Spielstart", async ({ page }) => {
    await page.fill("#playerName", "TestFuchs");
    await page.getByRole("button", { name: "Los geht's!" }).click();
    // Regelscreen erscheint zwischen Avatar- und Spielscreen
    await page.getByRole("button", { name: "Los geht's →" }).click();
    // GameScreen lädt (kurz "Lädt …" oder Canvas erscheint)
    await expect(page.getByRole("button", { name: "Auswertung →" })).toBeVisible({ timeout: 10_000 });
    // Kein Fehler auf dem Name-Screen mehr
    await expect(page.getByRole("button", { name: "Los geht's!" })).not.toBeVisible();
  });

  test("Fehlertext verschwindet wenn Name geändert wird", async ({ page }) => {
    await page.fill("#playerName", "4dm1n");
    await page.getByRole("button", { name: "Los geht's!" }).click();
    await expect(page.getByText("Dieser Name ist für Systembegriffe reserviert")).toBeVisible();

    await page.fill("#playerName", "MaxMuster");
    await expect(page.getByText("Dieser Name ist für Systembegriffe reserviert")).not.toBeVisible();
  });
});
