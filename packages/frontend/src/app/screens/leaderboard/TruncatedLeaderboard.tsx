import { Trophy } from "lucide-react";
import { FoxIcon } from "../../components/FoxIcon";
import type { LeaderboardEntry } from "../../../api";
import { buildDisplayList, TOP_N } from "./buildDisplayList";

const RANK_COLORS = ["#FEE600", "#C0C0C0", "#CD7F32"];

interface Props {
  scores: LeaderboardEntry[];
  currentPlayerRank: number;
  topN?: number;
}

export function TruncatedLeaderboard({ scores, currentPlayerRank, topN = TOP_N }: Props) {
  const rows = buildDisplayList(scores, currentPlayerRank, topN);

  return (
    <div style={{ border: "1px solid rgba(254,230,0,0.12)" }}>
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: "1px solid rgba(254,230,0,0.12)", background: "#1C1E1C" }}
      >
        <Trophy size={14} style={{ color: "#FEE600" }} />
        <span className="font-code text-xs tracking-widest" style={{ color: "#FEE600" }}>
          LEADERBOARD
        </span>
        <span className="font-code text-xs text-muted-foreground ml-auto">
          {scores.length} SPIELER:INNEN
        </span>
      </div>

      {rows.map((row, i) => {
        const isLast = i === rows.length - 1;
        const borderStyle = !isLast ? "1px solid rgba(254,230,0,0.06)" : undefined;

        if (row.type === "placeholder") {
          return (
            <div
              key="placeholder"
              className="flex items-center justify-center py-2"
              style={{ borderBottom: borderStyle }}
            >
              <span
                className="font-code text-base tracking-[0.4em]"
                style={{ color: "#FEE600" }}
              >
                • • •
              </span>
            </div>
          );
        }

        const { entry, isCurrentPlayer } = row;
        const rankColor = RANK_COLORS[entry.rank - 1] ?? "#A8ABA7";

        return (
          <div
            key={entry.rank}
            className="flex items-center gap-3 px-4 py-2.5"
            style={{
              borderBottom: borderStyle,
              background: isCurrentPlayer ? "rgba(254,230,0,0.08)" : undefined,
              borderLeft: isCurrentPlayer ? "2px solid #FEE600" : "2px solid transparent",
            }}
          >
            <span
              className="font-display font-black text-xl w-7 text-center shrink-0"
              style={{ color: rankColor }}
            >
              {entry.rank}
            </span>
            <FoxIcon type={entry.avatarLevel} size={30} />
            <span
              className="font-code text-sm flex-1 truncate"
              style={{ color: isCurrentPlayer ? "#FEE600" : "#E0E0D8" }}
            >
              {entry.playerName}
              {isCurrentPlayer && (
                <span className="ml-2 text-xs opacity-60">← DU</span>
              )}
            </span>
            <span
              className="font-display font-bold text-xl shrink-0"
              style={{ color: isCurrentPlayer ? "#FEE600" : "#E0E0D8" }}
            >
              {entry.totalScore}
            </span>
          </div>
        );
      })}
    </div>
  );
}
