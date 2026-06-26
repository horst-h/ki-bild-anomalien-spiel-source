// TODO: Design-Pass – Startseite: Branding, Illustration, Fuchs-Maskottchen, Farbschema
interface StartScreenProps {
  onStartGame: () => void;
  onViewLeaderboard: () => void;
  onGoAdmin: () => void;
}

export function StartScreen({ onStartGame, onViewLeaderboard, onGoAdmin }: StartScreenProps) {
  return (
    <div>
      <h1>KI-Bild-Anomalien-Spiel</h1>
      <p>Finde kritische Bereiche in KI-generierten Bildern – bevor die Zeit abläuft.</p>
      <p>
        <button onClick={onStartGame}>Spiel starten</button>
        {" "}
        <button onClick={onViewLeaderboard}>Leaderboard</button>
      </p>
      {/* Admin-Link bewusst unauffällig – kein eigener Navigations-Eintrag */}
      <p style={{ marginTop: "4rem" }}>
        <button onClick={onGoAdmin} style={{ fontSize: "0.75rem", color: "#aaa", background: "none", border: "none", cursor: "pointer" }}>
          Admin
        </button>
      </p>
    </div>
  );
}
