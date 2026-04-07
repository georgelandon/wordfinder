import type { PlayerRoundSummary, SessionTotalRecord } from "../types.ts";

export function applyRoundTotalsToSessionTotals(
  roomId: string,
  previousTotals: SessionTotalRecord[],
  roundTotals: PlayerRoundSummary[],
  timestamp = new Date().toISOString()
) {
  const previousMap = new Map(previousTotals.map((item) => [item.player_id, item]));

  return roundTotals.map((summary) => {
    const previous = previousMap.get(summary.playerId);
    return {
      room_id: roomId,
      player_id: summary.playerId,
      cumulative_points: (previous?.cumulative_points ?? 0) + summary.totalPoints,
      rounds_played: (previous?.rounds_played ?? 0) + 1,
      words_found: (previous?.words_found ?? 0) + summary.validWordCount,
      last_updated_at: timestamp
    } satisfies SessionTotalRecord;
  });
}

