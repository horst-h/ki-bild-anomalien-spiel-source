interface TopBarProps {
  hits: number;
  totalAreas: number;
  remainingTime: number;
  wrongAttempts: number;
  maxWrongAttempts: number;
}

export function TopBar({ hits, totalAreas, remainingTime, wrongAttempts, maxWrongAttempts }: TopBarProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "0.75rem 1rem",
        fontFamily: "sans-serif",
        fontWeight: 600,
      }}
    >
      <span>
        Treffer: {hits}/{totalAreas}
      </span>
      <span>{remainingTime}s</span>
      <span>
        Fehlversuche: {wrongAttempts}/{maxWrongAttempts}
      </span>
    </div>
  );
}
