import { HOST_STALE_AFTER_MS } from "./constants";
import type {
  PlayerRecord,
  PlayerRoundSummary,
  RoomStatus,
  RoundRecord,
  SessionTotalRecord
} from "../types";

export function isPlayerActive(
  player: Pick<PlayerRecord, "connected" | "last_seen_at">,
  referenceTime = Date.now()
) {
  if (!player.connected) {
    return false;
  }

  return referenceTime - new Date(player.last_seen_at).getTime() <= HOST_STALE_AFTER_MS;
}

export function pickNextHost(
  players: PlayerRecord[],
  referenceTime = Date.now()
) {
  return [...players]
    .filter((player) => isPlayerActive(player, referenceTime))
    .sort((left, right) => {
      const joinedDelta =
        new Date(left.joined_at).getTime() - new Date(right.joined_at).getTime();
      if (joinedDelta !== 0) {
        return joinedDelta;
      }
      return left.id.localeCompare(right.id);
    })[0]?.id ?? null;
}

export function resolveHostPlayerId(
  players: PlayerRecord[],
  currentHostPlayerId: string | null,
  referenceTime = Date.now()
) {
  if (!currentHostPlayerId) {
    return pickNextHost(players, referenceTime);
  }

  const currentHost = players.find((player) => player.id === currentHostPlayerId);
  if (currentHost && isPlayerActive(currentHost, referenceTime)) {
    return currentHostPlayerId;
  }

  return pickNextHost(players, referenceTime);
}

export function canStartRound(
  roomStatus: RoomStatus,
  activeRound: Pick<RoundRecord, "status"> | null,
  latestRound: Pick<RoundRecord, "status" | "summary_ready_at"> | null
) {
  if (roomStatus === "active" || roomStatus === "countdown" || roomStatus === "scoring") {
    return false;
  }

  if (
    activeRound &&
    (activeRound.status === "countdown" ||
      activeRound.status === "active" ||
      activeRound.status === "scoring")
  ) {
    return false;
  }

  if (latestRound?.status === "results" && !latestRound.summary_ready_at) {
    return false;
  }

  return true;
}

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
