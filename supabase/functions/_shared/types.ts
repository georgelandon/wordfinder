export type ScoredWordStatus =
  | "valid"
  | "too_short"
  | "invalid_dictionary"
  | "invalid_path"
  | "duplicate_self"
  | "duplicate_global";

export type BoardTile = string;
export type BoardMatrix = BoardTile[][];
export type BoardPath = number[];

export interface ScoreWordResult {
  playerId: string;
  word: string;
  normalizedWord: string;
  status: ScoredWordStatus;
  points: number;
  reason: string | null;
  path: BoardPath | null;
}

export interface PlayerRoundSummary {
  playerId: string;
  totalPoints: number;
  validWordCount: number;
  duplicateWordCount: number;
  invalidWordCount: number;
  rank: number;
}

export interface RoundScoringResult {
  scoredWords: ScoreWordResult[];
  roundTotals: PlayerRoundSummary[];
}

export interface SessionTotalRecord {
  room_id: string;
  player_id: string;
  cumulative_points: number;
  rounds_played: number;
  words_found: number;
  last_updated_at: string;
}

