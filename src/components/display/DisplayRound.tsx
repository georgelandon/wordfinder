import type { PlayerRecord, RoomRecord, SubmissionRecord, RoundRecord } from "@shared/types";
import { BoardGrid } from "@/components/BoardGrid";
import { Panel } from "@/components/Panel";
import { StatusPill } from "@/components/StatusPill";
import { useRoundTimer } from "@/hooks/useRoundTimer";
import { formatSeconds } from "@/lib/utils";

interface DisplayRoundProps {
  room: RoomRecord;
  round: RoundRecord;
  players: PlayerRecord[];
  submissions: SubmissionRecord[];
  serverOffsetMs: number;
}

export function DisplayRound({
  room,
  round,
  players,
  submissions,
  serverOffsetMs
}: DisplayRoundProps) {
  const timer = useRoundTimer(round.starts_at, round.ends_at, serverOffsetMs);
  const submissionCounts = submissions.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.player_id] = (accumulator[item.player_id] ?? 0) + 1;
    return accumulator;
  }, {});

  return (
    <div className="grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
      <Panel
        title={`Round ${round.round_number}`}
        subtitle={`Seed ${round.seed.slice(0, 12)} - Room ${room.code}`}
        className="p-8"
        headerRight={
          <StatusPill
            status={
              timer.phase === "active"
                ? "active"
                : timer.phase === "countdown"
                  ? "countdown"
                  : timer.phase === "expired"
                    ? "scoring"
                  : round.status
            }
          />
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1fr,0.33fr]">
          <BoardGrid
            board={round.board}
            large
            className="gap-4"
            tileClassName="rounded-[1.8rem]"
          />
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-gold/25 bg-gold/10 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-mist/55">
                {timer.phase === "countdown"
                  ? "Round Starts In"
                  : timer.phase === "expired"
                    ? "Round Complete"
                    : "Time Remaining"}
              </p>
              <p className="mt-4 font-display text-7xl text-surf">
                {timer.phase === "expired" ? "DONE" : formatSeconds(timer.secondsRemaining)}
              </p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal via-gold to-coral transition-[width]"
                  style={{
                    width: `${timer.phase === "expired" ? 100 : Math.max(4, (1 - timer.progress) * 100)}%`
                  }}
                />
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-mist/55">Player Pace</p>
              <div className="mt-4 space-y-3">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-surf">{player.nickname}</p>
                      <p className="text-sm text-mist/60">
                        {player.id === room.host_player_id ? "Host" : "Player"}
                      </p>
                    </div>
                    <p className="font-display text-3xl text-gold">
                      {submissionCounts[player.id] ?? 0}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Panel>
      <Panel title="Round Flow" subtitle="Phones submit silently while the TV keeps everyone oriented.">
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-mist/55">State</p>
            <p className="mt-3 font-display text-5xl text-surf">
              {timer.phase === "countdown"
                ? "Get Ready"
                : timer.phase === "expired"
                  ? "Scoring Round"
                  : "Find Words"}
            </p>
            <p className="mt-3 text-lg text-mist/70">
              {timer.phase === "expired"
                ? "Locking submissions and preparing the celebration screen."
                : timer.phase === "countdown"
                  ? "Phones can line up on the board before the round begins."
                  : "Players are tracing words on their phones right now."}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-mist/55">
              {timer.phase === "expired" ? "What Happens Next" : "Rules Reminder"}
            </p>
            {timer.phase === "expired" ? (
              <ul className="mt-3 space-y-2 text-lg text-mist/80">
                <li>Server-side scoring validates the dictionary and board paths.</li>
                <li>The TV will celebrate found words one at a time.</li>
                <li>Then the winner and full scoreboards appear.</li>
              </ul>
            ) : (
              <ul className="mt-3 space-y-2 text-lg text-mist/80">
                <li>Adjacent letters only, including diagonals.</li>
                <li>Each tile can be used once per word.</li>
                <li>Shared duplicates score zero for everyone.</li>
              </ul>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
