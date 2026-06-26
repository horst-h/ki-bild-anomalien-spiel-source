import { useEffect, useState } from "react";
import { useMachine } from "@xstate/react";
import { gameMachine } from "../../machines/gameMachine";
import { TopBar } from "./TopBar";
import { GameCanvas } from "./GameCanvas";
import { FeedbackPopup } from "./FeedbackPopup";

interface GameScreenProps {
  playerName: string;
  avatarLevel: string;
  onGameFinished: () => void;
}

/**
 * Container-Komponente für den Spielablauf. Bindet die gameMachine an die
 * Sub-Komponenten. Übergänge zwischen Screens (Start/Game/Result/Summary)
 * würden im Vollausbau über eine übergeordnete AppMachine laufen –
 * hier bewusst auf den GameScreen-Teil reduziert.
 */
export function GameScreen({ playerName, avatarLevel, onGameFinished }: GameScreenProps) {
  const [state, send] = useMachine(gameMachine);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

  // START_GAME einmalig nach Mount senden – nicht im Render-Body,
  // damit kein Retry-Loop entsteht wenn das Backend einen Fehler liefert.
  useEffect(() => {
    send({ type: "START_GAME", playerName, avatarLevel });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.matches("starting") || state.matches("loadingTask")) {
    return <p>Lädt …</p>;
  }

  // Fehler beim Spielstart (z. B. Name nicht erlaubt, kein Bild verfügbar)
  if (state.matches("idle") && state.context.error) {
    return (
      <div>
        <p style={{ color: "red" }}>{state.context.error}</p>
        <button onClick={onGameFinished}>Zurück</button>
      </div>
    );
  }

  if (state.matches("playing") || state.matches("finishingTask")) {
    const { task, hits, wrongAttempts, remainingTime, foundAreas, lastFeedback } = state.context;
    if (!task) return null;

    function handlePointClick(x: number, y: number) {
      setPopupPos({ x: x * 640, y: y * 480 });
      send({ type: "CLICK", x, y });
    }

    return (
      <div style={{ position: "relative" }}>
        <TopBar
          hits={hits}
          totalAreas={task.totalAreas}
          remainingTime={remainingTime}
          wrongAttempts={wrongAttempts}
          maxWrongAttempts={task.maxWrongAttempts}
        />
        <GameCanvas imageUrl={task.imageUrl} foundAreas={foundAreas} onPointClick={handlePointClick} />
        <FeedbackPopup feedback={lastFeedback} x={popupPos.x} y={popupPos.y} />
        <button onClick={() => send({ type: "SKIP" })} style={{ marginTop: "0.5rem" }}>
          Weiter (überspringen)
        </button>
      </div>
    );
  }

  if (state.matches("roundResult")) {
    const { resolution, scorePerTask, taskIndex } = state.context;
    const lastScore = scorePerTask[scorePerTask.length - 1]?.score ?? 0;

    return (
      <div>
        <h2>Ergebnis – Aufgabe {taskIndex + 1}</h2>
        <p>Score dieser Aufgabe: {lastScore}</p>
        <ul>
          {resolution.map((area) => (
            <li key={area.id} style={{ color: area.found ? "#0F6E56" : "#A32D2D" }}>
              {area.found ? "Gefunden: " : "Nicht gefunden: "}
              {area.explanation}
            </li>
          ))}
        </ul>
        <button onClick={() => send({ type: "CONTINUE" })}>Weiter</button>
      </div>
    );
  }

  if (state.matches("loadingSummary")) {
    return <p>Gesamtauswertung wird geladen …</p>;
  }

  if (state.matches("summary")) {
    const summary = state.context.summary;
    if (!summary) return null;
    return (
      <div>
        <h2>Gesamtauswertung</h2>
        <p>Spieler: {summary.playerName}</p>
        <p>Gesamtscore: {summary.totalScore}</p>
        <p>Platzierung: {summary.rank}</p>
        <button onClick={onGameFinished}>Zurück zur Startseite</button>
      </div>
    );
  }

  return null;
}
