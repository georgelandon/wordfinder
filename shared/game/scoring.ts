import { MINIMUM_WORD_LENGTH } from "./constants";
import { findWordPath, normalizeWord } from "./validation";
import type {
  BoardMatrix,
  PlayerRoundSummary,
  RoundScoringResult,
  ScoreWordResult
} from "../types";

export function scoreWordLength(length: number) {
  if (length < MINIMUM_WORD_LENGTH) {
    return 0;
  }
  if (length <= 4) {
    return 1;
  }
  if (length === 5) {
    return 2;
  }
  if (length === 6) {
    return 3;
  }
  if (length === 7) {
    return 5;
  }
  return 11;
}

export interface SubmissionInput {
  playerId: string;
  word: string;
}

export interface ScoreRoundOptions {
  board: BoardMatrix;
  submissions: SubmissionInput[];
  dictionary: Set<string>;
}

function baseReason(status: ScoreWordResult["status"]) {
  switch (status) {
    case "too_short":
      return "Words must be at least 3 letters long.";
    case "invalid_dictionary":
      return "Word not found in the dictionary.";
    case "invalid_path":
      return "Word cannot be traced on the board.";
    case "duplicate_self":
      return "Duplicate word from the same player.";
    case "duplicate_global":
      return "Another player found the same word.";
    default:
      return null;
  }
}

export function scoreRound({
  board,
  submissions,
  dictionary
}: ScoreRoundOptions): RoundScoringResult {
  const seenByPlayer = new Map<string, Set<string>>();
  const scoredWords: ScoreWordResult[] = submissions.map(({ playerId, word }) => {
    const normalizedWord = normalizeWord(word);
    const seenWords = seenByPlayer.get(playerId) ?? new Set<string>();
    seenByPlayer.set(playerId, seenWords);

    if (seenWords.has(normalizedWord)) {
      return {
        playerId,
        word,
        normalizedWord,
        status: "duplicate_self",
        points: 0,
        reason: baseReason("duplicate_self"),
        path: null
      };
    }
    seenWords.add(normalizedWord);

    if (normalizedWord.length < MINIMUM_WORD_LENGTH) {
      return {
        playerId,
        word,
        normalizedWord,
        status: "too_short",
        points: 0,
        reason: baseReason("too_short"),
        path: null
      };
    }

    if (!dictionary.has(normalizedWord)) {
      return {
        playerId,
        word,
        normalizedWord,
        status: "invalid_dictionary",
        points: 0,
        reason: baseReason("invalid_dictionary"),
        path: null
      };
    }

    const path = findWordPath(board, normalizedWord);
    if (!path) {
      return {
        playerId,
        word,
        normalizedWord,
        status: "invalid_path",
        points: 0,
        reason: baseReason("invalid_path"),
        path: null
      };
    }

    return {
      playerId,
      word,
      normalizedWord,
      status: "valid",
      points: scoreWordLength(normalizedWord.length),
      reason: null,
      path
    };
  });

  const duplicateCounts = new Map<string, number>();
  for (const item of scoredWords) {
    if (item.status === "valid") {
      duplicateCounts.set(
        item.normalizedWord,
        (duplicateCounts.get(item.normalizedWord) ?? 0) + 1
      );
    }
  }

  const normalizedResults = scoredWords.map((item) => {
    if (
      item.status === "valid" &&
      (duplicateCounts.get(item.normalizedWord) ?? 0) > 1
    ) {
      return {
        ...item,
        status: "duplicate_global" as const,
        points: 0,
        reason: baseReason("duplicate_global"),
        path: item.path
      };
    }

    return item;
  });

  const totalsByPlayer = new Map<string, PlayerRoundSummary>();
  for (const item of normalizedResults) {
    const summary =
      totalsByPlayer.get(item.playerId) ??
      ({
        playerId: item.playerId,
        totalPoints: 0,
        validWordCount: 0,
        duplicateWordCount: 0,
        invalidWordCount: 0,
        rank: 0
      } satisfies PlayerRoundSummary);

    summary.totalPoints += item.points;
    if (item.status === "valid") {
      summary.validWordCount += 1;
    } else if (
      item.status === "duplicate_self" ||
      item.status === "duplicate_global"
    ) {
      summary.duplicateWordCount += 1;
    } else {
      summary.invalidWordCount += 1;
    }

    totalsByPlayer.set(item.playerId, summary);
  }

  const roundTotals = [...totalsByPlayer.values()]
    .sort((left, right) => {
      if (right.totalPoints !== left.totalPoints) {
        return right.totalPoints - left.totalPoints;
      }
      if (right.validWordCount !== left.validWordCount) {
        return right.validWordCount - left.validWordCount;
      }
      return left.playerId.localeCompare(right.playerId);
    })
    .map((summary, index) => ({
      ...summary,
      rank: index + 1
    }));

  return {
    scoredWords: normalizedResults,
    roundTotals
  };
}

