import fuchsYoga from '@/assets/fuchs_yoga_rgb_schatten.png'
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import foxHero from "@/imports/image-2.png";
import avatarJungfuchs from "@/assets/icon_fuchs_laugh_shadow.png";
import avatarWaldfuchs from "@/assets/icon_fuchs_regular_shadow.png";
import avatarErzfuchs from "@/assets/icon_fuchs_idea_shadow.png";
import { Clock, Target, X, Check, RotateCcw, ChevronRight, Crosshair, AlertTriangle, Info, Trash2 } from "lucide-react";
import { ScoreScreen } from "./screens/admin/ScoreScreen";
import { ImagesScreen } from "./screens/admin/ImagesScreen";
import { api } from "../api";
import { FoxIcon, AVATAR_DEFS, type AvatarType } from "./components/FoxIcon";
import { TruncatedLeaderboard } from "./screens/leaderboard/TruncatedLeaderboard";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type Screen = "start" | "avatar" | "rules" | "game" | "round-result" | "final" | "admin";
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
  resolution?: any;
  imageUrl?: string;
}


interface AdminCatalogImage {
  id: string;
  title: string;
  image_path: string;
  category: string;
  status: string;
  time_limit_seconds: number;
  max_wrong_attempts: number;
  anomalyAreas: { id: string }[];
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

function StartScreen({ onStart }: { onStart: () => void }) {
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
            <img src={fuchsYoga} alt="Fuchs Maskottchen" className="w-44 h-44 object-contain" />
          </div>
        </motion.div>

        <p className="font-code text-muted-foreground mb-8 leading-relaxed max-w-sm mx-auto text-[15px]">
          Entdecke KI-Anomalien in synthetischen Bildern.
          <br />
          Findest Du alle Fehler?
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

function AvatarScreen({
  onStart,
  error,
  onErrorClear,
}: {
  onStart: (name: string, avatar: AvatarType) => void;
  error?: string | null;
  onErrorClear?: () => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<AvatarType>("waldfuchs");
  const canGo = name.trim().length > 0;
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error) nameRef.current?.focus();
  }, [error]);

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
            ref={nameRef}
            id="playerName"
            type="text"
            value={name}
            onChange={e => {
              setName(e.target.value);
              if (error) onErrorClear?.();
            }}
            placeholder="CODENAME EINGEBEN..."
            maxLength={30}
            className="w-full py-3 px-4 font-code text-base text-foreground tracking-wider focus:outline-none placeholder:opacity-30"
            style={{
              background: "#1C1E1C",
              border: `1px solid ${error ? "#ef4444" : "rgba(254,230,0,0.2)"}`,
              caretColor: "#FEE600",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "#FEE600")}
            onBlur={e => (e.currentTarget.style.borderColor = error ? "#ef4444" : "rgba(254,230,0,0.2)")}
          />
          {error && (
            <p className="font-code text-xs mt-1.5" style={{ color: "#ef4444" }}>{error}</p>
          )}
        </div>

        {/* Avatar selection */}
        <div className="mb-8">
          <label className="font-code text-xs tracking-[0.25em] block mb-4" style={{ color: "#FEE600" }}>
            ERFAHRUNGS-KLASSE WÄHLEN
          </label>
          <div className="grid grid-cols-3 gap-4">
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
                    background: "transparent",
                    flexShrink: 0,
                    transition: "border-color 0.2s",
                  }}>
                    <img src={key === "erzfuchs" ? avatarErzfuchs : key === "jungfuchs" ? avatarJungfuchs : avatarWaldfuchs} alt={def.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: "8px" }} />
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
          {canGo ? "Los geht's!" : "Spiel starten"}
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
}

// ─────────────────────────────────────────────────────────────
// RULES SCREEN
// ─────────────────────────────────────────────────────────────

const RULES = [
  { icon: "🔍", title: "Anomalien finden", text: "Jedes Bild enthält mehrere KI-generierte Fehler. Klicke direkt auf die Stelle im Bild, die dir verdächtig vorkommt." },
  { icon: "⏱", title: "Zeit läuft", text: "Pro Bild hast du nur begrenzte Zeit. Je schneller du die Fehler entdeckst, desto mehr Punkte bekommst du." },
  { icon: "🎯", title: "Genauigkeit zählt", text: "Fehlklicks kosten Punkte. Klicke also nur, wenn du dir sicher bist – Qualität schlägt Quantität." },
  { icon: "🏁", title: "Drei Runden", text: "Das Spiel besteht aus drei Bildern. Nach jeder Runde siehst du dein Ergebnis. Am Ende gibt es eine Gesamtwertung." },
];

function RulesScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg flex flex-col gap-8"
      >
        {/* Header */}
        <div className="text-center">
          <p className="font-code text-xs tracking-[0.4em] text-muted-foreground mb-3" style={{ color: "#FEE600", opacity: 0.7 }}>
            SPIELREGELN
          </p>
          <h1 className="font-display font-black uppercase text-3xl tracking-widest" style={{ color: "#F5F5EB" }}>
            So geht's
          </h1>
        </div>

        {/* Rules list */}
        <div className="flex flex-col gap-3">
          {RULES.map((rule, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="flex gap-4 p-4"
              style={{ background: "#1C1E1C", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{rule.icon}</span>
              <div>
                <p className="font-display font-bold uppercase text-sm tracking-wider mb-1" style={{ color: "#FEE600" }}>
                  {rule.title}
                </p>
                <p className="font-code text-sm leading-relaxed" style={{ color: "#A8ABA7" }}>
                  {rule.text}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Start button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onStart}
          className="w-full py-4 font-display font-black uppercase tracking-[0.3em] text-base"
          style={{
            background: "#FEE600",
            color: "#121414",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 0 32px rgba(254,230,0,0.25)",
          }}
        >
          Los geht's →
        </motion.button>
      </motion.div>
    </div>
  );
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

  const displayImageUrl = taskData?.imageUrl ?? image.src;

  const endRound = useCallback(
    async (tl: number) => {
      if (doneRef.current) return;
      doneRef.current = true;
      const ms = markersRef.current;

      try {
        // Pass final marker positions to backend for authoritative evaluation
        const apiMarkers = ms.map(m => ({ x: m.x / 100, y: m.y / 100 }));
        const finishResponse = await api.finishTask(gameId, taskIndex, tl, false, apiMarkers);
        const areas = finishResponse.resolution.areas;
        const foundZoneIds = areas.filter(a => a.found).map(a => a.id);
        const found = foundZoneIds.length;
        const total = areas.length;
        const misses = ms.length - found;
        const timeLimitSec = taskData?.timeLimitSeconds ?? image.timeLimit;

        onRoundEnd({
          score: finishResponse.score,
          found,
          total,
          misses,
          timeLeft: tl,
          timeLimit: timeLimitSec,
          foundZoneIds,
          markerPositions: ms.map(m => ({ id: m.id, x: m.x, y: m.y })),
          resolution: finishResponse.resolution,
          imageUrl: taskData?.imageUrl,
        });
      } catch (err) {
        console.error("Failed to finish task:", err);
        const total = taskData?.totalAreas ?? image.zones.length;
        const timeLimitSec = taskData?.timeLimitSeconds ?? image.timeLimit;
        const score = calcScore(0, total, tl, timeLimitSec, ms.length, total);
        onRoundEnd({ score, found: 0, total, misses: ms.length, timeLeft: tl, timeLimit: timeLimitSec, foundZoneIds: [], markerPositions: ms.map(m => ({ id: m.id, x: m.x, y: m.y })) });
      }
    },
    [image, gameId, taskIndex, onRoundEnd, taskData]
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

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (doneRef.current || draggingId !== null) return;
    const totalAreas = taskData?.totalAreas ?? image.zones.length;
    if (markers.length >= totalAreas) return;

    const { x, y } = getRelativePos(e);
    const id = markers.length + 1;
    const updated = [...markersRef.current, { id, x, y }];
    markersRef.current = updated;
    setMarkers(updated);
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
    const updated = markersRef.current.map(m => m.id === markerId ? { ...m, x, y } : m);
    markersRef.current = updated;
    setMarkers(updated);
    setCursor({ x, y });
  }

  function handleMarkerPointerUp() {
    setDraggingId(null);
  }

  // Derived counts
  const totalAreas = taskData?.totalAreas ?? image.zones.length;
  const ratio = timeLeft / (taskData?.timeLimitSeconds ?? image.timeLimit);
  const timerColor = ratio > 0.5 ? "#00FF41" : ratio > 0.25 ? "#FEE600" : "#FF4444";
  const timerPulse = ratio <= 0.25;
  const canPlaceMore = markers.length < totalAreas && !doneRef.current;

  if (!taskData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="font-code text-sm tracking-widest text-muted-foreground animate-pulse">LADE BILD …</span>
      </div>
    );
  }

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
              {Array.from({ length: totalAreas }).map((_, i) => (
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
              Klicke auf verdächtige Stellen im Bild, um Markierungen zu setzen. Du kannst bis zu {totalAreas} Bereiche markieren und diese vor Ablauf des Timers verschieben. Klicke auf <span style={{ color: "#FEE600" }}>FERTIG</span>, wenn du alle Anomalien gefunden hast.
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
              data-testid="game-overlay"
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
                      background: "#FEE600",
                      position: "relative",
                      pointerEvents: "none", flexShrink: 0,
                    }}>
                      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 12, height: 1, background: "#121414" }} />
                      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 1, height: 12, background: "#121414" }} />
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
          {totalAreas} ANOMALIEN ZU FINDEN
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
          {markers.length < totalAreas
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
}: {
  image: GameImage;
  result: RoundResult;
  round: number;
  onNext: () => void;
}) {
  const displayImageUrl = result.imageUrl ?? image.src;
  const foundZoneIds = result.foundZoneIds || [];

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

              {/* Polygon overlays — real API resolution */}
              {result.resolution?.areas.map((area: any) => {
                const col = area.found ? "#00FF41" : "#FF6400";
                const fill = area.found ? "rgba(0,255,65,0.18)" : "rgba(255,100,0,0.18)";
                const clipPath = `polygon(${area.polygon.map((p: any) => `${(p.x * 100).toFixed(2)}% ${(p.y * 100).toFixed(2)}%`).join(", ")})`;
                return (
                  <div key={area.id} className="absolute inset-0 pointer-events-none" style={{ clipPath, background: fill, filter: `drop-shadow(0 0 1.5px ${col}) drop-shadow(0 0 0.5px ${col})` }} />
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
                    background: "#FEE600",
                    position: "relative",
                    flexShrink: 0,
                  }}>
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 12, height: 1, background: "#121414" }} />
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 1, height: 12, background: "#121414" }} />
                  </div>
                </div>
              ))}

              {/* Zone numbered circles — real API resolution */}
              {result.resolution?.areas.map((area: any, i: number) => {
                const col = area.found ? "#00FF41" : "#FF6400";
                const cx = area.polygon.reduce((s: number, p: any) => s + p.x, 0) / area.polygon.length * 100;
                const cy = area.polygon.reduce((s: number, p: any) => s + p.y, 0) / area.polygon.length * 100;
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
            {(result.resolution?.areas ?? []).map((area: any, i: number) => {
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
                      {area.found ? "GEFUNDEN" : "NICHT GEFUNDEN"}
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
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [summaryData, boardData] = await Promise.all([
          api.getSummary(gameId),
          api.getLeaderboard(),
        ]);
        setSummary(summaryData);
        setLeaderboard(boardData);
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
  const rank = summary?.rank ?? leaderboard.findIndex((e: any) => e.playerName === player.name) + 1;

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
            <span className="font-code text-sm text-muted-foreground">von {leaderboard.length} Spieler:innen</span>
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
        <div className="mb-6">
          <TruncatedLeaderboard scores={leaderboard} currentPlayerRank={rank} />
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

type AdminTab = "scores" | "images";

function AdminScreen({ onBack }: { onBack: () => void }) {
  const [authState, setAuthState] = useState<"login" | "main">("login");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("scores");

  async function login() {
    setLoginLoading(true);
    setLoginError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });
    setLoginLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setLoginError(body?.error ?? "Anmeldung fehlgeschlagen");
      return;
    }
    setAuthState("main");
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    setAuthState("login");
    setPassword("");
  }

  const TABS: { id: AdminTab; label: string; color: string }[] = [
    { id: "scores",  label: "BESTENLISTE", color: "#FEE600" },
    { id: "images",  label: "BILDER",      color: "#8A2BE2" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background p-8 overflow-auto"
    >
      <div className="max-w-5xl mx-auto">
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
          <div className="flex items-center gap-2">
            {authState === "main" && (
              <button
                onClick={logout}
                className="font-code text-xs tracking-widest text-muted-foreground px-3 py-2 transition-all"
                style={{ border: "1px solid rgba(255,80,80,0.25)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#FF5050"; (e.currentTarget as HTMLButtonElement).style.color = "#FF5050"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,80,80,0.25)"; (e.currentTarget as HTMLButtonElement).style.color = "#A8ABA7"; }}
              >
                ABMELDEN
              </button>
            )}
            <button
              onClick={onBack}
              className="font-code text-sm tracking-widest text-muted-foreground px-4 py-2 transition-all"
              style={{ border: "1px solid rgba(254,230,0,0.2)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#FEE600"; (e.currentTarget as HTMLButtonElement).style.color = "#FEE600"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(254,230,0,0.2)"; (e.currentTarget as HTMLButtonElement).style.color = "#A8ABA7"; }}
            >
              ← ZURÜCK
            </button>
          </div>
        </div>

        {/* Login */}
        {authState === "login" && (
          <div style={{ border: "1px solid rgba(254,230,0,0.2)" }}>
            <div className="px-4 py-3" style={{ background: "#1C1E1C", borderBottom: "1px solid rgba(254,230,0,0.15)" }}>
              <span className="font-code text-xs tracking-widest" style={{ color: "#FEE600" }}>ZUGANG // PASSWORT ERFORDERLICH</span>
            </div>
            <div className="p-6 flex flex-col gap-3 max-w-sm">
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setLoginError(null); }}
                onKeyDown={e => e.key === "Enter" && login()}
                placeholder="Passwort"
                className="font-code text-sm bg-transparent px-3 py-2 text-foreground outline-none"
                style={{ border: `1px solid ${loginError ? "#FF5050" : "rgba(254,230,0,0.25)"}` }}
                autoFocus
              />
              {loginError && <p className="font-code text-xs" style={{ color: "#FF5050" }}>{loginError}</p>}
              <button
                onClick={login}
                disabled={loginLoading || !password}
                className="font-code text-xs tracking-widest px-4 py-2 transition-all disabled:opacity-40"
                style={{ background: "rgba(254,230,0,0.1)", border: "1px solid #FEE600", color: "#FEE600" }}
              >
                {loginLoading ? "PRÜFE …" : "ANMELDEN →"}
              </button>
            </div>
          </div>
        )}

        {authState === "main" && (
          <>
            {/* Tab navigation */}
            <div className="flex gap-0 mb-6" style={{ borderBottom: "1px solid rgba(254,230,0,0.15)" }}>
              {TABS.map(tab => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="font-code text-xs tracking-widest px-6 py-3 transition-all"
                    style={{
                      color: active ? tab.color : "#A8ABA7",
                      borderBottom: active ? `2px solid ${tab.color}` : "2px solid transparent",
                      background: active ? `${tab.color}08` : "transparent",
                      marginBottom: -1,
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === "scores" && <ScoreScreen />}
            {activeTab === "images" && <ImagesScreen />}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// DEV CONSOLE
// ─────────────────────────────────────────────────────────────


declare const __BUILD_TIME__: string;

function DevConsole() {
  const d = new Date(__BUILD_TIME__);
  const label = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " · " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ position: "fixed", bottom: 12, right: 14, zIndex: 9999, pointerEvents: "none" }}>
      <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 11, color: "rgba(168,171,167,0.45)", letterSpacing: "0.12em" }}>
        BUILD {label}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>(
    window.location.pathname === "/admin" ? "admin" : "start"
  );
  const [player, setPlayer] = useState<{ name: string; avatar: AvatarType } | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [taskCount, setTaskCount] = useState(TOTAL_ROUNDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResolution, setLastResolution] = useState<any>(null);

  useEffect(() => {
    function onPopState() {
      setScreen(window.location.pathname === "/admin" ? "admin" : "start");
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigateTo(target: Screen) {
    const path = target === "admin" ? "/admin" : "/";
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    setScreen(target);
  }

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
      setScreen("rules");
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
    navigateTo("start");
    setPlayer(null);
    setGameId(null);
    setCurrentRound(0);
    setRoundResults([]);
    setError(null);
  }

  const currentImage = gameId ? GAME_IMAGES[currentRound % GAME_IMAGES.length] : GAME_IMAGES[0];

  return (
    <div className="size-full">
      <AnimatePresence mode="wait">
        {screen === "start" && (
          <StartScreen key="start" onStart={() => setScreen("avatar")} />
        )}
        {screen === "avatar" && (
          <AvatarScreen key="avatar" onStart={handleStartGame} error={error} onErrorClear={() => setError(null)} />
        )}
        {screen === "rules" && (
          <RulesScreen key="rules" onStart={() => setScreen("game")} />
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
          />
        )}
        {screen === "final" && player && gameId && (
          <FinalScreen key="final" player={player} gameId={gameId} roundResults={roundResults} onReplay={handleReplay} />
        )}
        {screen === "admin" && <AdminScreen key="admin" onBack={() => navigateTo("start")} />}
      </AnimatePresence>

      <DevConsole />
    </div>
  );
}
