export type RoomStatus =
  | "lobby"
  | "countdown"
  | "active"
  | "scoring"
  | "results"
  | "ended"
  | "expired";

export type RoundStatus =
  | "countdown"
  | "active"
  | "scoring"
  | "results"
  | "cancelled";

export type ScoredWordStatus =
  | "valid"
  | "too_short"
  | "invalid_dictionary"
  | "invalid_path"
  | "duplicate_self"
  | "duplicate_global";

export type DeviceKind = "controller" | "display";

export type BoardTile = string;
export type BoardMatrix = BoardTile[][];
export type BoardPath = number[];

export interface RoomRecord {
  id: string;
  code: string;
  status: RoomStatus;
  session_state: Record<string, unknown>;
  board_size: number;
  round_duration_seconds: number;
  current_round_number: number;
  active_round_id: string | null;
  host_player_id: string | null;
  created_at: string;
  updated_at: string;
  ended_at: string | null;
  expires_at: string | null;
}

export interface PlayerRecord {
  id: string;
  room_id: string;
  auth_user_id: string;
  nickname: string;
  ready: boolean;
  connected: boolean;
  device_kind: DeviceKind;
  joined_at: string;
  last_seen_at: string;
  disconnected_at: string | null;
  updated_at: string;
}

export interface RoundRecord {
  id: string;
  room_id: string;
  round_number: number;
  seed: string;
  board: BoardMatrix;
  board_size: number;
  duration_seconds: number;
  status: RoundStatus;
  created_at: string;
  starts_at: string;
  ends_at: string;
  scored_at: string | null;
  summary_ready_at: string | null;
  results_published_at: string | null;
}

export interface SubmissionRecord {
  id: string;
  round_id: string;
  player_id: string;
  word: string;
  normalized_word: string;
  submitted_at: string;
}

export interface ScoredWordRecord {
  id: string;
  round_id: string;
  player_id: string;
  word: string;
  normalized_word: string;
  status: ScoredWordStatus;
  points: number;
  reason: string | null;
  path: BoardPath | null;
  created_at: string;
}

export interface RoundTotalRecord {
  round_id: string;
  player_id: string;
  total_points: number;
  valid_word_count: number;
  duplicate_word_count: number;
  invalid_word_count: number;
  rank: number | null;
}

export interface SessionTotalRecord {
  room_id: string;
  player_id: string;
  cumulative_points: number;
  rounds_played: number;
  words_found: number;
  last_updated_at: string;
}

export interface JoinRoomResponse {
  room: RoomRecord;
  player: PlayerRecord;
  hostPlayerId: string | null;
}

export interface RoomPresenceEntry {
  key: string;
  userId: string;
  label: string;
  kind: DeviceKind;
  playerId?: string;
  joinedAt: string;
}

export interface RoomSnapshot {
  room: RoomRecord;
  players: PlayerRecord[];
  rounds: RoundRecord[];
  activeRound: RoundRecord | null;
  latestRound: RoundRecord | null;
  submissions: SubmissionRecord[];
  scoredWords: ScoredWordRecord[];
  roundTotals: RoundTotalRecord[];
  sessionTotals: SessionTotalRecord[];
  presence: RoomPresenceEntry[];
}

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

export interface DailyHistoryEntry {
  date: string;
  score: number;
  submittedWords: string[];
  durationSeconds: number;
}

