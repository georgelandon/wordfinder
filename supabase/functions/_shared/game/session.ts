import {
  RESULTS_CELEBRATION_INTRO_MS,
  RESULTS_EMPTY_REVEAL_MS,
  RESULTS_SUMMARY_TRANSITION_MS,
  RESULTS_WORD_REVEAL_MS
} from "./constants.ts";
import type { PlayerRoundSummary, SessionTotalRecord, ScoredWordStatus } from "../types.ts";

interface ResultsRoundLike {
  status: "countdown" | "active" | "scoring" | "results" | "cancelled";
  results_published_at: string | null;
  summary_ready_at: string | null;
  scored_at: string | null;
}

interface ResultsWordLike {
  normalized_word: string;
  status: ScoredWordStatus;
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

function resultsAnchorMs(round: ResultsRoundLike | null) {
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

export function isResultsPresentationComplete(
  round: ResultsRoundLike | null,
  scoredWords: ResultsWordLike[] = [],
  referenceTime = Date.now()
) {
  if (!round || round.status !== "results") {
    return true;
  }

  if (!round.summary_ready_at) {
    return false;
  }

  const anchorMs = resultsAnchorMs(round);
  if (anchorMs === null) {
    return false;
  }

  const foundWordCount = countFoundCelebrationWords(scoredWords);
  const revealDurationMs =
    foundWordCount > 0
      ? foundWordCount * RESULTS_WORD_REVEAL_MS
      : RESULTS_EMPTY_REVEAL_MS;
  const summaryAtMs =
    anchorMs +
    RESULTS_CELEBRATION_INTRO_MS +
    revealDurationMs +
    RESULTS_SUMMARY_TRANSITION_MS;

  return referenceTime >= summaryAtMs;
}
