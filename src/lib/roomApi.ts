import type { User } from "@supabase/supabase-js";
import { normalizeWord } from "@shared/game/validation";
import type {
  BoardMatrix,
  CreateRoomResponse,
  JoinRoomResponse,
  PlayerRecord,
  RoomPresenceEntry,
  RoomSnapshot,
  RoundRecord
} from "@shared/types";
import { supabase } from "./supabase";

function normalizeRoomCode(roomCode: string) {
  return roomCode.trim().toUpperCase();
}

export async function ensureAnonymousUser(): Promise<User> {
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (session?.user) {
    return session.user;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("Anonymous auth did not return a user.");
  }

  return data.user;
}

async function getAccessToken() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    return session.access_token;
  }

  await ensureAnonymousUser();

  const {
    data: { session: refreshedSession }
  } = await supabase.auth.getSession();

  if (!refreshedSession?.access_token) {
    throw new Error("Missing Supabase access token for Edge Function call.");
  }

  return refreshedSession.access_token;
}

async function invokeFunction<T>(name: string, body: Record<string, unknown>) {
  const accessToken = await getAccessToken();
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (error) {
    throw error;
  }

  return data as T;
}

export async function createOrJoinRoom(input: {
  nickname: string;
  roomCode?: string;
  createIfMissing?: boolean;
}) {
  await ensureAnonymousUser();
  return invokeFunction<JoinRoomResponse>("create-or-join-room", input);
}

export async function createRoom(input?: { roomCode?: string }) {
  await ensureAnonymousUser();
  return invokeFunction<CreateRoomResponse>("create-room", input ?? {});
}

export async function startRound(input: {
  roomCode: string;
  durationSeconds?: number;
}) {
  await ensureAnonymousUser();
  return invokeFunction<{ room: unknown; round: RoundRecord }>("start-round", input);
}

export async function endRoundAndScore(input: {
  roomCode: string;
  roundId: string;
}) {
  await ensureAnonymousUser();
  return invokeFunction<{ success: boolean; roundId: string }>(
    "end-round-and-score",
    input
  );
}

export async function setPlayerState(input: {
  roomCode: string;
  connected?: boolean;
  ready?: boolean;
}) {
  await ensureAnonymousUser();
  return invokeFunction<{
    playerId: string;
    roomId: string;
    hostPlayerId: string | null;
    roomStatus: string;
  }>("set-player-state", input);
}

function castRound(round: Record<string, unknown>): RoundRecord {
  return {
    ...(round as unknown as RoundRecord),
    board: (round.board as BoardMatrix) ?? []
  };
}

export async function fetchRoomSnapshot(
  roomCode: string,
  presence: RoomPresenceEntry[] = []
): Promise<RoomSnapshot | null> {
  await ensureAnonymousUser();
  const normalizedCode = normalizeRoomCode(roomCode);

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", normalizedCode)
    .maybeSingle();

  if (roomError) {
    throw roomError;
  }

  if (!room) {
    return null;
  }

  const [playersResponse, roundsResponse, sessionTotalsResponse] = await Promise.all([
    supabase
      .from("players")
      .select("*")
      .eq("room_id", room.id)
      .order("joined_at", { ascending: true }),
    supabase
      .from("rounds")
      .select("*")
      .eq("room_id", room.id)
      .order("round_number", { ascending: false })
      .limit(8),
    supabase
      .from("session_totals")
      .select("*")
      .eq("room_id", room.id)
  ]);

  if (playersResponse.error) {
    throw playersResponse.error;
  }
  if (roundsResponse.error) {
    throw roundsResponse.error;
  }
  if (sessionTotalsResponse.error) {
    throw sessionTotalsResponse.error;
  }

  const rounds = (roundsResponse.data ?? []).map((item) => castRound(item));
  const activeRound =
    rounds.find((round) => round.id === room.active_round_id) ??
    rounds.find((round) => round.status === "active" || round.status === "countdown") ??
    null;
  const latestRound = rounds[0] ?? null;

  const detailRound =
    room.status === "results" || room.status === "scoring"
      ? latestRound
      : activeRound ?? latestRound;

  const [submissionsResponse, scoredWordsResponse, roundTotalsResponse] =
    detailRound === null
      ? [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null }
        ]
      : await Promise.all([
          supabase
            .from("submissions")
            .select("*")
            .eq("round_id", detailRound.id)
            .order("submitted_at", { ascending: true }),
          supabase
            .from("scored_words")
            .select("*")
            .eq("round_id", detailRound.id),
          supabase
            .from("round_totals")
            .select("*")
            .eq("round_id", detailRound.id)
        ]);

  if (submissionsResponse.error) {
    throw submissionsResponse.error;
  }
  if (scoredWordsResponse.error) {
    throw scoredWordsResponse.error;
  }
  if (roundTotalsResponse.error) {
    throw roundTotalsResponse.error;
  }

  return {
    room: room as RoomSnapshot["room"],
    players: (playersResponse.data ?? []) as PlayerRecord[],
    rounds,
    activeRound,
    latestRound,
    submissions: submissionsResponse.data ?? [],
    scoredWords: scoredWordsResponse.data ?? [],
    roundTotals: roundTotalsResponse.data ?? [],
    sessionTotals: sessionTotalsResponse.data ?? [],
    presence
  };
}

export async function submitWords(
  roundId: string,
  playerId: string,
  words: string[]
) {
  const uniqueWords = Array.from(
    new Map<string, string>(
      words
        .map((word) => word.trim())
        .filter(Boolean)
        .map((word) => [normalizeWord(word), word] as const)
        .filter(([normalized]) => normalized.length > 0)
    ).values()
  );

  if (uniqueWords.length === 0) {
    return;
  }

  const payload = uniqueWords.map((word) => ({
    round_id: roundId,
    player_id: playerId,
    word,
    normalized_word: normalizeWord(word),
    submitted_at: new Date().toISOString()
  }));

  const { error } = await supabase.from("submissions").upsert(payload, {
    onConflict: "round_id,player_id,normalized_word"
  });

  if (error) {
    throw error;
  }
}

export function resolveCurrentPlayer(
  players: PlayerRecord[],
  authUserId: string | undefined
) {
  if (!authUserId) {
    return null;
  }

  return players.find((player) => player.auth_user_id === authUserId) ?? null;
}
