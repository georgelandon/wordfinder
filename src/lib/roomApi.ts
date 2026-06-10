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

const SESSION_REFRESH_BUFFER_MS = 30_000;

function normalizeRoomCode(roomCode: string) {
  return roomCode.trim().toUpperCase();
}

async function clearPersistedSession() {
  await supabase.auth.signOut().catch(() => undefined);
}

async function createAnonymousSession() {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw error;
  }

  if (!data.session?.user || !data.session.access_token) {
    throw new Error("Anonymous auth did not return a usable session.");
  }

  return data.session;
}

async function getFreshSession(options?: { forceRefresh?: boolean; resetIfInvalid?: boolean }) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const expiresAtMs = session?.expires_at ? session.expires_at * 1000 : 0;
  const shouldRefresh =
    options?.forceRefresh ||
    !session?.access_token ||
    expiresAtMs <= Date.now() + SESSION_REFRESH_BUFFER_MS;

  if (!shouldRefresh && session?.user) {
    return session;
  }

  if (session?.refresh_token) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session?.user && data.session.access_token) {
      return data.session;
    }
  }

  if (options?.resetIfInvalid && session) {
    await clearPersistedSession();
  }

  return createAnonymousSession();
}

function isRecoverableAuthError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("jwt") ||
    message.includes("authorization") ||
    message.includes("verify user") ||
    message.includes("token") ||
    message.includes("session")
  );
}

export async function ensureAnonymousUser(): Promise<User> {
  const session = await getFreshSession({ resetIfInvalid: true });
  return session.user;
}

async function getAccessToken() {
  const session = await getFreshSession({ resetIfInvalid: true });
  if (!session.access_token) {
    throw new Error("Missing Supabase access token for Edge Function call.");
  }

  return session.access_token;
}

async function invokeFunction<T>(name: string, body: Record<string, unknown>) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const accessToken =
      attempt === 0
        ? await getAccessToken()
        : (await getFreshSession({ forceRefresh: true, resetIfInvalid: true })).access_token;
    const { data, error } = await supabase.functions.invoke(name, {
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!error) {
      return data as T;
    }

    if (attempt === 0 && isRecoverableAuthError(error)) {
      await clearPersistedSession();
      continue;
    }

    throw error;
  }

  throw new Error(`Unable to invoke ${name}.`);
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

  const { error: cleanupError } = await supabase.rpc("expire_stale_rooms");
  if (cleanupError) {
    throw cleanupError;
  }

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

  if (room.status === "expired" || new Date(room.expires_at).getTime() <= Date.now()) {
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
  const latestRound = rounds[0] ?? null;
  const activeRound =
    rounds.find(
      (round) =>
        round.id === room.active_round_id &&
        (round.status === "active" ||
          round.status === "countdown" ||
          round.status === "scoring")
    ) ??
    rounds.find(
      (round) =>
        round.status === "active" ||
        round.status === "countdown" ||
        round.status === "scoring"
    ) ??
    null;

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
