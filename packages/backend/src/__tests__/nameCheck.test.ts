import { describe, test, expect, vi, afterEach } from "vitest";
import {
  normalize,
  checkBlocklist,
  checkImpersonation,
  checkPerspective,
  checkPlayerName,
} from "../services/nameCheck.js";

// ── normalize() ───────────────────────────────────────────────────────────────

describe("normalize", () => {
  // Basistransformationen
  test("Kleinschreibung", () => expect(normalize("ADMIN")).toBe("admin"));
  test("ß → ss", () => expect(normalize("Scheiß")).toBe("scheiss"));
  test("ä → a", () => expect(normalize("Ärger")).toBe("arger"));
  test("ö → o", () => expect(normalize("Östlich")).toBe("ostlich"));
  test("ü → u", () => expect(normalize("Über")).toBe("uber"));
  test("é → e (Akzent)", () => expect(normalize("cliché")).toBe("cliche"));
  test("à → a (Akzent)", () => expect(normalize("Àpropos")).toBe("apropos"));
  test("Leerzeichen entfernen", () => expect(normalize("user name")).toBe("username"));
  test("Sonderzeichen entfernen", () => expect(normalize("a.b-c_d")).toBe("abcd"));

  // Leet-Ersetzungen (einzeln)
  test("Leet 0 → o", () => expect(normalize("0racle")).toBe("oracle"));
  test("Leet @ → o", () => expect(normalize("@range")).toBe("orange"));
  test("Leet 1 → i", () => expect(normalize("1diot")).toBe("idiot"));
  test("Leet ! → i", () => expect(normalize("!nfo")).toBe("info"));
  test("Leet | → i", () => expect(normalize("|nfo")).toBe("info"));
  test("Leet 3 → e", () => expect(normalize("3xpert")).toBe("expert"));
  test("Leet 4 → a", () => expect(normalize("4dmin")).toBe("admin"));
  test("Leet 5 → s", () => expect(normalize("5ystem")).toBe("system"));
  test("Leet $ → s", () => expect(normalize("$ystem")).toBe("system"));

  // Ziffern ohne Leet-Zuordnung werden entfernt (nach Leet-Pass)
  test("Ziffern ohne Leet-Mapping entfernen (2,6,7,8,9)", () =>
    expect(normalize("user26")).toBe("user"));

  // Ziffern MIT Leet-Zuordnung werden umgewandelt, nicht entfernt
  test("Leet-Ziffer 1 bleibt als 'i' erhalten", () =>
    expect(normalize("w1ld")).toBe("wild"));
  test("Leet-Ziffer 3 bleibt als 'e' erhalten", () =>
    expect(normalize("wichs3r")).toBe("wichser"));

  // Kombinierte Angriffe (Leet + Umlaut + Sonderzeichen)
  test("kombiniert: 4r5ch → arsch", () =>
    expect(normalize("4r5ch")).toBe("arsch"));
  test("kombiniert: H1tl3r → hitler", () =>
    expect(normalize("H1tl3r")).toBe("hitler"));
  test("kombiniert: F!ck → fick", () =>
    expect(normalize("F!ck")).toBe("fick"));
  test("kombiniert: $ch3i$$ → scheiss", () =>
    expect(normalize("$ch3i$$")).toBe("scheiss"));
  test("kombiniert: w1ch5er → wichser", () =>
    expect(normalize("w1ch5er")).toBe("wichser"));
  test("kombiniert: m0d3r4t0r → moderator", () =>
    expect(normalize("m0d3r4t0r")).toBe("moderator"));
  test("kombiniert: 4dm1n → admin", () =>
    expect(normalize("4dm1n")).toBe("admin"));
  test("kombiniert: 5upp0rt → support", () =>
    expect(normalize("5upp0rt")).toBe("support"));

  // @ ist per Spec → o, nicht → a; ein Bypass via "@" statt "a" schlägt durch
  test("@ → o (Spec: 0/@→o), nicht → a", () =>
    expect(normalize("@rsch")).toBe("orsch"));  // "arsch" wird hier NICHT erkannt
  // Das ist gewollt: "4rsch" (4→a) wäre der korrekte Leet-Bypass für arsch
  test("4rsch → arsch (korrekter Leet-Bypass)", () =>
    expect(normalize("4rsch")).toBe("arsch"));
});

// ── checkBlocklist() ──────────────────────────────────────────────────────────

describe("checkBlocklist", () => {
  test("leerer String → false", () =>
    expect(checkBlocklist("")).toBe(false));

  test("normaler Name → false", () =>
    expect(checkBlocklist("spieler")).toBe(false));

  test("exakter Treffer 'arsch' → true", () =>
    expect(checkBlocklist("arsch")).toBe(true));

  test("Substring-Treffer (Begriff innen) → true", () =>
    expect(checkBlocklist("xarschx")).toBe(true));

  test("Leet-Bypass abgefangen: normalize('4r5ch') = 'arsch' → true", () =>
    expect(checkBlocklist(normalize("4r5ch"))).toBe(true));

  test("Leet-Bypass: normalize('H1tl3r') = 'hitler' → true", () =>
    expect(checkBlocklist(normalize("H1tl3r"))).toBe(true));

  test("Leet-Bypass: normalize('$ch3i$$') = 'scheiss' → true", () =>
    expect(checkBlocklist(normalize("$ch3i$$"))).toBe(true));

  test("Umlaut-Bypass: normalize('Scheiß') = 'scheiss' → true", () =>
    expect(checkBlocklist(normalize("Scheiß"))).toBe(true));
});

// ── checkImpersonation() ──────────────────────────────────────────────────────

describe("checkImpersonation", () => {
  test("normaler Name → false", () =>
    expect(checkImpersonation("felix")).toBe(false));

  test("'admin' → true", () =>
    expect(checkImpersonation("admin")).toBe(true));

  test("Prefix 'xadmin' → true (Substring)", () =>
    expect(checkImpersonation("xadmin")).toBe(true));

  test("Suffix 'adminx' → true (Substring)", () =>
    expect(checkImpersonation("adminx")).toBe(true));

  test("'mod' → true", () =>
    expect(checkImpersonation("mod")).toBe(true));

  test("'support' → true", () =>
    expect(checkImpersonation("support")).toBe(true));

  test("'system' → true", () =>
    expect(checkImpersonation("system")).toBe(true));

  test("Leet-Bypass 4dm1n → normalize → admin → true", () =>
    expect(checkImpersonation(normalize("4dm1n"))).toBe(true));

  test("Leet-Bypass m0d3r4t0r → normalize → moderator → true", () =>
    expect(checkImpersonation(normalize("m0d3r4t0r"))).toBe(true));
});

// ── checkPerspective() ────────────────────────────────────────────────────────

describe("checkPerspective", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PERSPECTIVE_API_KEY;
  });

  test("kein API-Key → error/no_api_key (niemals automatisch blocken)", async () => {
    delete process.env.PERSPECTIVE_API_KEY;
    const result = await checkPerspective("hallo");
    expect(result.status).toBe("error");
    expect((result as any).reason).toBe("no_api_key");
  });

  test("erfolgreiche API-Antwort, Score unter Schwellenwert → allowed", async () => {
    process.env.PERSPECTIVE_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        attributeScores: {
          TOXICITY: { summaryScore: { value: 0.1 } },
          PROFANITY: { summaryScore: { value: 0.05 } },
        },
      }),
    }));

    const result = await checkPerspective("hallo");
    expect(result.status).toBe("ok");
    expect((result as any).allowed).toBe(true);
    expect((result as any).scores).toEqual({ toxicity: 0.1, profanity: 0.05 });
  });

  test("erfolgreiche API-Antwort, TOXICITY über Schwellenwert → !allowed", async () => {
    process.env.PERSPECTIVE_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        attributeScores: {
          TOXICITY: { summaryScore: { value: 0.95 } },
          PROFANITY: { summaryScore: { value: 0.2 } },
        },
      }),
    }));

    const result = await checkPerspective("badname", { perspectiveThreshold: 0.7 });
    expect(result.status).toBe("ok");
    expect((result as any).allowed).toBe(false);
  });

  test("HTTP 429 Rate-Limit → error/rate_limit (nicht blocken)", async () => {
    process.env.PERSPECTIVE_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
    }));

    const result = await checkPerspective("hallo");
    expect(result.status).toBe("error");
    expect((result as any).reason).toBe("rate_limit");
  });

  test("HTTP 500 → error/http_500 (nicht blocken)", async () => {
    process.env.PERSPECTIVE_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
    }));

    const result = await checkPerspective("hallo");
    expect(result.status).toBe("error");
    expect((result as any).reason).toBe("http_500");
  });

  test("Netzwerkfehler (fetch wirft) → error/network_error (nicht blocken)", async () => {
    process.env.PERSPECTIVE_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("ECONNREFUSED")));

    const result = await checkPerspective("hallo");
    expect(result.status).toBe("error");
    expect((result as any).reason).toBe("network_error");
  });

  test("Timeout (AbortError) → error/timeout (nicht blocken)", async () => {
    process.env.PERSPECTIVE_API_KEY = "test-key";
    const abortErr = new Error("The operation was aborted");
    abortErr.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(abortErr));

    const result = await checkPerspective("hallo", { perspectiveTimeoutMs: 1 });
    expect(result.status).toBe("error");
    expect((result as any).reason).toBe("timeout");
  });
});

// ── checkPlayerName() ─────────────────────────────────────────────────────────

describe("checkPlayerName", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PERSPECTIVE_API_KEY;
  });

  test("normaler Name → allowed", async () => {
    const r = await checkPlayerName("Felix");
    expect(r.verdict).toBe("allowed");
  });

  test("Leet-Bypass von Blocklisten-Begriff → blocked/blocklist", async () => {
    const r = await checkPlayerName("4r5ch");
    expect(r.verdict).toBe("blocked");
    expect((r as any).stage).toBe("blocklist");
  });

  test("Umlaut-Bypass → blocked/blocklist", async () => {
    const r = await checkPlayerName("Scheiß");
    expect(r.verdict).toBe("blocked");
    expect((r as any).stage).toBe("blocklist");
  });

  test("Impersonation 'Admin' → blocked/impersonation", async () => {
    const r = await checkPlayerName("Admin");
    expect(r.verdict).toBe("blocked");
    expect((r as any).stage).toBe("impersonation");
  });

  test("Leet-Impersonation '4dm1n' → blocked/impersonation", async () => {
    const r = await checkPlayerName("4dm1n");
    expect(r.verdict).toBe("blocked");
    expect((r as any).stage).toBe("impersonation");
  });

  test("usePerspective:false → Perspective-API wird nicht aufgerufen", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await checkPlayerName("Felix", { usePerspective: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("usePerspective:true, API nicht erreichbar → review (niemals auto-blocken)", async () => {
    process.env.PERSPECTIVE_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("ECONNREFUSED")));

    const r = await checkPlayerName("TestSpieler", { usePerspective: true });
    expect(r.verdict).toBe("review");
  });

  test("usePerspective:true, API liefert hohen Score → blocked/perspective", async () => {
    process.env.PERSPECTIVE_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        attributeScores: {
          TOXICITY: { summaryScore: { value: 0.9 } },
          PROFANITY: { summaryScore: { value: 0.85 } },
        },
      }),
    }));

    const r = await checkPlayerName("SuspiciousName", {
      usePerspective: true,
      perspectiveThreshold: 0.7,
    });
    expect(r.verdict).toBe("blocked");
    expect((r as any).stage).toBe("perspective");
  });
});
