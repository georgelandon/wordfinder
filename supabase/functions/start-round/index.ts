import {
  DEFAULT_ROUND_DURATION_SECONDS,
  PRE_ROUND_COUNTDOWN_SECONDS
} from "../_shared/game/constants.ts";
import { generateSeededBoard } from "../_shared/game/board.ts";
import { createAdminClient } from "../_shared/clients.ts";
import { getUserFromRequest, handleOptions, json } from "../_shared/http.ts";

Deno.serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) {
    return optionsResponse;
  }

  try {
    const { user } = await getUserFromRequest(request);
    const body = await request.json();
    const roomCode = String(body.roomCode ?? "").trim().toUpperCase();
    const requestedDuration = Number(body.durationSeconds ?? DEFAULT_ROUND_DURATION_SECONDS);
    const durationSeconds = Number.isFinite(requestedDuration)
      ? Math.max(30, Math.min(600, requestedDuration))
      : DEFAULT_ROUND_DURATION_SECONDS;

    const supabase = createAdminClient();
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", roomCode)
      .single();

    if (roomError) {
      throw roomError;
    }

    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", room.id)
      .eq("auth_user_id", user.id)
      .single();

    if (playerError) {
      throw playerError;
    }

    if (room.host_player_id !== player.id) {
      throw new Error("Only the current host can start a round.");
    }

    if (["active", "countdown", "scoring"].includes(room.status)) {
      throw new Error("A round is already in progress.");
    }

    const { data: latestRounds, error: latestRoundsError } = await supabase
      .from("rounds")
      .select("*")
      .eq("room_id", room.id)
      .order("round_number", { ascending: false })
      .limit(1);

    if (latestRoundsError) {
      throw latestRoundsError;
    }

    const latestRound = latestRounds?.[0];
    if (latestRound?.status === "results" && !latestRound.summary_ready_at) {
      throw new Error("Summary is still publishing for the previous round.");
    }

    const roundNumber = room.current_round_number + 1;
    const seed = `${room.id}:${roundNumber}:${crypto.randomUUID()}`;
    const board = generateSeededBoard(seed, room.board_size);
    const startsAt = new Date(Date.now() + PRE_ROUND_COUNTDOWN_SECONDS * 1000).toISOString();
    const endsAt = new Date(
      new Date(startsAt).getTime() + durationSeconds * 1000
    ).toISOString();

    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .insert({
        room_id: room.id,
        round_number: roundNumber,
        seed,
        board,
        board_size: room.board_size,
        duration_seconds: durationSeconds,
        status: "countdown",
        starts_at: startsAt,
        ends_at: endsAt
      })
      .select("*")
      .single();

    if (roundError) {
      throw roundError;
    }

    const { error: roomUpdateError } = await supabase
      .from("rooms")
      .update({
        status: "active",
        active_round_id: round.id,
        current_round_number: roundNumber,
        round_duration_seconds: durationSeconds
      })
      .eq("id", room.id);

    if (roomUpdateError) {
      throw roomUpdateError;
    }

    await supabase
      .from("players")
      .update({
        ready: false
      })
      .eq("room_id", room.id);

    const { data: refreshedRoom, error: refreshedRoomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", room.id)
      .single();

    if (refreshedRoomError) {
      throw refreshedRoomError;
    }

    return json({
      room: refreshedRoom,
      round
    });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Unable to start round."
      },
      { status: 400 }
    );
  }
});
