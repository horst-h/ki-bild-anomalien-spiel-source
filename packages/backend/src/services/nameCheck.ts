import { BLOCKED_TERMS, IMPERSONATION_TERMS } from "../config/blocklist.js";

// ── Typen ─────────────────────────────────────────────────────────────────────

export type NameCheckVerdict =
  | { verdict: "allowed" }
  | { verdict: "blocked"; stage: "blocklist" | "impersonation" | "perspective" }
  | { verdict: "review"; reason: PerspectiveErrorReason };

type PerspectiveErrorReason =
  | "no_api_key"
  | "timeout"
  | "rate_limit"
  | "network_error"
  | `http_${number}`;

export interface PerspectiveResult {
  status: "ok";
  allowed: boolean;
  scores: { toxicity: number; profanity: number };
}

export interface PerspectiveError {
  status: "error";
  reason: PerspectiveErrorReason;
}

export interface CheckOptions {
  usePerspective?: boolean;
  /** Schwellenwert 0..1; Scores ≥ threshold gelten als unzulässig. Default: 0.7 */
  perspectiveThreshold?: number;
  /** Sprachen für die Perspective-Analyse. Default: ["de", "en"] */
  perspectiveLanguages?: string[];
  /** Timeout in ms für den Perspective-API-Aufruf. Default: 5000 */
  perspectiveTimeoutMs?: number;
}

// ── Normalisierung ────────────────────────────────────────────────────────────

/**
 * Normalisiert einen Namen so, dass gängige Umgehungsversuche erkannt werden:
 * – Kleinschreibung
 * – ß → ss (vor NFD, weil ß kein zusammengesetztes Zeichen ist)
 * – NFD-Dekomposition + Entfernung kombinierender Diakritika (ä→a, é→e, …)
 * – Leet-Ersetzungen: 0/@→o, 1/!/|→i, 3→e, 4→a, 5/$→s
 * – Alle verbleibenden Nicht-Buchstaben entfernen
 */
export function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")       // kombinierte Diakritika (Akzente etc.)
    .replace(/[0@]/g, "o")             // Leet: 0, @ → o
    .replace(/[1!|]/g, "i")            // Leet: 1, !, | → i
    .replace(/3/g, "e")                // Leet: 3 → e
    .replace(/4/g, "a")                // Leet: 4 → a
    .replace(/[5$]/g, "s")             // Leet: 5, $ → s
    .replace(/[^a-z]/g, "");           // Sonderzeichen + verbleibende Ziffern
}

// Blocklist-Terme einmalig beim Modulstart normalisieren
const BLOCKED_NORMALIZED = BLOCKED_TERMS.map(normalize);
const IMPERSONATION_NORMALIZED = IMPERSONATION_TERMS.map(normalize);

// ── Lokale Prüfungen ──────────────────────────────────────────────────────────

/**
 * Prüft, ob der normalisierte Name einen gesperrten Begriff als Substring enthält.
 * Erwartet einen bereits normalisierten Namen (Ausgabe von `normalize()`).
 */
export function checkBlocklist(normalizedName: string): boolean {
  return BLOCKED_NORMALIZED.some((term) => normalizedName.includes(term));
}

/**
 * Prüft, ob der normalisierte Name einen Impersonation-Begriff enthält.
 * Erwartet einen bereits normalisierten Namen.
 */
export function checkImpersonation(normalizedName: string): boolean {
  return IMPERSONATION_NORMALIZED.some((term) => normalizedName.includes(term));
}

// ── Perspective API ───────────────────────────────────────────────────────────

const PERSPECTIVE_ENDPOINT =
  "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze";

/**
 * Sendet den Namen an die Google Perspective API und gibt das Ergebnis zurück.
 *
 * Im Fehlerfall (fehlender Key, Timeout, Rate-Limit, Netzwerkfehler) wird
 * NIEMALS automatisch geblockt; stattdessen kommt `{ status: "error" }` zurück.
 * Die Entscheidung über das weitere Vorgehen liegt beim Aufrufer.
 */
export async function checkPerspective(
  name: string,
  options: Pick<CheckOptions, "perspectiveThreshold" | "perspectiveLanguages" | "perspectiveTimeoutMs"> = {}
): Promise<PerspectiveResult | PerspectiveError> {
  const apiKey = process.env.PERSPECTIVE_API_KEY;
  if (!apiKey) {
    return { status: "error", reason: "no_api_key" };
  }

  const threshold = options.perspectiveThreshold ?? (Number(process.env.PERSPECTIVE_THRESHOLD) || 0.7);
  const languages = options.perspectiveLanguages ?? (process.env.PERSPECTIVE_LANGUAGES?.split(",") ?? ["de", "en"]);
  const timeoutMs = options.perspectiveTimeoutMs ?? 5000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${PERSPECTIVE_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comment: { text: name },
        languages,
        requestedAttributes: { TOXICITY: {}, PROFANITY: {} },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) return { status: "error", reason: "rate_limit" };
      return { status: "error", reason: `http_${response.status}` as `http_${number}` };
    }

    const data = (await response.json()) as {
      attributeScores: {
        TOXICITY?: { summaryScore: { value: number } };
        PROFANITY?: { summaryScore: { value: number } };
      };
    };

    const toxicity = data.attributeScores.TOXICITY?.summaryScore.value ?? 0;
    const profanity = data.attributeScores.PROFANITY?.summaryScore.value ?? 0;

    return {
      status: "ok",
      allowed: toxicity < threshold && profanity < threshold,
      scores: { toxicity, profanity },
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return { status: "error", reason: "timeout" };
    }
    return { status: "error", reason: "network_error" };
  }
}

// ── Hauptfunktion ─────────────────────────────────────────────────────────────

/**
 * Zweistufige Namensvalidierung:
 *
 * 1. Lokale Prüfung (immer): Normalisierung → Blocklist → Impersonation
 * 2. Perspective API (nur bei `usePerspective: true`):
 *    – Bei API-Fehler wird der Name NICHT geblockt, sondern als „review" markiert
 *
 * @returns
 *   `{ verdict: "allowed" }`             – Name ist in Ordnung
 *   `{ verdict: "blocked", stage }`      – lokal oder per API gesperrt
 *   `{ verdict: "review", reason }`      – Perspective-API nicht erreichbar;
 *                                          Name muss manuell geprüft werden
 */
export async function checkPlayerName(
  name: string,
  options: CheckOptions = {}
): Promise<NameCheckVerdict> {
  const normalized = normalize(name);

  if (checkBlocklist(normalized)) {
    return { verdict: "blocked", stage: "blocklist" };
  }

  if (checkImpersonation(normalized)) {
    return { verdict: "blocked", stage: "impersonation" };
  }

  if (options.usePerspective) {
    const result = await checkPerspective(name, options);
    if (result.status === "error") {
      return { verdict: "review", reason: result.reason };
    }
    if (!result.allowed) {
      return { verdict: "blocked", stage: "perspective" };
    }
  }

  return { verdict: "allowed" };
}
