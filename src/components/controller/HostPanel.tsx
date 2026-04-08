import { useState } from "react";
import { Panel } from "@/components/Panel";

interface HostPanelProps {
  disabled: boolean;
  loading?: boolean;
  canStart: boolean;
  playerCount: number;
  celebrationInProgress?: boolean;
  secondsUntilUnlocked?: number;
  onStartRound: (durationSeconds: number) => Promise<void> | void;
}

export function HostPanel({
  disabled,
  loading = false,
  canStart,
  playerCount,
  celebrationInProgress = false,
  secondsUntilUnlocked,
  onStartRound
}: HostPanelProps) {
  const [durationSeconds, setDurationSeconds] = useState(120);

  return (
    <Panel
      title="Host Controls"
      subtitle="Start each round from your phone. A short countdown gives everyone time to look up at the TV."
      className="border-gold/25 bg-gold/5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <label className="block flex-1">
          <span className="mb-2 block text-sm text-mist/70">Round duration</span>
          <select
            value={durationSeconds}
            onChange={(event) => setDurationSeconds(Number(event.target.value))}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-surf outline-none focus:border-gold/50"
          >
            <option value={90}>90 seconds</option>
            <option value={120}>2 minutes</option>
            <option value={180}>3 minutes</option>
          </select>
        </label>
        <button
          type="button"
          disabled={disabled || loading || !canStart}
          onClick={() => void onStartRound(durationSeconds)}
          className="rounded-2xl bg-gold px-5 py-3 font-semibold text-ink transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Starting..." : `Start Round for ${playerCount} player${playerCount === 1 ? "" : "s"}`}
        </button>
      </div>
      {!canStart ? (
        <p className="mt-3 text-sm text-gold/80">
          {celebrationInProgress
            ? `Celebration is still playing on the TV. Next round unlocks in ${Math.max(1, secondsUntilUnlocked ?? 0)}s.`
            : "Wait until the previous summary is fully published before launching the next round."}
        </p>
      ) : null}
    </Panel>
  );
}
