import { useEffect, useMemo, useState } from "react";
import { DICTIONARY_SET } from "@shared/dictionary";
import { generateSeededBoard } from "@shared/game/board";
import { scoreRound } from "@shared/game/scoring";
import { MobileBoard } from "@/components/controller/MobileBoard";
import { Panel } from "@/components/Panel";
import { useSessionStore } from "@/store/sessionStore";

const DAILY_DURATION_SECONDS = 180;

function todaySeed() {
  return new Date().toISOString().slice(0, 10);
}

export function DailyGame() {
  const seed = todaySeed();
  const board = useMemo(() => generateSeededBoard(`daily:${seed}`), [seed]);
  const [secondsRemaining, setSecondsRemaining] = useState(DAILY_DURATION_SECONDS);
  const [submittedWords, setSubmittedWords] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);
  const history = useSessionStore((state) => state.dailyHistory);
  const addDailyHistory = useSessionStore((state) => state.addDailyHistory);

  useEffect(() => {
    if (completed) {
      return;
    }

    const interval = window.setInterval(() => {
      setSecondsRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setCompleted(true);
          return 0;
        }
        return current - 1;
      });
    }, 1_000);

    return () => window.clearInterval(interval);
  }, [completed]);

  const result = useMemo(
    () =>
      scoreRound({
        board,
        submissions: submittedWords.map((word) => ({ playerId: "solo", word })),
        dictionary: DICTIONARY_SET
      }),
    [board, submittedWords]
  );

  const roundTotal = result.roundTotals[0];

  useEffect(() => {
    if (!completed) {
      return;
    }

    addDailyHistory({
      date: seed,
      score: roundTotal?.totalPoints ?? 0,
      submittedWords,
      durationSeconds: DAILY_DURATION_SECONDS
    });
  }, [addDailyHistory, completed, roundTotal?.totalPoints, seed, submittedWords]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr,0.75fr]">
      <div className="space-y-6">
        <Panel
          title="Daily Puzzle"
          subtitle="Same deterministic board for everyone, but fully playable offline in a single tab."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-mist/55">Date Seed</p>
              <p className="mt-2 font-display text-3xl text-surf">{seed}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-mist/55">Time Left</p>
              <p className="mt-2 font-display text-3xl text-gold">{secondsRemaining}s</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-mist/55">Score</p>
              <p className="mt-2 font-display text-3xl text-mint">
                {roundTotal?.totalPoints ?? 0}
              </p>
            </div>
          </div>
        </Panel>
        <MobileBoard
          board={board}
          disabled={completed}
          submittedWords={submittedWords}
          onSubmitWord={(word) =>
            setSubmittedWords((current) =>
              current.includes(word.toLowerCase()) ? current : [...current, word.toLowerCase()]
            )
          }
        />
      </div>
      <div className="space-y-6">
        <Panel
          title={completed ? "Today's Results" : "Scoring Preview"}
          subtitle="Daily mode uses the same scoring rules as party rooms."
        >
          <div className="space-y-3">
            {result.scoredWords.length > 0 ? (
              result.scoredWords.map((word) => (
                <div
                  key={`${word.normalizedWord}-${word.status}`}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-surf">{word.word.toLowerCase()}</p>
                    {word.reason ? (
                      <p className="text-sm text-mist/60">{word.reason}</p>
                    ) : null}
                  </div>
                  <p className="font-display text-2xl text-gold">{word.points}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-mist/65">Submit words to build your score sheet.</p>
            )}
          </div>
        </Panel>
        <Panel title="Recent Daily Runs" subtitle="Stored locally on this device.">
          <div className="space-y-2">
            {history.length > 0 ? (
              history.map((entry) => (
                <div
                  key={entry.date}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-surf">{entry.date}</p>
                    <p className="text-sm text-mist/60">{entry.submittedWords.length} words</p>
                  </div>
                  <p className="font-display text-2xl text-gold">{entry.score}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-mist/65">No saved daily history yet.</p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

