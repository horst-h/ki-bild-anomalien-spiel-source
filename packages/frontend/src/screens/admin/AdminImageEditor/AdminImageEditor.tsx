import { useEffect, useRef, useState } from "react";
import { useMachine } from "@xstate/react";
import { Stage, Layer, Image as KonvaImage, Circle, Line, Group } from "react-konva";
import { adminEditorMachine, type Area } from "../../../machines/adminEditorMachine";
import { api } from "../../../api/client";

// TODO: Design-Pass – gesamter Admin-Editor: Layout, Canvas-Rahmen, Polygon-Farben,
//   Bereichsliste, Toolbar-Positionierung

interface AdminImageEditorProps {
  imageId: string;
  onBack: () => void;
  onLogout: () => void;
}

export function AdminImageEditor({ imageId, onBack, onLogout }: AdminImageEditorProps) {
  // --- Metadaten-Formularstate (einfacher React-State, da reine Formulardaten) ---
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"leicht" | "mittel" | "schwer">("leicht");
  const [suitability, setSuitability] = useState<"kinderfreundlich" | "allgemein">("allgemein");
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(60);
  const [maxWrongAttempts, setMaxWrongAttempts] = useState(6);
  const [imageStatus, setImageStatus] = useState<"draft" | "published" | "archived">("draft");

  // --- Ladezustand ---
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // --- Speichern / Veröffentlichen ---
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);

  // --- Zeichenzustand (XState) ---
  const [editorState, editorSend] = useMachine(adminEditorMachine);
  const isDrawing = editorState.matches("drawing");
  const { areas, currentPoints } = editorState.context;

  // --- Canvas-Bild ---
  const [konvaImage, setKonvaImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 640, height: 480 });

  // Farbe pro gespeichertem Bereich (zyklisch) für visuelle Unterscheidung
  const AREA_COLORS = ["red", "blue", "green", "orange", "purple", "teal"];
  function areaColor(index: number) { return AREA_COLORS[index % AREA_COLORS.length]; }

  // --- Bilddaten laden ---
  useEffect(() => {
    api
      .adminGetImage(imageId)
      .then((img) => {
        setTitle(img.title);
        setCategory(img.category);
        setSuitability(img.suitability);
        setTimeLimitSeconds(img.time_limit_seconds);
        setMaxWrongAttempts(img.max_wrong_attempts);
        setImageStatus(img.status as "draft" | "published" | "archived");

        // Vorhandene Anomalie-Bereiche in die Machine laden
        editorSend({ type: "SET_AREAS", areas: img.anomalyAreas as Area[] });

        // Bild für Konva laden
        const htmlImg = new window.Image();
        htmlImg.src = `/images/${img.id}`;
        htmlImg.onload = () => {
          setKonvaImage(htmlImg);
          // Canvas-Größe proportional zum Originalbild, max 800px breit
          const maxW = 800;
          const ratio = htmlImg.naturalWidth / htmlImg.naturalHeight;
          const w = Math.min(maxW, htmlImg.naturalWidth);
          setCanvasSize({ width: Math.round(w), height: Math.round(w / ratio) });
        };
      })
      .catch(() => setLoadError("Bild konnte nicht geladen werden."))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageId]);

  // --- Canvas-Klick: Punkt hinzufügen ---
  function handleCanvasClick(e: any) {
    if (!isDrawing) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;
    editorSend({
      type: "ADD_POINT",
      x: pos.x / canvasSize.width,
      y: pos.y / canvasSize.height,
    });
  }

  // --- Speichern ---
  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.adminUpdateImage(imageId, {
        title,
        category,
        suitability,
        timeLimitSeconds,
        maxWrongAttempts,
        anomalyAreas: areas.map((a) => ({
          id: a.id,
          polygon: a.polygon,
          explanation: a.explanation,
        })),
      });
      setSaveMsg("Gespeichert.");
    } catch (e) {
      setSaveMsg(`Fehler: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  // --- Veröffentlichen ---
  async function handlePublish() {
    setPublishing(true);
    setPublishMsg(null);
    try {
      await api.adminPublishImage(imageId);
      setImageStatus("published");
      setPublishMsg("Veröffentlicht.");
    } catch (e) {
      setPublishMsg(`Fehler: ${(e as Error).message}`);
    } finally {
      setPublishing(false);
    }
  }

  async function handleLogout() {
    await api.adminLogout().catch(() => {});
    onLogout();
  }

  // --- Punkte für Konva-Line: Array von [x1, y1, x2, y2, ...] ---
  function toCanvasPoints(points: { x: number; y: number }[]) {
    return points.flatMap((p) => [p.x * canvasSize.width, p.y * canvasSize.height]);
  }

  // --- Render ---
  if (loading) return <p>Lädt …</p>;
  if (loadError) return <p style={{ color: "red" }}>{loadError} <button onClick={onBack}>Zurück</button></p>;

  return (
    <div>
      <p>
        <button onClick={onBack}>← Zurück zur Liste</button>
        {" "}
        <button onClick={handleLogout}>Logout</button>
        {" "}
        Status: <strong>{imageStatus}</strong>
      </p>

      <h2>Bild bearbeiten</h2>

      {/* ── Metadaten-Formular ────────────────────────────────────────── */}
      {/* TODO: Design-Pass – Formular-Layout */}
      <fieldset>
        <legend>Metadaten</legend>
        <div>
          <label>
            Titel:{" "}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: "300px" }}
            />
          </label>
        </div>
        <div>
          <label>
            Kategorie:{" "}
            <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
              <option value="leicht">leicht</option>
              <option value="mittel">mittel</option>
              <option value="schwer">schwer</option>
            </select>
          </label>
          {" "}
          <label>
            Eignung:{" "}
            <select value={suitability} onChange={(e) => setSuitability(e.target.value as typeof suitability)}>
              <option value="kinderfreundlich">kinderfreundlich</option>
              <option value="allgemein">allgemein</option>
            </select>
          </label>
        </div>
        <div>
          <label>
            Zeitlimit (s):{" "}
            <input
              type="number"
              value={timeLimitSeconds}
              min={10}
              max={300}
              onChange={(e) => setTimeLimitSeconds(Number(e.target.value))}
              style={{ width: "70px" }}
            />
          </label>
          {" "}
          <label>
            Max. Fehlversuche:{" "}
            <input
              type="number"
              value={maxWrongAttempts}
              min={1}
              max={20}
              onChange={(e) => setMaxWrongAttempts(Number(e.target.value))}
              style={{ width: "60px" }}
            />
          </label>
        </div>
      </fieldset>

      {/* ── Polygon-Editor ────────────────────────────────────────────── */}
      <h3>Fehlerbereiche zeichnen</h3>

      {/* Toolbar */}
      <div style={{ marginBottom: "4px" }}>
        {!isDrawing ? (
          <button onClick={() => editorSend({ type: "START_DRAWING" })}>
            + Neuen Bereich zeichnen
          </button>
        ) : (
          <>
            <strong>Zeichenmodus:</strong> Klicke auf das Bild, um Punkte zu setzen ({currentPoints.length} gesetzt, min. 3).
            {" "}
            <button
              onClick={() => editorSend({ type: "UNDO_LAST_POINT" })}
              disabled={currentPoints.length === 0}
            >
              Letzten Punkt löschen
            </button>
            {" "}
            <button
              onClick={() => editorSend({ type: "FINISH_POLYGON" })}
              disabled={currentPoints.length < 3}
            >
              Bereich abschließen
            </button>
            {" "}
            <button onClick={() => editorSend({ type: "CANCEL_DRAWING" })}>Abbrechen</button>
          </>
        )}
      </div>

      {/* TODO: Design-Pass – Canvas-Rahmen, Cursor-Feedback, Punkt-Snap */}
      <Stage
        width={canvasSize.width}
        height={canvasSize.height}
        onClick={handleCanvasClick}
        style={{ cursor: isDrawing ? "crosshair" : "default", border: "1px solid #ccc" }}
      >
        <Layer>
          {/* Hintergrundbild */}
          {konvaImage && (
            <KonvaImage image={konvaImage} width={canvasSize.width} height={canvasSize.height} />
          )}

          {/* Gespeicherte Bereiche */}
          {areas.map((area, areaIdx) => {
            const pts = toCanvasPoints(area.polygon);
            const color = areaColor(areaIdx);
            return (
              <Group key={area.id}>
                <Line
                  points={pts}
                  closed
                  stroke={color}
                  strokeWidth={2}
                  fill={color}
                  opacity={0.25}
                />
                {area.polygon.map((pt, ptIdx) => (
                  <Circle
                    key={ptIdx}
                    x={pt.x * canvasSize.width}
                    y={pt.y * canvasSize.height}
                    radius={4}
                    fill={color}
                  />
                ))}
              </Group>
            );
          })}

          {/* Aktuell gezeichnetes Polygon (in progress) */}
          {currentPoints.length > 0 && (
            <Group>
              <Line
                points={toCanvasPoints(currentPoints)}
                stroke="black"
                strokeWidth={2}
                dash={[6, 3]}
              />
              {currentPoints.map((pt, i) => (
                <Circle
                  key={i}
                  x={pt.x * canvasSize.width}
                  y={pt.y * canvasSize.height}
                  radius={5}
                  fill={i === 0 ? "yellow" : "black"}
                  stroke="white"
                  strokeWidth={1}
                />
              ))}
            </Group>
          )}
        </Layer>
      </Stage>

      {/* ── Bereichsliste mit Erklärungen ────────────────────────────── */}
      {areas.length === 0 && !isDrawing && (
        <p>Noch keine Fehlerbereiche definiert. Klicke auf „Neuen Bereich zeichnen".</p>
      )}

      {areas.map((area, idx) => (
        <AreaRow
          key={area.id}
          area={area}
          index={idx}
          color={areaColor(idx)}
          onExplanationChange={(explanation) =>
            editorSend({ type: "SET_EXPLANATION", id: area.id, explanation })
          }
          onDelete={() => editorSend({ type: "DELETE_AREA", id: area.id })}
        />
      ))}

      {/* ── Speichern / Veröffentlichen ───────────────────────────────── */}
      <hr />
      <div>
        <button onClick={handleSave} disabled={saving}>
          {saving ? "Speichern …" : "Speichern"}
        </button>
        {" "}
        {imageStatus !== "published" && (
          <button onClick={handlePublish} disabled={publishing}>
            {publishing ? "Veröffentlichen …" : "Veröffentlichen"}
          </button>
        )}
        {saveMsg && <span> {saveMsg}</span>}
        {publishMsg && <span> {publishMsg}</span>}
        {imageStatus === "published" && <em> (Bild ist bereits veröffentlicht)</em>}
      </div>
    </div>
  );
}

// ── Unterkomponente für eine einzelne Area-Zeile ──────────────────────────────
interface AreaRowProps {
  area: Area;
  index: number;
  color: string;
  onExplanationChange: (explanation: string) => void;
  onDelete: () => void;
}

function AreaRow({ area, index, color, onExplanationChange, onDelete }: AreaRowProps) {
  return (
    // TODO: Design-Pass – Bereichs-Karte mit Farb-Indikator, Polygon-Vorschau
    <div style={{ borderLeft: `4px solid ${color}`, marginTop: "8px", paddingLeft: "8px" }}>
      <strong>Bereich {index + 1}</strong>
      {" "}({area.polygon.length} Punkte)
      {" "}
      <button onClick={onDelete}>Löschen</button>
      <div>
        <label>
          Erklärung:{" "}
          <textarea
            value={area.explanation}
            rows={2}
            cols={60}
            placeholder="Warum ist das ein KI-Fehler? (Pflichtfeld zum Veröffentlichen)"
            onChange={(e) => onExplanationChange(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
