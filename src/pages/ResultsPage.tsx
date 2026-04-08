import { useParams } from "react-router-dom";
import { DisplaySummary } from "@/components/display/DisplaySummary";
import { Panel } from "@/components/Panel";
import { useRoomSnapshot } from "@/hooks/useRoomSnapshot";

export function ResultsPage() {
  const params = useParams();
  const roomCode = (params.roomCode ?? "").toUpperCase();
  const roundId = params.roundId ?? "";
  const { snapshot, loading, error, serverOffsetMs } = useRoomSnapshot({
    roomCode,
    presenceKind: "display",
    presenceLabel: "Results View"
  });

  if (loading) {
    return <Panel title="Loading results..." subtitle="Fetching the latest scoreboard." />;
  }

  if (error || !snapshot?.latestRound) {
    return <Panel title="Results unavailable" subtitle={error ?? "Round not found."} />;
  }

  if (roundId && snapshot.latestRound.id !== roundId) {
    return (
      <Panel
        title="Results archive note"
        subtitle="This static route currently shows the latest room summary. The requested round is no longer the active summary."
      />
    );
  }

  return (
    <DisplaySummary
      round={snapshot.latestRound}
      players={snapshot.players}
      scoredWords={snapshot.scoredWords}
      serverOffsetMs={serverOffsetMs}
      roundTotals={snapshot.roundTotals.map((item) => ({
        playerId: item.player_id,
        totalPoints: item.total_points,
        validWordCount: item.valid_word_count,
        duplicateWordCount: item.duplicate_word_count,
        invalidWordCount: item.invalid_word_count,
        rank: item.rank ?? 0
      }))}
      sessionTotals={snapshot.sessionTotals}
    />
  );
}
