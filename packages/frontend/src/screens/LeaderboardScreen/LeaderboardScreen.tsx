import { useEffect, useState } from "react";
import { api, type LeaderboardEntry } from "../../api/client";

// TODO: Design-Pass – Podiumsdarstellung, Avatar-Symbole, Rang-Hervorhebung

interface LeaderboardScreenProps {
  onBack: () => void;
}

export function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getLeaderboard()
      .then(setEntries)
      .catch(() => setError("Leaderboard konnte nicht geladen werden."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <button onClick={onBack}>← Zurück</button>
      <h2>Leaderboard</h2>

      {loading && <p>Lädt …</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && !error && entries.length === 0 && <p>Noch keine Einträge vorhanden.</p>}

      {!loading && !error && entries.length > 0 && (
        <table border={1} cellPadding={4}>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Level</th>
              <th>Punkte</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={`${e.playerName}-${e.createdAt}-${i}`}>
                <td>{e.rank}</td>
                <td>{e.playerName}</td>
                <td>{e.avatarLevel}</td>
                <td>{e.totalScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
