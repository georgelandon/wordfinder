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
    const nickname = String(body.nickname ?? "").trim();
    const roomCode = body.roomCode ? String(body.roomCode).trim().toUpperCase() : null;
    const createIfMissing = Boolean(body.createIfMissing ?? false);
    const supabase = createAdminClient();

    const { data: joined, error: joinError } = await supabase.rpc("create_or_join_room", {
      p_user_id: user.id,
      p_nickname: nickname,
      p_room_code: roomCode,
      p_create_if_missing: createIfMissing,
      p_device_kind: "controller"
    });

    if (joinError) {
      throw joinError;
    }

    const joinedRow = joined?.[0];
    if (!joinedRow?.room_id || !joinedRow?.player_id) {
      throw new Error("Room join did not return room/player ids.");
    }

    const [roomResponse, playerResponse] = await Promise.all([
      supabase.from("rooms").select("*").eq("id", joinedRow.room_id).single(),
      supabase.from("players").select("*").eq("id", joinedRow.player_id).single()
    ]);

    if (roomResponse.error) {
      throw roomResponse.error;
    }
    if (playerResponse.error) {
      throw playerResponse.error;
    }

    return json({
      room: roomResponse.data,
      player: playerResponse.data,
      hostPlayerId: joinedRow.host_player_id
    });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Unable to create or join room."
      },
      { status: 400 }
    );
  }
});

