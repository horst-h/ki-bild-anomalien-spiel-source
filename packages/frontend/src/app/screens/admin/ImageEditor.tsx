import { useState, useRef, useCallback } from "react";
import { X, Plus, Check, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface Point { x: number; y: number; }
interface Area { id?: string; polygon: Point[]; explanation: string; }

interface AdminImage {
  id: string;
  title: string;
  image_path: string;
  category: string;
  suitability: string;
  status: string;
  time_limit_seconds: number;
  max_wrong_attempts: number;
  anomalyAreas: Area[];
}

interface Props {
  image: AdminImage;
  onClose: () => void;
  onSaved: (updated: AdminImage) => void;
  onDeleted: (id: string) => void;
}

type DrawMode = "idle" | "drawing";

const AREA_COLORS = ["#00FF41", "#FEE600", "#FF6400", "#8A2BE2", "#00CFFF", "#FF3399"];

export function ImageEditor({ image, onClose, onSaved, onDeleted }: Props) {
  const [title, setTitle] = useState(image.title);
  const [category, setCategory] = useState(image.category);
  const [suitability, setSuitability] = useState(image.suitability);
  const [timeLimit, setTimeLimit] = useState(image.time_limit_seconds);
  const [maxWrong, setMaxWrong] = useState(image.max_wrong_attempts);
  const [areas, setAreas] = useState<Area[]>(image.anomalyAreas.map(a => ({ ...a })));
  const [drawMode, setDrawMode] = useState<DrawMode>("idle");
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);
  const [selectedAreaIdx, setSelectedAreaIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expandedArea, setExpandedArea] = useState<number | null>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  function getRelPos(e: React.MouseEvent): Point {
    const rect = imgRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  }

  function handleImgClick(e: React.MouseEvent) {
    if (drawMode !== "drawing") return;
    const pt = getRelPos(e);
    setDraftPoints(prev => [...prev, pt]);
  }

  function finishPolygon() {
    if (draftPoints.length < 3) return;
    setAreas(prev => [...prev, { polygon: draftPoints, explanation: "" }]);
    setDraftPoints([]);
    setDrawMode("idle");
    setExpandedArea(areas.length);
  }

  function cancelDraw() {
    setDraftPoints([]);
    setDrawMode("idle");
  }

  function removeLastPoint() {
    setDraftPoints(prev => prev.slice(0, -1));
  }

  function deleteArea(idx: number) {
    setAreas(prev => prev.filter((_, i) => i !== idx));
    if (expandedArea === idx) setExpandedArea(null);
    else if (expandedArea !== null && expandedArea > idx) setExpandedArea(expandedArea - 1);
  }

  function setExplanation(idx: number, val: string) {
    setAreas(prev => prev.map((a, i) => i === idx ? { ...a, explanation: val } : a));
  }

  const toSvgPath = useCallback((pts: Point[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${(p.x * 100).toFixed(2)} ${(p.y * 100).toFixed(2)}`).join(" ") + " Z",
    []
  );

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/images/${image.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          category,
          suitability,
          timeLimitSeconds: timeLimit,
          maxWrongAttempts: maxWrong,
          anomalyAreas: areas.map(a => ({ id: a.id, polygon: a.polygon, explanation: a.explanation })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg = typeof body?.error === "string"
          ? body.error
          : body?.error?.fieldErrors
            ? Object.entries(body.error.fieldErrors).map(([f, e]) => `${f}: ${(e as string[]).join(", ")}`).join(" | ")
            : "Speichern fehlgeschlagen";
        throw new Error(msg);
      }
      onSaved({ ...image, title, category, suitability, time_limit_seconds: timeLimit, max_wrong_attempts: maxWrong, anomalyAreas: areas });
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    await save();
    setPublishing(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/images/${image.id}/publish`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg = Array.isArray(body?.missing) ? body.missing.join(", ") : (body?.error ?? "Publish fehlgeschlagen");
        throw new Error(msg);
      }
      onSaved({ ...image, title, category, suitability, time_limit_seconds: timeLimit, max_wrong_attempts: maxWrong, anomalyAreas: areas, status: "published" });
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setPublishing(false);
    }
  }

  async function doDelete() {
    setDeleting(true);
    const res = await fetch(`/api/admin/images/${image.id}`, { method: "DELETE", credentials: "include" });
    setDeleting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setSaveError(body?.error ?? "Löschen fehlgeschlagen");
      setConfirmDelete(false);
      return;
    }
    onDeleted(image.id);
  }

  const statusStyle: Record<string, { color: string; label: string }> = {
    published: { color: "#00FF41", label: "PUBLISHED" },
    draft: { color: "#FEE600", label: "DRAFT" },
    archived: { color: "#A8ABA7", label: "ARCHIVIERT" },
  };
  const st = statusStyle[image.status] ?? statusStyle.archived;

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div
        className="m-auto flex flex-col overflow-hidden"
        style={{ width: "min(95vw, 1200px)", maxHeight: "95vh", background: "#121414", border: "1px solid rgba(254,230,0,0.25)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid rgba(254,230,0,0.15)" }}>
          <div className="flex items-center gap-3">
            <span className="font-display font-black text-xl uppercase text-foreground">{image.title}</span>
            <span className="font-code text-xs px-2 py-0.5" style={{ color: st.color, border: `1px solid ${st.color}50` }}>{st.label}</span>
          </div>
          <button onClick={onClose} style={{ color: "#A8ABA7" }}><X size={20} /></button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: Image + Polygon Drawing */}
          <div className="flex-1 flex flex-col p-4 min-w-0 overflow-auto">
            <div
              ref={imgRef}
              onClick={handleImgClick}
              className="relative w-full select-none"
              style={{
                paddingBottom: "66.67%",
                cursor: drawMode === "drawing" ? "crosshair" : "default",
                border: drawMode === "drawing" ? "2px solid #FEE600" : "1px solid rgba(254,230,0,0.15)",
              }}
            >
              <img
                src={`/images/${image.id}`}
                alt={image.title}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                draggable={false}
              />

              {/* SVG overlay */}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none"
              >
                {/* Saved areas */}
                {areas.map((area, i) => {
                  const col = AREA_COLORS[i % AREA_COLORS.length];
                  const isSelected = selectedAreaIdx === i;
                  return (
                    <path
                      key={i}
                      d={toSvgPath(area.polygon)}
                      fill={`${col}30`}
                      stroke={col}
                      strokeWidth={isSelected ? "0.6" : "0.4"}
                      strokeDasharray={isSelected ? "2,1" : undefined}
                    />
                  );
                })}

                {/* Draft polygon */}
                {draftPoints.length > 1 && (
                  <path
                    d={toSvgPath(draftPoints)}
                    fill="rgba(254,230,0,0.15)"
                    stroke="#FEE600"
                    strokeWidth="0.5"
                    strokeDasharray="2,1"
                  />
                )}

                {/* Draft points */}
                {draftPoints.map((p, i) => (
                  <circle key={i} cx={p.x * 100} cy={p.y * 100} r="1.2" fill="#FEE600" stroke="#121414" strokeWidth="0.4" />
                ))}

                {/* Area index labels */}
                {areas.map((area, i) => {
                  const col = AREA_COLORS[i % AREA_COLORS.length];
                  const cx = area.polygon.reduce((s, p) => s + p.x, 0) / area.polygon.length * 100;
                  const cy = area.polygon.reduce((s, p) => s + p.y, 0) / area.polygon.length * 100;
                  return (
                    <text key={i} x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="3" fontWeight="bold" fill={col}>{i + 1}</text>
                  );
                })}
              </svg>
            </div>

            {/* Draw controls */}
            <div className="mt-3 flex gap-2 items-center">
              {drawMode === "idle" ? (
                <button
                  onClick={() => { setDrawMode("drawing"); setDraftPoints([]); }}
                  className="flex items-center gap-1.5 font-code text-xs px-3 py-1.5"
                  style={{ background: "rgba(0,255,65,0.08)", border: "1px solid rgba(0,255,65,0.4)", color: "#00FF41" }}
                >
                  <Plus size={12} /> BEREICH ZEICHNEN
                </button>
              ) : (
                <>
                  <span className="font-code text-xs text-muted-foreground">
                    {draftPoints.length} Punkte — mind. 3 zum Abschließen
                  </span>
                  <button
                    onClick={finishPolygon}
                    disabled={draftPoints.length < 3}
                    className="flex items-center gap-1 font-code text-xs px-3 py-1.5 disabled:opacity-40"
                    style={{ background: "rgba(0,255,65,0.1)", border: "1px solid #00FF41", color: "#00FF41" }}
                  >
                    <Check size={12} /> FERTIG
                  </button>
                  <button
                    onClick={removeLastPoint}
                    disabled={draftPoints.length === 0}
                    className="font-code text-xs px-2 py-1.5 disabled:opacity-40"
                    style={{ border: "1px solid rgba(254,230,0,0.3)", color: "#A8ABA7" }}
                  >
                    RÜCKGÄNGIG
                  </button>
                  <button
                    onClick={cancelDraw}
                    className="font-code text-xs px-2 py-1.5"
                    style={{ border: "1px solid rgba(255,80,80,0.3)", color: "#A8ABA7" }}
                  >
                    ABBRECHEN
                  </button>
                </>
              )}
            </div>

            {/* Anomaly areas list */}
            <div className="mt-4 space-y-2">
              <p className="font-code text-xs tracking-widest" style={{ color: "#FEE600" }}>ANOMALIE-BEREICHE ({areas.length})</p>
              {areas.length === 0 && (
                <p className="font-code text-xs text-muted-foreground">Noch keine Bereiche definiert.</p>
              )}
              {areas.map((area, i) => {
                const col = AREA_COLORS[i % AREA_COLORS.length];
                const isOpen = expandedArea === i;
                return (
                  <div key={i} style={{ border: `1px solid ${col}40`, background: `${col}08` }}>
                    <div
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                      onClick={() => { setExpandedArea(isOpen ? null : i); setSelectedAreaIdx(i); }}
                    >
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: col, color: "#121414", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                      <span className="font-code text-xs text-foreground flex-1 truncate">
                        {area.explanation || <span className="opacity-40">Erklärung fehlt…</span>}
                      </span>
                      <span className="font-code text-xs text-muted-foreground">{area.polygon.length} Pkt.</span>
                      {isOpen ? <ChevronUp size={12} style={{ color: col }} /> : <ChevronDown size={12} style={{ color: col }} />}
                    </div>
                    {isOpen && (
                      <div className="px-3 pb-3 space-y-2">
                        <textarea
                          value={area.explanation}
                          onChange={e => setExplanation(i, e.target.value)}
                          placeholder="Erklärung der Anomalie…"
                          rows={2}
                          className="w-full font-code text-xs bg-transparent text-foreground outline-none resize-none px-2 py-1.5"
                          style={{ border: "1px solid rgba(254,230,0,0.2)", caretColor: "#FEE600" }}
                        />
                        <button
                          onClick={() => deleteArea(i)}
                          className="flex items-center gap-1 font-code text-xs px-2 py-1 transition-all"
                          style={{ border: "1px solid rgba(255,80,80,0.3)", color: "#A8ABA7" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#FF5050"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#A8ABA7"; }}
                        >
                          <Trash2 size={10} /> BEREICH LÖSCHEN
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Settings */}
          <div className="w-72 shrink-0 flex flex-col p-4 overflow-auto space-y-4" style={{ borderLeft: "1px solid rgba(254,230,0,0.12)" }}>
            <p className="font-code text-xs tracking-widest" style={{ color: "#FEE600" }}>EINSTELLUNGEN</p>

            <label className="block">
              <span className="font-code text-xs text-muted-foreground block mb-1">TITEL</span>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full font-code text-sm bg-transparent text-foreground outline-none px-2 py-1.5"
                style={{ border: "1px solid rgba(254,230,0,0.2)", caretColor: "#FEE600" }}
              />
            </label>

            <label className="block">
              <span className="font-code text-xs text-muted-foreground block mb-1">KATEGORIE</span>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full font-code text-sm bg-transparent text-foreground outline-none px-2 py-1.5"
                style={{ border: "1px solid rgba(254,230,0,0.2)", background: "#121414" }}
              >
                <option value="leicht">leicht</option>
                <option value="mittel">mittel</option>
                <option value="schwer">schwer</option>
              </select>
            </label>

            <label className="block">
              <span className="font-code text-xs text-muted-foreground block mb-1">ZIELGRUPPE</span>
              <select
                value={suitability}
                onChange={e => setSuitability(e.target.value)}
                className="w-full font-code text-sm bg-transparent text-foreground outline-none px-2 py-1.5"
                style={{ border: "1px solid rgba(254,230,0,0.2)", background: "#121414" }}
              >
                <option value="jungfuchs">Jungfuchs</option>
                <option value="waldfuchs">Waldfuchs</option>
                <option value="erzfuchs">Erzfuchs</option>
              </select>
            </label>

            <label className="block">
              <span className="font-code text-xs text-muted-foreground block mb-1">ZEITLIMIT (Sekunden)</span>
              <input
                type="number"
                value={timeLimit}
                min={10}
                max={600}
                onChange={e => setTimeLimit(Number(e.target.value))}
                className="w-full font-code text-sm bg-transparent text-foreground outline-none px-2 py-1.5"
                style={{ border: "1px solid rgba(254,230,0,0.2)", caretColor: "#FEE600" }}
              />
            </label>

            <label className="block">
              <span className="font-code text-xs text-muted-foreground block mb-1">MAX. FEHLVERSUCHE</span>
              <input
                type="number"
                value={maxWrong}
                min={1}
                max={20}
                onChange={e => setMaxWrong(Number(e.target.value))}
                className="w-full font-code text-sm bg-transparent text-foreground outline-none px-2 py-1.5"
                style={{ border: "1px solid rgba(254,230,0,0.2)", caretColor: "#FEE600" }}
              />
            </label>

            {saveError && (
              <div className="px-3 py-2 font-code text-xs" style={{ color: "#FF5050", border: "1px solid rgba(255,80,80,0.4)", background: "rgba(255,80,80,0.06)" }}>
                {saveError}
              </div>
            )}

            <div className="space-y-2 pt-2" style={{ borderTop: "1px solid rgba(254,230,0,0.12)" }}>
              <button
                onClick={save}
                disabled={saving || publishing}
                className="w-full font-code text-xs tracking-widest py-2 disabled:opacity-40"
                style={{ border: "1px solid rgba(254,230,0,0.4)", color: "#FEE600", background: "rgba(254,230,0,0.06)" }}
              >
                {saving ? "SPEICHERE …" : "SPEICHERN"}
              </button>

              {image.status !== "published" && (
                <button
                  onClick={publish}
                  disabled={saving || publishing}
                  className="w-full font-code text-xs tracking-widest py-2 disabled:opacity-40"
                  style={{ background: "#00FF41", color: "#121414", border: "none" }}
                >
                  {publishing ? "PUBLISHING …" : "SPEICHERN & PUBLISHEN"}
                </button>
              )}

              <div style={{ borderTop: "1px solid rgba(255,80,80,0.15)", paddingTop: 8 }}>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full flex items-center justify-center gap-1.5 font-code text-xs py-2 transition-all"
                    style={{ border: "1px solid rgba(255,80,80,0.3)", color: "#A8ABA7" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#FF5050"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#FF5050"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#A8ABA7"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,80,80,0.3)"; }}
                  >
                    <Trash2 size={11} /> BILD LÖSCHEN
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button
                      onClick={doDelete}
                      disabled={deleting}
                      className="flex-1 font-code text-xs py-2 disabled:opacity-50"
                      style={{ background: "rgba(255,80,80,0.15)", border: "1px solid #FF5050", color: "#FF5050" }}
                    >
                      {deleting ? "…" : "WIRKLICH LÖSCHEN?"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 font-code text-xs py-2"
                      style={{ border: "1px solid rgba(254,230,0,0.25)", color: "#A8ABA7" }}
                    >
                      NEIN
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
