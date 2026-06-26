/**
 * Blockliste für die lokale Namensfilterung.
 *
 * Einträge sind in normalisierter Form (Kleinbuchstaben, keine Umlaute,
 * kein Leet, kein ß). Vergleich findet gegen den ebenfalls normalisierten
 * Spielernamen statt → Leet-Umgehungen wie "4r5ch" werden dadurch sicher
 * erkannt.
 *
 * Erweiterung: Neue Begriffe einfach anhängen. Nach einem Neustart des
 * Backends werden sie automatisch berücksichtigt.
 */

// Anstößige Begriffe (Deutsch + Englisch) – Substring-Check
export const BLOCKED_TERMS: readonly string[] = [
  // Deutsch
  "arsch",
  "scheiss", // ß → ss via Normalisierung
  "fick",
  "wichser",
  "wichs",
  "hurensohn",
  "nutte",
  "hure",
  "votze",
  "kacke",
  "pisser",
  // Politisch / diskriminierend
  "nazi",
  "hitler",
  "neger",
  // Englisch
  "fuck",
  "shit",
  "cunt",
  "nigger",
  "bitch",
  "asshole",
  "motherfuck",
  "faggot",
  "whore",
  "bastard",
];

// Impersonation: Begriffe, die eine System-/Staff-Rolle vortäuschen.
// Substring-Check: "xadminx" und "adminmax" werden beide geblockt.
export const IMPERSONATION_TERMS: readonly string[] = [
  "admin",
  "administrator",
  "moderator",
  "mod",
  "support",
  "system",
  "operator",
  "staff",
  "gamemaster",
  "sysop",
  "root",
];
