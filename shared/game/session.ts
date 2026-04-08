import {
  HOST_STALE_AFTER_MS,
  RESULTS_CELEBRATION_INTRO_MS,
  RESULTS_EMPTY_REVEAL_MS,
  RESULTS_SUMMARY_TRANSITION_MS,
  RESULTS_WORD_REVEAL_MS
} from "./constants";
import type {
  PlayerRecord,
  PlayerRoundSummary,
  RoomStatus,
  RoundRecord,
  ScoredWordRecord,
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

type ResultsRoundLike =
  | Pick<RoundRecord, "status" | "results_published_at" | "summary_ready_at" | "scored_at">
  | null;
type ResultsWordLike = Pick<ScoredWordRecord, "normalized_word" | "status">;

function resultsAnchorMs(round: ResultsRoundLike) {
  const anchor =
    round?.results_published_at ?? round?.summary_ready_at ?? round?.scored_at ?? null;

  return anchor ? new Date(anchor).getTime() : null;
}

export function countFoundCelebrationWords(scoredWords: ResultsWordLike[]) {
  return new Set(
    scoredWords
      .filter(
        (item) => item.status === "valid" || item.status === "duplicate_global"
      )
      .map((item) => item.normalized_word)
  ).size;
}

export function getResultsPresentationSummaryAt(
  round: ResultsRoundLike,
  foundWordCount: number
) {
  const anchorMs = resultsAnchorMs(round);
  if (anchorMs === null) {
    return null;
  }

  const revealDurationMs =
    foundWordCount > 0
      ? foundWordCount * RESULTS_WORD_REVEAL_MS
      : RESULTS_EMPTY_REVEAL_MS;

  return (
    anchorMs +
    RESULTS_CELEBRATION_INTRO_MS +
    revealDurationMs +
    RESULTS_SUMMARY_TRANSITION_MS
  );
}

export function getResultsPresentationState(
  round: ResultsRoundLike,
  scoredWords: ResultsWordLike[] = [],
  referenceTime = Date.now()
) {
  const foundWordCount = countFoundCelebrationWords(scoredWords);
  const summaryAtMs = getResultsPresentationSummaryAt(round, foundWordCount);

  if (!round || round.status !== "results") {
    return {
      stage: "summary" as const,
      canStartNextRound: true,
      foundWordCount,
      currentRevealIndex: null,
      millisecondsUntilSummary: 0
    };
  }

  if (summaryAtMs === null) {
    return {
      stage: "celebration" as const,
      canStartNextRound: false,
      foundWordCount,
      currentRevealIndex: foundWordCount > 0 ? 0 : null,
      millisecondsUntilSummary: null
    };
  }

  if (referenceTime >= summaryAtMs) {
    return {
      stage: "summary" as const,
      canStartNextRound: true,
      foundWordCount,
      currentRevealIndex: foundWordCount > 0 ? foundWordCount - 1 : null,
      millisecondsUntilSummary: 0
    };
  }

  const anchorMs = resultsAnchorMs(round) ?? summaryAtMs;
  const revealClock = Math.max(0, referenceTime - anchorMs - RESULTS_CELEBRATION_INTRO_MS);
  const currentRevealIndex =
    foundWordCount > 0
      ? Math.min(foundWordCount - 1, Math.floor(revealClock / RESULTS_WORD_REVEAL_MS))
      : null;

  return {
    stage: "celebration" as const,
    canStartNextRound: false,
    foundWordCount,
    currentRevealIndex,
    millisecondsUntilSummary: Math.max(0, summaryAtMs - referenceTime)
  };
}

export function canStartRound(
  roomStatus: RoomStatus,
  activeRound: Pick<RoundRecord, "status"> | null,
  latestRound:
    | Pick<
        RoundRecord,
        "status" | "summary_ready_at" | "results_published_at" | "scored_at"
      >
    | null,
  scoredWords: ResultsWordLike[] = [],
  referenceTime = Date.now()
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

  if (latestRound?.status === "results") {
    if (!latestRound.summary_ready_at) {
      return false;
    }

    return getResultsPresentationState(latestRound, scoredWords, referenceTime)
      .canStartNextRound;
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
