import type {
  PlayerRecord,
  PlayerRoundSummary,
  ScoredWordRecord,
  RoundRecord,
  SessionTotalRecord
} from "@shared/types";
import { getResultsPresentationState } from "@shared/game/session";
import { Panel } from "@/components/Panel";
import { LeaderboardTable } from "@/components/results/LeaderboardTable";
import { useServerNow } from "@/hooks/useServerNow";

interface DisplaySummaryProps {
  round: RoundRecord;
  players: PlayerRecord[];
  roundTotals: PlayerRoundSummary[];
  sessionTotals: SessionTotalRecord[];
  scoredWords: ScoredWordRecord[];
  serverOffsetMs: number;
  presentationAnchorMs?: number | null;
}

interface CelebrationEntry {
  word: string;
  playerIds: string[];
  playerCount: number;
  points: number;
  shared: boolean;
}

function buildCelebrationEntries(scoredWords: ScoredWordRecord[]) {
  const entries = new Map<
    string,
    {
      word: string;
      playerIds: Set<string>;
      points: number;
      shared: boolean;
    }
  >();

  for (const item of scoredWords) {
    if (item.status !== "valid" && item.status !== "duplicate_global") {
      continue;
    }

    const existing = entries.get(item.normalized_word) ?? {
      word: item.normalized_word.toUpperCase(),
      playerIds: new Set<string>(),
      points: 0,
      shared: false
    };

    existing.playerIds.add(item.player_id);
    existing.points = Math.max(existing.points, item.points);
    existing.shared ||= item.status === "duplicate_global";
    entries.set(item.normalized_word, existing);
  }

  return [...entries.values()]
    .map(
      (entry) =>
        ({
          word: entry.word,
          playerIds: [...entry.playerIds].sort((left, right) => left.localeCompare(right)),
          playerCount: entry.playerIds.size,
          points: entry.points,
          shared: entry.shared
        }) satisfies CelebrationEntry
    )
    .sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points;
      }
      if (right.word.length !== left.word.length) {
        return right.word.length - left.word.length;
      }
      return left.word.localeCompare(right.word);
    });
}

export function DisplaySummary({
  round,
  players,
  roundTotals,
  sessionTotals,
  scoredWords,
  serverOffsetMs,
  presentationAnchorMs = null
}: DisplaySummaryProps) {
  const now = useServerNow(serverOffsetMs, round.status === "results");
  const celebrationEntries = buildCelebrationEntries(scoredWords);
  const presentationRound =
    presentationAnchorMs === null
      ? round
      : {
          ...round,
          scored_at: new Date(presentationAnchorMs).toISOString(),
          summary_ready_at: new Date(presentationAnchorMs).toISOString(),
          results_published_at: new Date(presentationAnchorMs).toISOString()
        };
  const presentation = getResultsPresentationState(presentationRound, scoredWords, now);
  const playerMap = new Map(players.map((player) => [player.id, player]));
  const currentCelebrationEntry =
    presentation.currentRevealIndex !== null
      ? celebrationEntries[presentation.currentRevealIndex] ?? null
      : null;
  const roundWinner = roundTotals[0] ?? null;
  const sessionLeader = [...sessionTotals].sort(
    (left, right) => right.cumulative_points - left.cumulative_points
  )[0] ?? null;
  const winnerName = roundWinner ? playerMap.get(roundWinner.playerId)?.nickname ?? "Player" : null;
  const leaderName = sessionLeader
    ? playerMap.get(sessionLeader.player_id)?.nickname ?? "Player"
    : null;

  if (presentation.stage === "celebration") {
    const totalCards = Math.max(1, celebrationEntries.length);
    const currentCardNumber = Math.min(
      totalCards,
      Math.max(1, (presentation.currentRevealIndex ?? 0) + 1)
    );
    const revealNames = currentCelebrationEntry
      ? currentCelebrationEntry.playerIds.map((playerId) => playerMap.get(playerId)?.nickname ?? "Player")
      : [];

    return (
      <div className="grid gap-6 xl:grid-cols-[1.3fr,0.7fr]">
        <Panel
          title={`Round ${round.round_number} Celebration`}
          subtitle="The TV is walking through every found word before the scoreboards unlock."
          className="overflow-hidden p-8"
        >
          <div className="space-y-8">
            <div className="flex items-center justify-between text-sm uppercase tracking-[0.25em] text-mist/55">
              <span>
                {celebrationEntries.length > 0 ? `Word ${currentCardNumber} of ${totalCards}` : "No Found Words"}
              </span>
              <span>
                Scoreboards in {Math.max(1, Math.ceil((presentation.millisecondsUntilSummary ?? 0) / 1000))}s
              </span>
            </div>

            <div className="rounded-[2.25rem] border border-gold/20 bg-gradient-to-br from-gold/12 via-white/[0.03] to-coral/10 p-10 text-center shadow-[0_0_80px_rgba(244,207,104,0.12)]">
              <p className="text-sm uppercase tracking-[0.4em] text-mist/50">Found Word</p>
              <p className="mt-6 font-display text-7xl text-surf sm:text-8xl">
                {currentCelebrationEntry?.word ?? "NO SCORE"}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {revealNames.length > 0 ? (
                  revealNames.map((name) => (
                    <span
                      key={name}
                      className="rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-lg font-semibold text-surf"
                    >
                      {name}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-lg font-semibold text-surf">
                    Nobody found a scoring word this round
                  </span>
                )}
              </div>
              <p className="mt-6 text-lg text-mist/75">
                {currentCelebrationEntry
                  ? currentCelebrationEntry.shared
                    ? "Shared word. Everyone who found it gets celebration credit, but it scores zero."
                    : `Worth ${currentCelebrationEntry.points} point${currentCelebrationEntry.points === 1 ? "" : "s"}.`
                  : "The scoreboard is still coming up next."}
              </p>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-black/25">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal via-gold to-coral transition-[width]"
                style={{
                  width: `${(currentCardNumber / totalCards) * 100}%`
                }}
              />
            </div>
          </div>
        </Panel>

        <Panel
          title="Round Buzz"
          subtitle="The scoreboards unlock right after this celebration reel finishes."
        >
          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-mist/55">Words Found</p>
              <p className="mt-3 font-display text-6xl text-gold">{celebrationEntries.length}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-mist/55">Projected Winner</p>
              <p className="mt-3 font-display text-4xl text-surf">{winnerName ?? "Waiting..."}</p>
              <p className="mt-2 text-sm text-mist/65">
                {roundWinner
                  ? `${roundWinner.totalPoints} points this round`
                  : "Scores are still locking in."}
              </p>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Panel
        title={winnerName ? `${winnerName} wins Round ${round.round_number}` : `Round ${round.round_number} Results`}
        subtitle="The celebration reel is complete. Final scores are locked and the host can start the next round."
        className="border-gold/25 bg-gold/5"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-gold/25 bg-gold/10 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-mist/55">Round Winner</p>
            <p className="mt-3 font-display text-5xl text-surf">{winnerName ?? "No winner yet"}</p>
            <p className="mt-2 text-lg text-mist/70">
              {roundWinner
                ? `${roundWinner.totalPoints} points and ${roundWinner.validWordCount} valid word${roundWinner.validWordCount === 1 ? "" : "s"}`
                : "Waiting for totals."}
            </p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-mist/55">Session Leader</p>
            <p className="mt-3 font-display text-5xl text-gold">{leaderName ?? "No leader yet"}</p>
            <p className="mt-2 text-lg text-mist/70">
              {sessionLeader
                ? `${sessionLeader.cumulative_points} cumulative points across ${sessionLeader.rounds_played} round${sessionLeader.rounds_played === 1 ? "" : "s"}`
                : "The session standings will build across rounds."}
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
      <Panel
        title={`Round ${round.round_number} Results`}
        subtitle="Round scores are locked in. The host can launch the next board from their phone."
      >
        <LeaderboardTable players={players} roundTotals={roundTotals} title="This Round" />
      </Panel>
      <Panel
        title="Session Standings"
        subtitle="Players stay in the room across rounds, so the leaderboard keeps climbing."
      >
        <LeaderboardTable players={players} sessionTotals={sessionTotals} title="Overall" />
      </Panel>
      </div>
    </div>
  );
}
