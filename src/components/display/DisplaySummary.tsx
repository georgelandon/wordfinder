import type {
  PlayerRecord,
  PlayerRoundSummary,
  RoundRecord,
  SessionTotalRecord
} from "@shared/types";
import { Panel } from "@/components/Panel";
import { LeaderboardTable } from "@/components/results/LeaderboardTable";

interface DisplaySummaryProps {
  round: RoundRecord;
  players: PlayerRecord[];
  roundTotals: PlayerRoundSummary[];
  sessionTotals: SessionTotalRecord[];
}

export function DisplaySummary({
  round,
  players,
  roundTotals,
  sessionTotals
}: DisplaySummaryProps) {
  return (
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
  );
}
