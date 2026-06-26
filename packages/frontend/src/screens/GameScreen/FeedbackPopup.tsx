import { useEffect, useState } from "react";

interface FeedbackPopupProps {
  feedback: "hit" | "duplicate" | "miss" | null;
  x: number;
  y: number;
}

/**
 * Zeigt für ca. 1 Sekunde ein Haken- oder Kreuz-Symbol an der Klickposition.
 * "duplicate" (wiederholter Klick auf gefundenen Bereich) zeigt bewusst
 * kein Popup, siehe Anforderungsdokument Abschnitt 8/18.3.
 */
export function FeedbackPopup({ feedback, x, y }: FeedbackPopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (feedback === "hit" || feedback === "miss") {
      setVisible(true);
      const timeout = setTimeout(() => setVisible(false), 1000);
      return () => clearTimeout(timeout);
    }
    setVisible(false);
  }, [feedback]);

  if (!visible) return null;

  const isHit = feedback === "hit";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        width: 40,
        height: 40,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 24,
        color: "#fff",
        background: isHit ? "#0F6E56" : "#A32D2D",
        pointerEvents: "none",
      }}
    >
      {isHit ? "✓" : "✕"}
    </div>
  );
}
