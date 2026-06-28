import { useState, useEffect, useCallback } from "react";
import { Trash2, RotateCcw, Trophy } from "lucide-react";

interface ScoreEntry {
  id: string;
  player_name: string;
  avatar_level: string;
  total_score: number;
  created_at: string;
}

const AVATAR_COLORS: Record<string, string> = {
  jungfuchs: "#00FF41",
  waldfuchs: "#FEE600",
  erzfuchs: "#8A2BE2",
};

export function ScoreScreen() {
  const [entries, setEntries] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/leaderboard", { credentials: "include" });
      if (!res.ok) throw new Error("Laden fehlgeschlagen");
      setEntries(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function deleteEntry(id: string) {
    setBusy(true);
    const res = await fetch(`/api/admin/leaderboard/${id}`, { method: "DELETE", credentials: "include" });
    setBusy(false);
    if (!res.ok) { setError("Löschen fehlgeschlagen"); return; }
    setConfirmDeleteId(null);
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  async function resetAll() {
    setBusy(true);
    const res = await fetch("/api/admin/leaderboard/reset", { method: "DELETE", credentials: "include" });
    setBusy(false);
    if (!res.ok) { setError("Reset fehlgeschlagen"); return; }
    setConfirmReset(false);
    setEntries([]);
  }

  const rankColors = ["#FEE600", "#C0C0C0", "#CD7F32"];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={14} style={{ color: "#FEE600" }} />
          <span className="font-code text-xs tracking-widest" style={{ color: "#FEE600" }}>
            BESTENLISTE — {entries.length} EINTRÄGE
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="font-code text-xs tracking-widest text-muted-foreground px-3 py-1.5"
            style={{ border: "1px solid rgba(254,230,0,0.25)" }}
          >
            AKTUALISIEREN
          </button>
          {!confirmReset ? (
            <button
              onClick={() => { setConfirmReset(true); setError(null); }}
              className="font-code text-xs tracking-widest px-3 py-1.5 flex items-center gap-1.5"
              style={{ border: "1px solid rgba(255,80,80,0.3)", color: "#A8ABA7" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#FF5050"; (e.currentTarget as HTMLButtonElement).style.color = "#FF5050"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,80,80,0.3)"; (e.currentTarget as HTMLButtonElement).style.color = "#A8ABA7"; }}
            >
              <RotateCcw size={11} /> ALLE LÖSCHEN
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={resetAll}
                disabled={busy}
                className="font-code text-xs px-3 py-1.5 disabled:opacity-50"
                style={{ background: "rgba(255,80,80,0.15)", border: "1px solid #FF5050", color: "#FF5050" }}
              >
                {busy ? "…" : "SICHER LÖSCHEN?"}
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="font-code text-xs px-3 py-1.5"
                style={{ border: "1px solid rgba(254,230,0,0.25)", color: "#A8ABA7" }}
              >
                ABBRECHEN
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 font-code text-xs" style={{ color: "#FF5050", border: "1px solid rgba(255,80,80,0.4)", background: "rgba(255,80,80,0.06)" }}>
          {error}
        </div>
      )}

      <div style={{ border: "1px solid rgba(254,230,0,0.15)" }}>
        {loading ? (
          <div className="p-8 text-center font-code text-xs text-muted-foreground">LADE …</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center font-code text-xs text-muted-foreground">KEINE EINTRÄGE VORHANDEN</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(254,230,0,0.1)" }}>
                {["RANG", "OPERATOR", "KLASSE", "PUNKTE", "DATUM", ""].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-code text-xs text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const isConfirming = confirmDeleteId === e.id;
                const col = AVATAR_COLORS[e.avatar_level] ?? "#A8ABA7";
                return (
                  <tr key={e.id} style={{ borderBottom: i < entries.length - 1 ? "1px solid rgba(254,230,0,0.06)" : undefined }}>
                    <td className="px-4 py-3">
                      <span className="font-display font-black text-xl" style={{ color: rankColors[i] ?? "#A8ABA7" }}>#{i + 1}</span>
                    </td>
                    <td className="px-4 py-3 font-code text-sm text-foreground">{e.player_name}</td>
                    <td className="px-4 py-3">
                      <span className="font-code text-xs px-2 py-0.5 uppercase tracking-widest" style={{ color: col, border: `1px solid ${col}50` }}>
                        {e.avatar_level}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-display font-bold text-xl text-foreground">{e.total_score}</td>
                    <td className="px-4 py-3 font-code text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      {!isConfirming ? (
                        <button
                          onClick={() => { setConfirmDeleteId(e.id); setError(null); }}
                          className="flex items-center gap-1 font-code text-xs px-2 py-1 transition-all"
                          style={{ border: "1px solid rgba(255,80,80,0.25)", color: "#A8ABA7" }}
                          onMouseEnter={el => { (el.currentTarget as HTMLButtonElement).style.borderColor = "#FF5050"; (el.currentTarget as HTMLButtonElement).style.color = "#FF5050"; }}
                          onMouseLeave={el => { (el.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,80,80,0.25)"; (el.currentTarget as HTMLButtonElement).style.color = "#A8ABA7"; }}
                        >
                          <Trash2 size={10} /> LÖSCHEN
                        </button>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={() => deleteEntry(e.id)}
                            disabled={busy}
                            className="font-code text-xs px-2 py-1 disabled:opacity-50"
                            style={{ background: "rgba(255,80,80,0.15)", border: "1px solid #FF5050", color: "#FF5050" }}
                          >
                            {busy ? "…" : "JA"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="font-code text-xs px-2 py-1"
                            style={{ border: "1px solid rgba(254,230,0,0.25)", color: "#A8ABA7" }}
                          >
                            NEIN
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
