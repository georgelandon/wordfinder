import type {
  PlayerRecord,
  PlayerRoundSummary,
  ScoredWordRecord,
  SessionTotalRecord
} from "@shared/types";
import { Panel } from "@/components/Panel";
import { StatusPill } from "@/components/StatusPill";

interface ControllerResultsProps {
  player: PlayerRecord;
  roundTotal?: PlayerRoundSummary;
  sessionTotal?: SessionTotalRecord;
  scoredWords: ScoredWordRecord[];
}

export function ControllerResults({
  player,
  roundTotal,
  sessionTotal,
  scoredWords
}: ControllerResultsProps) {
  return (
    <Panel
      title={`${player.nickname}'s Round`}
      subtitle="Personal breakdown from the last scored round."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-mist/55">Round Score</p>
          <p className="mt-2 font-display text-4xl text-gold">{roundTotal?.totalPoints ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-mist/55">Valid Words</p>
          <p className="mt-2 font-display text-4xl text-mint">
            {roundTotal?.validWordCount ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-mist/55">Session Total</p>
          <p className="mt-2 font-display text-4xl text-surf">
            {sessionTotal?.cumulative_points ?? 0}
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {scoredWords.length > 0 ? (
          scoredWords.map((word) => (
            <div
              key={`${word.normalized_word}-${word.status}`}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
            >
              <div>
                <p className="font-semibold text-surf">{word.word.toLowerCase()}</p>
                {word.reason ? (
                  <p className="text-sm text-mist/60">{word.reason}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={word.status} />
                <p className="font-display text-2xl text-gold">{word.points}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-mist/60">Scores will appear here when the round finishes.</p>
        )}
      </div>
    </Panel>
  );
}

