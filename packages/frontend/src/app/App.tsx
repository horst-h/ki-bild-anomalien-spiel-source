import image_csm_schwaebisch_hall_fuchs_webseite_transparent_ab262067f2 from '@/imports/csm_schwaebisch-hall_fuchs_webseite-transparent_ab262067f2.png'
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import foxHero from "@/imports/image-2.png";
import foxAvatar from "@/imports/image_1.png";
import foxAvatarErzfuchs from "@/imports/image_2.png";
import { Clock, Target, X, Check, Trophy, RotateCcw, ChevronRight, Crosshair, AlertTriangle, Info } from "lucide-react";
import { api } from "../api";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type Screen = "start" | "avatar" | "game" | "round-result" | "final" | "admin";
type AvatarType = "jungfuchs" | "erzfuchs";

interface AnomalyZone {
  id: string;
  label: string;
  explanation: string;
  pts: Array<[number, number]>; // 0–100 percentage of image
}

interface GameImage {
  id: string;
  src: string;
  title: string;
  level: "easy" | "medium" | "hard";
  timeLimit: number;
  maxMisses: number;
  zones: AnomalyZone[];
}

interface RoundResult {
  score: number;
  found: number;
  total: number;
  misses: number;
  timeLeft: number;
  timeLimit: number;
  foundZoneIds: string[];
  markerPositions: Array<{ id: number; x: number; y: number }>;
  resolution?: any; // Real resolution from API
}


// ─────────────────────────────────────────────────────────────
// GAME DATA
// ─────────────────────────────────────────────────────────────

const GAME_IMAGES: GameImage[] = [
  {
    id: "urban-alpha",
    src: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&h=800&fit=crop&auto=format",
    title: "URBAN ALPHA — Sektor 7",
    level: "easy",
    timeLimit: 90,
    maxMisses: 8,
    zones: [
      {
        id: "z1",
        label: "Schwebende Laterne",
        explanation: "Die Straßenlaterne hat keine sichtbare Verbindung zum Boden – typisches KI-Artefakt bei urbanen Bildgeneratoren.",
        pts: [[8, 14], [28, 11], [30, 38], [10, 41]],
      },
      {
        id: "z2",
        label: "Doppelter Schatten",
        explanation: "Das Gebäude wirft zwei Schatten in entgegengesetzte Richtungen. Physikalisch nur mit zwei Lichtquellen möglich – hier nicht vorhanden.",
        pts: [[54, 50], [76, 47], [80, 72], [51, 75]],
      },
      {
        id: "z3",
        label: "Textur-Fusion",
        explanation: "Fassadenoberfläche verschmilzt nahtlos mit dem Himmel. Klassisches Diffusionsmodell-Artefakt an Objekträndern.",
        pts: [[67, 8], [88, 5], [90, 32], [65, 35]],
      },
    ],
  },
  {
    id: "portrait-beta",
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=800&fit=crop&auto=format",
    title: "PORTRAIT BETA — ID 482",
    level: "medium",
    timeLimit: 65,
    maxMisses: 6,
    zones: [
      {
        id: "z4",
        label: "Asymmetrie: Ohr",
        explanation: "Linkes und rechtes Ohr haben vollkommen unterschiedliche Formen. KI-Modelle balancieren Gesichtsmerkmale oft falsch.",
        pts: [[10, 28], [28, 25], [30, 50], [12, 54]],
      },
      {
        id: "z5",
        label: "Sechs Finger",
        explanation: "Die Hand zeigt 6 erkennbare Finger. KI-Systeme scheitern konsistent an korrekter Fingeranzahl – ein bekannter Schwachpunkt.",
        pts: [[60, 60], [82, 58], [85, 82], [58, 84]],
      },
      {
        id: "z6",
        label: "Haar-Diskontinuität",
        explanation: "Die Haarlinie bricht unvermittelt ab und erscheint versetzt wieder. Segmentierungs-Artefakt bei langen Haaren.",
        pts: [[37, 1], [63, 0], [65, 20], [35, 22]],
      },
    ],
  },
  {
    id: "arch-gamma",
    src: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&h=800&fit=crop&auto=format",
    title: "ARCH GAMMA — Struktur X",
    level: "hard",
    timeLimit: 45,
    maxMisses: 4,
    zones: [
      {
        id: "z7",
        label: "Unmögliche Ecke",
        explanation: "Die Gebäudekante verbindet Winkel, die geometrisch inkonsistent sind. Penrose-ähnliche Struktur.",
        pts: [[17, 27], [40, 24], [43, 50], [15, 53]],
      },
      {
        id: "z8",
        label: "Falsche Reflexion",
        explanation: "Das Fenster reflektiert eine Szene, die nicht zur Umgebung gehört. KI erfand einen Parallelkontext.",
        pts: [[54, 37], [76, 34], [79, 60], [52, 63]],
      },
      {
        id: "z9",
        label: "Textur-Loop",
        explanation: "Exakt dasselbe Backsteinmuster wiederholt sich dreimal pixelgenau – unmöglich bei echtem Mauerwerk.",
        pts: [[27, 67], [52, 65], [54, 86], [25, 88]],
      },
    ],
  },
];

const AVATAR_DEFS = {
  jungfuchs: { name: "Jungfuchs", desc: "Einstieg · Kinderfreundliche Szenen", color: "#00FF41" },
  erzfuchs: { name: "Erzfuchs", desc: "Experte · Anspruchsvolle KI-Bilder", color: "#8A2BE2" },
};

const MOCK_BOARD = [
  { name: "KI_Jäger_X", avatar: "erzfuchs" as AvatarType, score: 2847 },
  { name: "Anomalie99", avatar: "jungfuchs" as AvatarType, score: 2634 },
  { name: "Scharfauge", avatar: "erzfuchs" as AvatarType, score: 2501 },
  { name: "PixelHunter", avatar: "jungfuchs" as AvatarType, score: 2380 },
  { name: "DeepScan_7", avatar: "erzfuchs" as AvatarType, score: 2210 },
];

const TOTAL_ROUNDS = 3;

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

function pointInPoly(px: number, py: number, pts: Array<[number, number]>): boolean {
  let inside = false;
  const n = pts.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function calcScore(found: number, total: number, timeLeft: number, timeLimit: number, misses: number, maxMisses: number): number {
  const r = found / total;
  const base = 1000 * r;
  const bonus = 250 * r * (timeLeft / timeLimit);
  const penalty = 300 * (misses / Math.max(1, maxMisses));
  return Math.max(0, Math.min(1000, Math.round(base + bonus - penalty)));
}

function fmtTime(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function polyCenter(pts: Array<[number, number]>): [number, number] {
  return [
    pts.reduce((s, [x]) => s + x, 0) / pts.length,
    pts.reduce((s, [, y]) => s + y, 0) / pts.length,
  ];
}

// ─────────────────────────────────────────────────────────────
// FOX SVG AVATAR
// ─────────────────────────────────────────────────────────────

function FoxIcon({ type, size = 64 }: { type: AvatarType; size?: number }) {
  const c = AVATAR_DEFS[type].color;
  const dark = "#121414";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="30" fill="#1A1C1A" stroke={c} strokeWidth="1.5" />
      {/* body */}
      <ellipse cx="32" cy="42" rx="14" ry="10" fill={c} opacity="0.85" />
      {/* head */}
      <ellipse cx="32" cy="27" rx="13" ry="11" fill={c} />
      {/* ears */}
      <polygon points="20,19 14,3 27,15" fill={c} />
      <polygon points="44,19 50,3 37,15" fill={c} />
      <polygon points="21,18 16,7 27,15" fill={dark} opacity="0.35" />
      <polygon points="43,18 48,7 37,15" fill={dark} opacity="0.35" />
      {/* snout */}
      <ellipse cx="32" cy="30" rx="6" ry="4" fill={c} opacity="0.6" />
      {/* eyes */}
      <ellipse cx="26" cy="25" rx="2.8" ry="2.8" fill={dark} />
      <ellipse cx="38" cy="25" rx="2.8" ry="2.8" fill={dark} />
      <circle cx="27" cy="24.2" r="0.9" fill="white" />
      <circle cx="39" cy="24.2" r="0.9" fill="white" />
      {/* nose */}
      <ellipse cx="32" cy="30" rx="2" ry="1.6" fill={dark} />
      {/* level badge */}
      {type === "erzfuchs" && <circle cx="52" cy="12" r="5" fill="#8A2BE2" stroke="#FEE600" strokeWidth="1.5" />}
      {type === "jungfuchs" && <circle cx="52" cy="12" r="5" fill="#00FF41" stroke={dark} strokeWidth="1.5" />}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// SCAN LINE OVERLAY
// ─────────────────────────────────────────────────────────────

function ScanLines() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)",
        zIndex: 0,
      }}
    />
  );
}

function CornerBrackets({ color = "#FEE600" }: { color?: string }) {
  const s = `w-6 h-6 absolute`;
  const style = { borderColor: color };
  return (
    <>
      <div className={`${s} top-3 left-3 border-l-2 border-t-2`} style={style} />
      <div className={`${s} top-3 right-3 border-r-2 border-t-2`} style={style} />
      <div className={`${s} bottom-3 left-3 border-l-2 border-b-2`} style={style} />
      <div className={`${s} bottom-3 right-3 border-r-2 border-b-2`} style={style} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// START SCREEN
// ─────────────────────────────────────────────────────────────

function StartScreen({ onStart, onAdmin }: { onStart: () => void; onAdmin: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background relative flex flex-col items-center justify-center p-8 overflow-hidden"
    >
      <ScanLines />
      <CornerBrackets />

      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(254,230,0,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(254,230,0,0.15) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 text-center max-w-xl">
        <p
          className="font-code text-xs tracking-[0.4em] mb-4 opacity-60"
          style={{ color: "#FEE600" }}
        >
          SYSTEM AKTIV // KI-ANALYSE MODUL v2.4
        </p>

        <h1
          className="font-display text-[clamp(4rem,12vw,9rem)] font-black uppercase leading-none tracking-tight mb-1"
          style={{ color: "#FEE600" }}
        >
          KI IM
        </h1>
        <h1
          className="font-display text-[clamp(4rem,12vw,9rem)] font-black uppercase leading-none tracking-tight"
          style={{ color: "#E0E0D8" }}
        >
          VISIER
        </h1>

        <div className="flex items-center justify-center gap-4 my-6">
          <div className="flex-1 h-px" style={{ background: "rgba(254,230,0,0.3)" }} />
          <span className="font-code text-xs tracking-widest opacity-40" style={{ color: "#FEE600" }}>
            ◆
          </span>
          <div className="flex-1 h-px" style={{ background: "rgba(254,230,0,0.3)" }} />
        </div>

        {/* Animated fox */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          className="flex justify-center mb-6"
        >
          <div className="w-48 h-48 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-2xl">
            <img src={image_csm_schwaebisch_hall_fuchs_webseite_transparent_ab262067f2} alt="Fuchs Maskottchen" className="w-44 h-44 object-contain" />
          </div>
        </motion.div>

        <p className="font-code text-muted-foreground mb-8 leading-relaxed max-w-sm mx-auto text-[15px]">
          Entdecke KI-Anomalien in synthetischen Bildern.
          <br />
          Bist du scharf genug, die Fehler zu finden?
        </p>

        <div className="flex flex-col gap-3 items-center">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onStart}
            className="w-64 py-4 font-display font-black uppercase text-xl tracking-[0.15em] transition-all"
            style={{ background: "#FEE600", color: "#121414" }}
          >
            SPIEL STARTEN
          </motion.button>

          <button
            onClick={onAdmin}
            className="w-64 py-3 font-code text-xs tracking-[0.2em] text-muted-foreground transition-all"
            style={{ border: "1px solid rgba(254,230,0,0.2)" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#FEE600";
              (e.currentTarget as HTMLButtonElement).style.color = "#FEE600";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(254,230,0,0.2)";
              (e.currentTarget as HTMLButtonElement).style.color = "#A8ABA7";
            }}
          >
            ADMIN ZUGANG
          </button>
        </div>

        <p className="mt-10 font-code text-xs opacity-25" style={{ color: "#FEE600" }}>
          KINETIC TRUTH // FESTIVAL EDITION 2025
        </p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// AVATAR SCREEN
// ─────────────────────────────────────────────────────────────

function AvatarScreen({ onStart }: { onStart: (name: string, avatar: AvatarType) => void }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<AvatarType | null>(null);
  const canGo = name.trim().length > 0 && selected !== null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen bg-background flex flex-col items-center justify-center p-8"
    >
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <p className="font-code text-xs tracking-[0.3em] mb-1" style={{ color: "#FEE600", opacity: 0.6 }}>
            INITIALISIERUNG // SPIELER-SETUP
          </p>
          <h2 className="font-display font-black text-5xl uppercase tracking-tight text-foreground">
            PROFIL ERSTELLEN
          </h2>
          <div className="mt-2 h-px w-32" style={{ background: "#FEE600" }} />
        </div>

        {/* Name */}
        <div className="mb-8">
          <label className="font-code text-xs tracking-[0.25em] block mb-2" style={{ color: "#FEE600" }}>Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="CODENAME EINGEBEN..."
            maxLength={20}
            className="w-full py-3 px-4 font-code text-base text-foreground tracking-wider focus:outline-none placeholder:opacity-30"
            style={{
              background: "#1C1E1C",
              border: "1px solid rgba(254,230,0,0.2)",
              caretColor: "#FEE600",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "#FEE600")}
            onBlur={e => (e.currentTarget.style.borderColor = "rgba(254,230,0,0.2)")}
          />
        </div>

        {/* Avatar selection */}
        <div className="mb-8">
          <label className="font-code text-xs tracking-[0.25em] block mb-4" style={{ color: "#FEE600" }}>
            ERFAHRUNGS-KLASSE WÄHLEN
          </label>
          <div className="grid grid-cols-2 gap-4">
            {(Object.entries(AVATAR_DEFS) as [AvatarType, typeof AVATAR_DEFS[AvatarType]][]).map(([key, def]) => {
              const active = selected === key;
              return (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelected(key)}
                  className="p-5 flex flex-col items-center gap-3 transition-all relative"
                  style={{
                    background: active ? `${def.color}12` : "#1C1E1C",
                    border: `2px solid ${active ? def.color : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <div style={{
                    width: 96, height: 96, borderRadius: "50%",
                    overflow: "hidden",
                    border: `3px solid ${active ? def.color : "rgba(255,255,255,0.12)"}`,
                    background: "white",
                    flexShrink: 0,
                    transition: "border-color 0.2s",
                  }}>
                    <img src={key === "erzfuchs" ? foxAvatarErzfuchs : foxAvatar} alt={def.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%" }} />
                  </div>
                  <div className="text-center">
                    <div
                      className="font-display font-bold uppercase text-sm tracking-wider"
                      style={{ color: def.color }}
                    >
                      {def.name}
                    </div>
                    <div className="flex flex-col items-center gap-1.5 mt-2">
                    <span
                      className="font-display font-black uppercase tracking-widest text-sm px-3 py-1"
                      style={{
                        background: `${def.color}18`,
                        border: `1.5px solid ${def.color}`,
                        color: def.color,
                        letterSpacing: "0.18em",
                      }}
                    >
                      {def.desc.split(" · ")[0]}
                    </span>
                    <span className="font-code text-xs text-muted-foreground leading-tight opacity-70">
                      {def.desc.split(" · ")[1]}
                    </span>
                  </div>
                  </div>
                  {active && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: def.color }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        <motion.button
          whileHover={canGo ? { scale: 1.02 } : {}}
          whileTap={canGo ? { scale: 0.97 } : {}}
          onClick={() => canGo && onStart(name.trim(), selected!)}
          disabled={!canGo}
          className="w-full py-4 font-display font-black uppercase text-xl tracking-[0.15em] transition-all"
          style={{
            background: canGo ? "#FEE600" : "#1C1E1C",
            color: canGo ? "#121414" : "#A8ABA7",
            cursor: canGo ? "pointer" : "not-allowed",
            border: `1px solid ${canGo ? "#FEE600" : "rgba(255,255,255,0.08)"}`,
          }}
        >
          {canGo ? "LOS GEHT`S →" : "Spiel starten"}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// GAME SCREEN
// ─────────────────────────────────────────────────────────────

interface Marker {
  id: number;        // 1, 2, 3
  x: number;         // 0–100 % of image width
  y: number;         // 0–100 % of image height
  zoneId: string | null;
}

function GameScreen({
  image,
  gameId,
  taskIndex,
  round,
  onRoundEnd,
}: {
  image: GameImage;
  gameId: string;
  taskIndex: number;
  round: number;
  onRoundEnd: (result: RoundResult) => void;
}) {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [taskData, setTaskData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(image.timeLimit);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const doneRef = useRef(false);
  const markersRef = useRef<Marker[]>([]);
  markersRef.current = markers;

  // Load task data from API on mount
  useEffect(() => {
    (async () => {
      try {
        const task = await api.getTask(gameId, taskIndex);
        setTaskData(task);
        setTimeLeft(task.timeLimitSeconds);
        console.log("📸 Loaded task:", task.imageUrl);
      } catch (err) {
        console.error("Failed to load task:", err);
      }
    })();
  }, [gameId, taskIndex]);

  // Use real image URL from API if available, otherwise use mock
  const displayImageUrl = taskData?.imageUrl ? `http://localhost:3001${taskData.imageUrl}` : image.src;

  // Find which zone a point falls in, ignoring zones already claimed by other markers
  function findZone(x: number, y: number, excludeMarkerId?: number): string | null {
    const used = new Set(
      markersRef.current
        .filter(m => m.id !== excludeMarkerId)
        .map(m => m.zoneId)
        .filter(Boolean) as string[]
    );
    for (const zone of image.zones) {
      if (!used.has(zone.id) && pointInPoly(x, y, zone.pts)) return zone.id;
    }
    return null;
  }

  const endRound = useCallback(
    async (tl: number) => {
      if (doneRef.current) return;
      doneRef.current = true;
      const ms = markersRef.current;

      try {
        // Call API to finish task and get score/resolution
        const finishResponse = await api.finishTask(gameId, taskIndex, tl, false);
        const foundZoneIds = finishResponse.resolution.areas.filter(a => a.found).map(a => a.id);
        const found = foundZoneIds.length;
        const misses = ms.filter(m => !m.zoneId).length;

        onRoundEnd({
          score: finishResponse.score,
          found,
          total: image.zones.length,
          misses,
          timeLeft: tl,
          timeLimit: image.timeLimit,
          foundZoneIds,
          markerPositions: ms.map(m => ({ id: m.id, x: m.x, y: m.y })),
          resolution: finishResponse.resolution // Store real resolution from API
        });
      } catch (err) {
        console.error("Failed to finish task:", err);
        // Fallback to local calculation
        const foundZoneIds = [...new Set(ms.map(m => m.zoneId).filter(Boolean) as string[])];
        const found = foundZoneIds.length;
        const misses = ms.filter(m => !m.zoneId).length;
        const score = calcScore(found, image.zones.length, tl, image.timeLimit, misses, image.zones.length);
        onRoundEnd({ score, found, total: image.zones.length, misses, timeLeft: tl, timeLimit: image.timeLimit, foundZoneIds, markerPositions: ms.map(m => ({ id: m.id, x: m.x, y: m.y })) });
      }
    },
    [image, gameId, taskIndex, onRoundEnd]
  );

  // Timer
  useEffect(() => {
    if (doneRef.current) return;
    if (timeLeft <= 0) { endRound(0); return; }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, endRound]);

  // ── pointer handlers on the overlay div ──────────────────────

  function getRelativePos(e: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  }

  function handleOverlayMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const { x, y } = getRelativePos(e);
    setCursor({ x, y });
  }

  async function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (doneRef.current || draggingId !== null) return;
    if (markers.length >= image.zones.length) return;

    const { x, y } = getRelativePos(e);
    const id = markers.length + 1;

    try {
      // Send click to backend for validation
      const result = await api.attempt(gameId, taskIndex, x / 100, y / 100);

      // Add marker locally (always, even if miss - for UI feedback)
      const zoneId = result.result === "hit" ? result.areaId : null;
      const updated = [...markersRef.current, { id, x, y, zoneId }];
      markersRef.current = updated;
      setMarkers(updated);

      // Optional: Show feedback based on result
      if (result.result === "hit") {
        console.log("✅ Hit!", result.explanation);
      } else if (result.result === "miss") {
        console.log("❌ Miss");
      }
    } catch (err) {
      console.error("Click attempt failed:", err);
    }
  }

  function handleMarkerPointerDown(e: React.PointerEvent<HTMLDivElement>, markerId: number) {
    if (doneRef.current) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingId(markerId);
  }

  function handleMarkerPointerMove(e: React.PointerEvent<HTMLDivElement>, markerId: number) {
    if (draggingId !== markerId) return;
    const container = e.currentTarget.parentElement!;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    const zoneId = findZone(x, y, markerId);
    const updated = markersRef.current.map(m => m.id === markerId ? { ...m, x, y, zoneId } : m);
    markersRef.current = updated;
    setMarkers(updated);
    setCursor({ x, y });
  }

  function handleMarkerPointerUp() {
    setDraggingId(null);
  }

  // Derived counts
  const foundCount = new Set(markers.map(m => m.zoneId).filter(Boolean)).size;
  const ratio = timeLeft / image.timeLimit;
  const timerColor = ratio > 0.5 ? "#00FF41" : ratio > 0.25 ? "#FEE600" : "#FF4444";
  const timerPulse = ratio <= 0.25;
  const canPlaceMore = markers.length < image.zones.length && !doneRef.current;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background flex flex-col"
    >
      {/* Top bar */}
      {/* Top bar */}
      <div className="shrink-0 flex justify-center pt-3 pb-0 px-8" style={{ background: "#121414" }}>
        <div
          className="flex items-center justify-between w-full max-w-4xl px-6 py-2"
          style={{
            background: "rgba(254,230,0,0.04)",
            border: "1px solid rgba(254,230,0,0.2)",
          }}
        >
          {/* Timer */}
          <div className="flex flex-col items-center flex-1">
            <span className="font-code text-sm tracking-widest text-muted-foreground">
              RUNDE {round}/{TOTAL_ROUNDS} — {image.level.toUpperCase()}
            </span>
            <motion.div
              animate={timerPulse ? { scale: [1, 1.06, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.6 }}
              className="flex items-center gap-1.5 mt-0.5"
            >
              <Clock size={15} style={{ color: timerColor }} />
              <span className="font-display font-black text-3xl" style={{ color: timerColor }}>
                {fmtTime(timeLeft)}
              </span>
            </motion.div>
          </div>

          {/* Markers placed */}
          <div className="flex items-center gap-3">
            <span className="font-code text-sm text-muted-foreground tracking-widest">MARKIERUNGEN GESETZT</span>
            <div className="flex gap-2">
              {Array.from({ length: image.zones.length }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: i < markers.length ? "#FEE600" : "transparent",
                    border: "1.5px solid rgba(254,230,0,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 800,
                    color: "#121414",
                    transition: "background 0.2s",
                  }}
                >
                  {i < markers.length ? i + 1 : ""}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Title */}

      {/* Info box — only on round 1 */}
      {round === 1 && (
        <div className="shrink-0 flex justify-center px-8 pt-4 pb-0" style={{ background: "#121414" }}>
          <div
            className="flex items-start gap-3 w-full max-w-4xl px-4 py-3"
            style={{ background: "rgba(138,43,226,0.06)", border: "1px solid rgba(138,43,226,0.35)" }}
          >
            <Info size={14} style={{ color: "#8A2BE2", marginTop: 1, flexShrink: 0 }} />
            <p className="font-code text-sm leading-relaxed font-[Titillium_Web]" style={{ color: "#A8ABA7" }}>
              <span className="font-bold" style={{ color: "#8A2BE2" }}>SO GEHT'S: </span>
              Klicke auf verdächtige Stellen im Bild, um Markierungen zu setzen. Du kannst bis zu {image.zones.length} Bereiche markieren und diese vor Ablauf des Timers verschieben. Klicke auf <span style={{ color: "#FEE600" }}>FERTIG</span>, wenn du alle Anomalien gefunden hast.
            </p>
          </div>
        </div>
      )}

      {/* Image canvas */}
      <div className="flex-1 flex items-center justify-center min-h-0 px-[30px] py-[4px]" style={{ maxHeight: "54vh" }}>
        <div className="relative w-full" style={{ maxWidth: "min(81vh, 896px)" }}>
          <div style={{ paddingBottom: "66.67%", position: "relative" }}>

            {/* Image */}
            <img
              src={displayImageUrl}
              alt={image.title}
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
              style={{ border: "1px solid rgba(254,230,0,0.15 font-[Sora])" }}
            />

            {/* SVG: no live feedback during play */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none" />

            {/* Interaction overlay: cursor + markers */}
            <div
              className="absolute inset-0"
              style={{ cursor: "none" }}
              onClick={handleOverlayClick}
              onMouseMove={handleOverlayMouseMove}
              onMouseLeave={() => { setCursor(null); setDraggingId(null); }}
            >
              {/* Dashed selection cursor circle */}
              {cursor && draggingId === null && (
                <div
                  className="pointer-events-none"
                  style={{
                    position: "absolute",
                    left: `${cursor.x}%`,
                    top: `${cursor.y}%`,
                    transform: "translate(-50%, -50%)",
                    width: 110,
                    height: 110,
                    borderRadius: "50%",
                    border: `1.5px dashed ${canPlaceMore ? "#FEE600" : "rgba(254,230,0,0.3)"}`,
                    boxShadow: canPlaceMore ? "0 0 14px rgba(254,230,0,0.25)" : "none",
                    transition: "border-color 0.15s",
                  }}
                >
                  {/* crosshair lines */}
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 18, height: 1.5, background: canPlaceMore ? "#FEE600" : "rgba(254,230,0,0.3)" }} />
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 1.5, height: 18, background: canPlaceMore ? "#FEE600" : "rgba(254,230,0,0.3)" }} />
                </div>
              )}

              {/* Placed markers — neutral yellow during play, no hit/miss feedback */}
              {markers.map(marker => {
                const isDragging = draggingId === marker.id;
                return (
                  <div
                    key={marker.id}
                    onPointerDown={e => handleMarkerPointerDown(e, marker.id)}
                    onPointerMove={e => handleMarkerPointerMove(e, marker.id)}
                    onPointerUp={handleMarkerPointerUp}
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: "absolute",
                      left: `${marker.x}%`,
                      top: `${marker.y}%`,
                      transform: "translate(-50%, -50%)",
                      width: 120,
                      height: 120,
                      borderRadius: "50%",
                      background: "transparent",
                      border: "1.5px dashed #FEE600",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: isDragging ? "grabbing" : "grab",
                      boxShadow: isDragging ? "0 0 18px rgba(254,230,0,0.5)" : "0 0 10px rgba(254,230,0,0.3)",
                      userSelect: "none",
                      zIndex: isDragging ? 20 : 10,
                      transition: isDragging ? "none" : "box-shadow 0.2s",
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: "#FEE600", color: "#121414",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: "bold",
                      pointerEvents: "none", flexShrink: 0,
                    }}>
                      {marker.id}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Anomaly count bar + Fertig button */}
      <div
        className="shrink-0 flex items-center justify-between px-[500px] pt-[8px] pb-[10px]"
        style={{ background: "#121414" }}
      >
        <span className="font-code text-sm font-bold tracking-widest px-4 py-2" style={{ color: "#FEE600", border: "1px solid rgba(254,230,0,0.4)" }}>
          {image.zones.length} ANOMALIEN ZU FINDEN
        </span>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => endRound(timeLeft)}
          className="font-display font-black uppercase tracking-widest"
          style={{
            background: "#FEE600",
            color: "#121414",
            fontSize: 18,
            padding: "12px 36px",
            border: "none",
            cursor: "pointer",
          }}
        >
          FERTIG →
        </motion.button>
      </div>

      {/* Hint bar */}
      <div
        className="px-6 py-1 text-center shrink-0"
        style={{ borderTop: "1px solid rgba(254,230,0,0.08)" }}
      >
        <p className="font-code text-xs text-muted-foreground opacity-60">
          {markers.length < image.zones.length
            ? `MARKIERUNG ${markers.length + 1} SETZEN — VERSCHIEBEN JEDERZEIT MÖGLICH`
            : "ALLE MARKIERUNGEN GESETZT — VERSCHIEBEN ODER FERTIG KLICKEN"}
        </p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROUND RESULT SCREEN
// ─────────────────────────────────────────────────────────────

function RoundResultScreen({
  image,
  result,
  round,
  onNext,
  gameId,
  taskIndex,
}: {
  image: GameImage;
  result: RoundResult;
  round: number;
  onNext: () => void;
  gameId: string;
  taskIndex: number;
}) {
  const [taskData, setTaskData] = useState<any>(null);

  // Load task data and use real image URL
  useEffect(() => {
    (async () => {
      try {
        const task = await api.getTask(gameId, taskIndex);
        setTaskData(task);
      } catch (err) {
        console.error("Failed to load task:", err);
      }
    })();
  }, [gameId, taskIndex]);

  const displayImageUrl = taskData?.imageUrl ? `http://localhost:3001${taskData.imageUrl}` : image.src;
  const resolution = result.resolution?.areas || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background flex flex-col"
    >
      {/* Header */}
      <div
        className="px-6 py-4 shrink-0 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(254,230,0,0.15)", background: "#0E1010" }}
      >
        <div>
          <p className="font-code text-sm tracking-widest opacity-60" style={{ color: "#FEE600" }}>
            RUNDE {round}/{TOTAL_ROUNDS} — BERICHT
          </p>
          <h2 className="font-display font-black text-3xl uppercase tracking-tight text-foreground mt-0.5">
            {image.title}
          </h2>
        </div>
        <div className="text-right">
          <p className="font-code text-sm text-muted-foreground tracking-widest">RUNDEN-SCORE</p>
          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", delay: 0.15 }}
            className="font-display font-black text-5xl"
            style={{ color: "#FEE600" }}
          >
            {result.score}
          </motion.p>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Image */}
        <div className="flex-1 p-6 overflow-auto flex items-start">
          <div className="w-full">
            <div style={{ paddingBottom: "66.67%", position: "relative" }}>
              <img
                src={displayImageUrl}
                alt={image.title}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ border: "1px solid rgba(254,230,0,0.15)" }}
              />

              {/* Polygon overlays from real API resolution */}
              {resolution.map(area => {
                const col = area.found ? "#00FF41" : "#FF6400";
                const fill = area.found ? "rgba(0,255,65,0.18)" : "rgba(255,100,0,0.18)";
                const border = area.found ? `rgba(0,255,65,0.9)` : `rgba(255,100,0,0.9)`;
                const clipPath = `polygon(${area.polygon.map(([x, y]: [number, number]) => `${x * 100}% ${y * 100}%`).join(", ")})`;
                return (
                  <div key={area.id} className="absolute inset-0 pointer-events-none" style={{ clipPath, background: fill, filter: `drop-shadow(0 0 1.5px ${border}) drop-shadow(0 0 0.5px ${border})` }} />
                );
              })}

              {/* User's placed markers — identical to game screen (03) */}
              {result.markerPositions.map(m => (
                <div
                  key={`marker-${m.id}`}
                  style={{
                    position: "absolute",
                    left: `${m.x}%`,
                    top: `${m.y}%`,
                    transform: "translate(-50%, -50%)",
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    background: "transparent",
                    border: "1.5px dashed #FEE600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 10px rgba(254,230,0,0.3)",
                    pointerEvents: "none",
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "#FEE600", color: "#121414",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: "bold",
                    flexShrink: 0,
                  }}>
                    {m.id}
                  </div>
                </div>
              ))}

              {/* Zone numbered circles from real API resolution */}
              {resolution.map((area, i) => {
                const cx = area.polygon.reduce((s: number, [x]: [number, number]) => s + x, 0) / area.polygon.length * 100;
                const cy = area.polygon.reduce((s: number, [, y]: [number, number]) => s + y, 0) / area.polygon.length * 100;
                const col = area.found ? "#00FF41" : "#FF6400";
                return (
                  <div
                    key={area.id}
                    style={{
                      position: "absolute",
                      left: `${cx}%`,
                      top: `${cy}%`,
                      transform: "translate(-50%, -50%)",
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: col,
                      color: "#121414",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'Sora', sans-serif",
                      fontSize: 12,
                      fontWeight: 800,
                      border: "2px solid rgba(0,0,0,0.25)",
                      pointerEvents: "none",
                      zIndex: 2,
                    }}
                  >
                    {i + 1}
                  </div>
                );
              })}

            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div
          className="w-80 flex flex-col p-6 overflow-auto shrink-0"
          style={{ borderLeft: "1px solid rgba(254,230,0,0.12)" }}
        >
          <p className="font-code text-sm tracking-widest mb-4" style={{ color: "#FEE600" }}>
            ANOMALIE-BERICHT
          </p>

          <div className="space-y-3">
            {resolution.map((area, i) => {
              const col = area.found ? "#00FF41" : "#FF6400";
              return (
                <motion.div
                  key={area.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.12 }}
                  className="p-3"
                  style={{
                    background: area.found ? "rgba(0,255,65,0.05)" : "rgba(255,100,0,0.05)",
                    border: `1px solid ${col}40`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-1.5">
                    {/* Numbered circle */}
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%",
                      background: col, color: "#121414",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'Sora', sans-serif", fontSize: 11, fontWeight: 800,
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <span className="font-code text-sm font-bold" style={{ color: col }}>
                      Anomalie {i + 1}
                    </span>
                  </div>
                  <p className="font-code text-sm leading-relaxed text-muted-foreground pl-9">{area.explanation}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Stats */}
          <div
            className="mt-4 pt-4 space-y-2"
            style={{ borderTop: "1px solid rgba(254,230,0,0.12)" }}
          >
            {[
              ["Treffer", `${result.found}/${result.total}`],
              ["Fehlversuche", String(result.misses)],
              ["Zeit übrig", fmtTime(result.timeLeft)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between font-code text-sm">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-foreground font-bold">{v}</span>
              </div>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onNext}
            className="mt-4 w-full py-3 font-display font-black uppercase text-lg tracking-widest transition-all"
            style={{ background: "#FEE600", color: "#121414", cursor: "pointer" }}
          >
            {round < TOTAL_ROUNDS ? `NÄCHSTES BILD →` : "AUSWERTUNG →"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// FINAL SCREEN
// ─────────────────────────────────────────────────────────────

function FinalScreen({
  player,
  gameId,
  roundResults,
  onReplay,
}: {
  player: { name: string; avatar: AvatarType };
  gameId: string;
  roundResults: RoundResult[];
  onReplay: () => void;
}) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load summary from API
  useEffect(() => {
    (async () => {
      try {
        const data = await api.getSummary(gameId);
        setSummary(data);
      } catch (err) {
        console.error("Failed to load summary:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [gameId]);

  const totalScore = summary?.totalScore ?? roundResults.reduce((s, r) => s + r.score, 0);
  const totalFound = summary?.totalHits ?? roundResults.reduce((s, r) => s + r.found, 0);
  const totalZones = roundResults.reduce((s, r) => s + r.total, 0);

  const board = [...MOCK_BOARD, { name: player.name, avatar: player.avatar, score: totalScore }].sort(
    (a, b) => b.score - a.score
  );
  const rank = board.findIndex(e => e.name === player.name && e.score === totalScore) + 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background p-8 overflow-auto"
    >
      <div className="max-w-2xl mx-auto">
        {/* Player header */}
        <div className="flex items-center gap-4 mb-8">
          <FoxIcon type={player.avatar} size={72} />
          <div>
            <p className="font-code text-xs tracking-widest opacity-60" style={{ color: "#FEE600" }}>
              ANALYSE ABGESCHLOSSEN
            </p>
            <h2 className="font-display font-black text-4xl uppercase tracking-tight text-foreground">
              {player.name}
            </h2>
            <p className="font-code text-xs mt-0.5" style={{ color: AVATAR_DEFS[player.avatar].color }}>
              {AVATAR_DEFS[player.avatar].name}
            </p>
          </div>
        </div>

        {/* Score hero */}
        <div
          className="p-6 text-center mb-6"
          style={{ border: "1px solid rgba(254,230,0,0.25)", background: "rgba(254,230,0,0.04)" }}
        >
          <p className="font-code text-sm tracking-widest text-muted-foreground mb-1">GESAMTPUNKTZAHL</p>
          <motion.p
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", delay: 0.2, stiffness: 180 }}
            className="font-display font-black leading-none"
            style={{ fontSize: "clamp(4rem,12vw,7rem)", color: "#FEE600" }}
          >
            {totalScore}
          </motion.p>
          <p className="font-code text-sm text-muted-foreground mt-2">
            {totalFound}/{totalZones} Anomalien entdeckt
          </p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="font-display font-bold text-2xl text-foreground mt-2"
          >
            RANG #{rank}{" "}
            <span className="font-code text-sm text-muted-foreground">von {board.length} Spieler:innen</span>
          </motion.p>
        </div>

        {/* Per-round breakdown */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {roundResults.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="p-4 text-center"
              style={{ background: "#1C1E1C", border: "1px solid rgba(254,230,0,0.12)" }}
            >
              <p className="font-code text-xs text-muted-foreground">RUNDE {i + 1}</p>
              <p className="font-display font-black text-3xl text-foreground mt-1">{r.score}</p>
              <p className="font-code text-xs text-muted-foreground">
                {r.found}/{r.total} Treffer
              </p>
              <div className="mt-2 h-1" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div
                  className="h-full transition-all"
                  style={{ width: `${(r.score / 1000) * 100}%`, background: "#FEE600" }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Leaderboard */}
        <div className="mb-6" style={{ border: "1px solid rgba(254,230,0,0.12)" }}>
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: "1px solid rgba(254,230,0,0.12)", background: "#1C1E1C" }}
          >
            <Trophy size={14} style={{ color: "#FEE600" }} />
            <span className="font-code text-xs tracking-widest" style={{ color: "#FEE600" }}>
              LEADERBOARD
            </span>
          </div>
          {board.slice(0, 6).map((entry, i) => {
            const isMe = entry.name === player.name && entry.score === totalScore;
            const rankColors = ["#FEE600", "#C0C0C0", "#CD7F32"];
            return (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{
                  borderBottom: i < 5 ? "1px solid rgba(254,230,0,0.06)" : undefined,
                  background: isMe ? "rgba(254,230,0,0.08)" : undefined,
                }}
              >
                <span
                  className="font-display font-black text-xl w-7 text-center"
                  style={{ color: rankColors[i] ?? "#A8ABA7" }}
                >
                  {i + 1}
                </span>
                <FoxIcon type={entry.avatar} size={30} />
                <span
                  className="font-code text-sm flex-1 truncate"
                  style={{ color: isMe ? "#FEE600" : "#E0E0D8" }}
                >
                  {entry.name}
                  {isMe && <span className="ml-2 text-xs opacity-60">← DU</span>}
                </span>
                <span className="font-display font-bold text-xl text-foreground">{entry.score}</span>
              </div>
            );
          })}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onReplay}
          className="w-full py-4 font-display font-black uppercase text-xl tracking-widest flex items-center justify-center gap-2"
          style={{ background: "#FEE600", color: "#121414" }}
        >
          <RotateCcw size={18} />
          ERNEUT VERSUCHEN
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// ADMIN SCREEN
// ─────────────────────────────────────────────────────────────

function AdminScreen({ onBack }: { onBack: () => void }) {
  const board = [...MOCK_BOARD].sort((a, b) => b.score - a.score);
  const rankColors = ["#FEE600", "#C0C0C0", "#CD7F32"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background p-8 overflow-auto"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-code text-xs tracking-widest opacity-60" style={{ color: "#FEE600" }}>
              ADMIN MODUL // GESICHERT
            </p>
            <h2 className="font-display font-black text-5xl uppercase tracking-tight text-foreground mt-1">
              KONTROLLE
            </h2>
          </div>
          <button
            onClick={onBack}
            className="font-code text-sm tracking-widest text-muted-foreground px-4 py-2 transition-all"
            style={{ border: "1px solid rgba(254,230,0,0.2)" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#FEE600";
              (e.currentTarget as HTMLButtonElement).style.color = "#FEE600";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(254,230,0,0.2)";
              (e.currentTarget as HTMLButtonElement).style.color = "#A8ABA7";
            }}
          >
            ← ZURÜCK
          </button>
        </div>

        {/* Leaderboard */}
        <div className="mb-8" style={{ border: "1px solid rgba(254,230,0,0.15)" }}>
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ background: "#1C1E1C", borderBottom: "1px solid rgba(254,230,0,0.15)" }}
          >
            <Trophy size={14} style={{ color: "#FEE600" }} />
            <span className="font-code text-xs tracking-widest" style={{ color: "#FEE600" }}>
              BESTENLISTE — ALLE SPIELER
            </span>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(254,230,0,0.1)" }}>
                {["RANG", "AVATAR", "OPERATOR", "KLASSE", "PUNKTE"].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-code text-xs text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {board.map((e, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: i < board.length - 1 ? "1px solid rgba(254,230,0,0.06)" : undefined }}
                >
                  <td className="px-4 py-3">
                    <span
                      className="font-display font-black text-xl"
                      style={{ color: rankColors[i] ?? "#A8ABA7" }}
                    >
                      #{i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <FoxIcon type={e.avatar} size={32} />
                  </td>
                  <td className="px-4 py-3 font-code text-sm text-foreground">{e.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className="font-code text-xs px-2 py-0.5 uppercase tracking-widest"
                      style={{
                        color: AVATAR_DEFS[e.avatar].color,
                        border: `1px solid ${AVATAR_DEFS[e.avatar].color}50`,
                      }}
                    >
                      {AVATAR_DEFS[e.avatar].name}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-display font-bold text-xl text-foreground">{e.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Image management */}
        <div style={{ border: "1px solid rgba(138,43,226,0.4)", background: "rgba(138,43,226,0.05)" }}>
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: "1px solid rgba(138,43,226,0.3)", background: "rgba(138,43,226,0.08)" }}
          >
            <Info size={14} style={{ color: "#8A2BE2" }} />
            <span className="font-code text-xs tracking-widest" style={{ color: "#8A2BE2" }}>
              BILD-VERWALTUNG — MOCK-DATEN
            </span>
          </div>
          <div className="p-4 grid grid-cols-3 gap-3">
            {GAME_IMAGES.map(img => (
              <div
                key={img.id}
                className="overflow-hidden"
                style={{ border: "1px solid rgba(254,230,0,0.12)" }}
              >
                <img src={img.src} alt={img.title} className="w-full h-24 object-cover" />
                <div className="p-2">
                  <p className="font-code text-xs text-muted-foreground truncate">{img.id}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className="font-code text-xs uppercase tracking-wider"
                      style={{ color: "#FEE600" }}
                    >
                      {img.level}
                    </span>
                    <span className="font-code text-xs text-muted-foreground">
                      {img.zones.length} Zonen · {img.timeLimit}s
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <span
                      className="font-code text-xs px-1.5 py-0.5"
                      style={{ background: "rgba(0,255,65,0.1)", color: "#00FF41", border: "1px solid rgba(0,255,65,0.3)" }}
                    >
                      PUBLISHED
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 pb-4">
            <p className="font-code text-xs text-muted-foreground opacity-60">
              Bildverwaltung, Anomalie-Editor und Einstellungen werden in Phase 2 implementiert.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// DEV CONSOLE
// ─────────────────────────────────────────────────────────────

const MOCK_PLAYER = { name: "TESTFUCHS", avatar: "erzfuchs" as AvatarType };
const MOCK_RESULTS: RoundResult[] = [
  { score: 820, found: 3, total: 3, misses: 0, timeLeft: 42, timeLimit: 90, foundZoneIds: ["z1", "z2", "z3"], markerPositions: [{ id: 1, x: 18, y: 26 }, { id: 2, x: 65, y: 62 }, { id: 3, x: 79, y: 20 }] },
  { score: 610, found: 2, total: 3, misses: 1, timeLeft: 18, timeLimit: 65, foundZoneIds: ["z4", "z5"],       markerPositions: [{ id: 1, x: 20, y: 40 }, { id: 2, x: 72, y: 71 }, { id: 3, x: 50, y: 10 }] },
  { score: 390, found: 1, total: 3, misses: 2, timeLeft: 5,  timeLimit: 45, foundZoneIds: ["z7"],             markerPositions: [{ id: 1, x: 30, y: 40 }, { id: 2, x: 66, y: 50 }, { id: 3, x: 40, y: 77 }] },
];

function DevConsole({
  currentScreen,
  onJump,
}: {
  currentScreen: Screen;
  onJump: (screen: Screen, round?: number) => void;
}) {
  const [open, setOpen] = useState(false);

  const SCREENS: { id: Screen; label: string; sub?: string }[] = [
    { id: "start",        label: "01 START",        sub: "Startseite" },
    { id: "avatar",       label: "02 AVATAR",       sub: "Profil erstellen" },
    { id: "game",         label: "03 SPIEL R1",     sub: "Runde 1 · Easy" },
    { id: "round-result", label: "04 ERGEBNIS",     sub: "Rundenauswertung" },
    { id: "final",        label: "05 AUSWERTUNG",   sub: "Gesamtergebnis" },
    { id: "admin",        label: "06 ADMIN",        sub: "Kontrolle" },
  ];

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999 }}>
      {/* Toggle button */}
      <button className="font-[Share_Tech_Mono]"
        onClick={() => setOpen(o => !o)}
        style={{
          background: open ? "#FEE600" : "#1C1E1C",
          color: open ? "#121414" : "#FEE600",
          border: "1px solid #FEE600",
          fontFamily: "'Sora', sans-serif",
          fontSize: 13,
          letterSpacing: "0.2em",
          padding: "6px 14px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 0 16px rgba(254,230,0,0.25)",
          marginLeft: "auto",
        }}
      >
        <span style={{ fontSize: 13 }}>{open ? "✕" : "⌥"}</span>
        DEV CONSOLE
      </button>

      {/* Panel */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          style={{
            background: "#0E1010",
            border: "1px solid rgba(254,230,0,0.35)",
            marginTop: 8,
            width: 240,
            boxShadow: "0 0 32px rgba(254,230,0,0.12)",
          }}
        >
          {/* Header */}
          <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(254,230,0,0.15)" }}>
            <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 12, color: "#FEE600", letterSpacing: "0.3em", opacity: 0.7 }}>
              SCREEN NAVIGATOR
            </p>
            <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 13, color: "#A8ABA7", letterSpacing: "0.15em", marginTop: 2 }}>
              AKTIV → {currentScreen.toUpperCase()}
            </p>
          </div>

          {/* Screen list */}
          <div style={{ padding: "6px 0" }}>
            {SCREENS.map(s => {
              const active = currentScreen === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => { onJump(s.id); }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 12px",
                    background: active ? "rgba(254,230,0,0.1)" : "transparent",
                    border: "none",
                    borderLeft: `2px solid ${active ? "#FEE600" : "transparent"}`,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 13, color: active ? "#FEE600" : "#A8ABA7", letterSpacing: "0.1em", flex: 1 }}>
                    {s.label}
                  </span>
                  <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 13, color: "#A8ABA7", opacity: 0.5 }}>
                    {s.sub}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Round selector for game screen */}
          <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(254,230,0,0.1)" }}>
            <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 13, color: "#A8ABA7", letterSpacing: "0.2em", marginBottom: 6 }}>
              SPIEL-RUNDE
            </p>
            <div style={{ display: "flex", gap: 6 }}>
              {[1, 2, 3].map(r => (
                <button
                  key={r}
                  onClick={() => onJump("game", r - 1)}
                  style={{
                    flex: 1,
                    padding: "5px 0",
                    background: currentScreen === "game" ? "rgba(254,230,0,0.08)" : "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(254,230,0,0.25)",
                    color: "#FEE600",
                    fontFamily: "'Sora', sans-serif",
                    fontSize: 13,
                    cursor: "pointer",
                    letterSpacing: "0.1em",
                  }}
                >
                  R{r}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: "6px 12px 10px", borderTop: "1px solid rgba(254,230,0,0.1)" }}>
            <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 13, color: "#A8ABA7", opacity: 0.4, letterSpacing: "0.15em" }}>
              PROTOTYPE DEV TOOL — NICHT FÜR PRODUKTION
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [player, setPlayer] = useState<{ name: string; avatar: AvatarType } | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [taskCount, setTaskCount] = useState(TOTAL_ROUNDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResolution, setLastResolution] = useState<any>(null);

  async function handleStartGame(name: string, avatar: AvatarType) {
    setLoading(true);
    setError(null);
    try {
      const response = await api.startGame(name, avatar);
      setPlayer({ name, avatar });
      setGameId(response.gameId);
      setTaskCount(response.taskCount);
      setCurrentRound(0);
      setRoundResults([]);
      setScreen("game");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  function handleRoundEnd(result: RoundResult) {
    setRoundResults(prev => [...prev, result]);
    setScreen("round-result");
  }

  function handleNext() {
    if (currentRound + 1 >= taskCount) {
      setScreen("final");
    } else {
      setCurrentRound(r => r + 1);
      setScreen("game");
    }
  }

  function handleReplay() {
    setScreen("start");
    setPlayer(null);
    setGameId(null);
    setCurrentRound(0);
    setRoundResults([]);
    setError(null);
  }

  // Dev console jump — injects mock data so every screen is previewable
  function handleDevJump(target: Screen, round = 0) {
    setCurrentRound(round);
    if (target === "game") {
      setPlayer(MOCK_PLAYER);
      setGameId("mock-game-id");
      setRoundResults([]);
      setScreen("game");
    } else if (target === "round-result") {
      setPlayer(MOCK_PLAYER);
      setRoundResults([MOCK_RESULTS[0]]);
      setCurrentRound(0);
      setScreen("round-result");
    } else if (target === "final") {
      setPlayer(MOCK_PLAYER);
      setGameId("mock-game-id");
      setRoundResults(MOCK_RESULTS);
      setScreen("final");
    } else if (target === "avatar") {
      setScreen("avatar");
    } else {
      setScreen(target);
    }
  }

  const currentImage = gameId ? GAME_IMAGES[currentRound % GAME_IMAGES.length] : GAME_IMAGES[0];

  return (
    <div className="size-full">
      <AnimatePresence mode="wait">
        {screen === "start" && (
          <StartScreen key="start" onStart={() => setScreen("avatar")} onAdmin={() => setScreen("admin")} />
        )}
        {screen === "avatar" && <AvatarScreen key="avatar" onStart={handleStartGame} />}
        {error && screen === "avatar" && (
          <div className="fixed top-4 left-4 bg-red-500 text-white p-4 rounded">{error}</div>
        )}
        {screen === "game" && gameId && (
          <GameScreen key={`game-${currentRound}`} image={currentImage} gameId={gameId} taskIndex={currentRound} round={currentRound + 1} onRoundEnd={handleRoundEnd} />
        )}
        {screen === "round-result" && roundResults.length > 0 && gameId && (
          <RoundResultScreen
            key={`result-${currentRound}`}
            image={GAME_IMAGES[currentRound % GAME_IMAGES.length]}
            result={roundResults[roundResults.length - 1]}
            round={currentRound + 1}
            onNext={handleNext}
            gameId={gameId}
            taskIndex={currentRound}
          />
        )}
        {screen === "final" && player && gameId && (
          <FinalScreen key="final" player={player} gameId={gameId} roundResults={roundResults} onReplay={handleReplay} />
        )}
        {screen === "admin" && <AdminScreen key="admin" onBack={() => setScreen("start")} />}
      </AnimatePresence>

      <DevConsole currentScreen={screen} onJump={handleDevJump} />
    </div>
  );
}
