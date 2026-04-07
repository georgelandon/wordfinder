import type {
  PlayerRecord,
  PlayerRoundSummary,
  SessionTotalRecord
} from "@shared/types";
import { cn } from "@/lib/utils";

interface LeaderboardTableProps {
  players: PlayerRecord[];
  roundTotals?: PlayerRoundSummary[];
  sessionTotals?: SessionTotalRecord[];
  highlightPlayerId?: string | null;
  title?: string;
}

export function LeaderboardTable({
  players,
  roundTotals = [],
  sessionTotals = [],
  highlightPlayerId,
  title
}: LeaderboardTableProps) {
  const playerMap = new Map(players.map((player) => [player.id, player]));
  const entries =
    roundTotals.length > 0
      ? roundTotals.map((item) => ({
          id: item.playerId,
          score: item.totalPoints,
          aux: `${item.validWordCount} valid`
        }))
      : [...sessionTotals]
          .sort((left, right) => right.cumulative_points - left.cumulative_points)
          .map((item) => ({
            id: item.player_id,
            score: item.cumulative_points,
            aux: `${item.rounds_played} rounds`
          }));

  return (
    <div className="space-y-3">
      {title ? (
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-mist/60">
          {title}
        </p>
      ) : null}
      <div className="space-y-2">
        {entries.map((entry, index) => {
          const player = playerMap.get(entry.id);
          return (
            <div
              key={entry.id}
              className={cn(
                "flex items-center justify-between rounded-2xl border px-4 py-3",
                highlightPlayerId === entry.id
                  ? "border-gold/40 bg-gold/10"
                  : "border-white/10 bg-white/[0.04]"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-mist">
                  {index + 1}
                </div>
                <div>
                  <p className="font-semibold text-surf">{player?.nickname ?? "Player"}</p>
                  <p className="text-xs text-mist/60">{entry.aux}</p>
                </div>
              </div>
              <p className="font-display text-2xl text-gold">{entry.score}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

