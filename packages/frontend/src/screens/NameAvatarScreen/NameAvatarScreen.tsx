import { useState } from "react";
import { api } from "../../api/client";

// TODO: Design-Pass – Avatar-Karten mit Fuchs-Illustrationen statt Radio-Buttons

const AVATAR_OPTIONS = [
  { id: "jungfuchs",  label: "Jungfuchs",  description: "Einsteiger – familienfreundliche Bilder" },
  { id: "waldfuchs",  label: "Waldfuchs",  description: "Fortgeschritten – anspruchsvollere Themen" },
  { id: "erzfuchs",   label: "Erzfuchs",   description: "Experte – komplexe und ernstere Inhalte" },
] as const;

const BLOCKED_MESSAGES: Record<string, string> = {
  blocklist:     "Dieser Name ist leider nicht erlaubt.",
  impersonation: "Dieser Name ist für Systembegriffe reserviert.",
  perspective:   "Dieser Name wurde als unangemessen eingestuft.",
};

interface NameAvatarScreenProps {
  onSubmit: (playerName: string, avatarLevel: string) => void;
  onBack: () => void;
}

export function NameAvatarScreen({ onSubmit, onBack }: NameAvatarScreenProps) {
  const [name, setName] = useState("");
  const [avatarLevel, setAvatarLevel] = useState<string>("waldfuchs");
  const [nameError, setNameError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (trimmed.length < 2) { setNameError("Name muss mindestens 2 Zeichen haben."); return; }
    if (trimmed.length > 30) { setNameError("Name darf maximal 30 Zeichen haben."); return; }

    setChecking(true);
    setNameError(null);
    try {
      const result = await api.validateName(trimmed);
      if (result.verdict === "blocked") {
        setNameError(BLOCKED_MESSAGES[result.stage ?? "blocklist"] ?? "Dieser Name ist nicht erlaubt.");
        return;
      }
      // "allowed" und "review" (API-Fehler → fail-open) → Spiel starten
      onSubmit(trimmed, avatarLevel);
    } catch {
      // Netzwerkfehler bei der Validierung → Spielstart trotzdem erlauben
      onSubmit(trimmed, avatarLevel);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <button onClick={onBack}>← Zurück</button>
      <h2>Wer bist du?</h2>

      <div>
        <label htmlFor="playerName">Name: </label>
        <input
          id="playerName"
          type="text"
          value={name}
          maxLength={30}
          autoFocus
          disabled={checking}
          onChange={(e) => { setName(e.target.value); setNameError(null); }}
          onKeyDown={(e) => e.key === "Enter" && !checking && handleSubmit()}
        />
        {nameError && <span style={{ color: "red" }}> {nameError}</span>}
      </div>

      <fieldset>
        <legend>Fuchs-Level wählen:</legend>
        {AVATAR_OPTIONS.map((opt) => (
          <label key={opt.id} style={{ display: "block" }}>
            <input
              type="radio"
              name="avatarLevel"
              value={opt.id}
              checked={avatarLevel === opt.id}
              onChange={() => setAvatarLevel(opt.id)}
            />
            {" "}<strong>{opt.label}</strong> – {opt.description}
          </label>
        ))}
      </fieldset>

      <p>
        <button onClick={onBack} disabled={checking}>Abbrechen</button>
        {" "}
        <button onClick={handleSubmit} disabled={checking}>
          {checking ? "Wird geprüft …" : "Los geht's!"}
        </button>
      </p>
    </div>
  );
}
