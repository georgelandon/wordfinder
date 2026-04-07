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
    const connected =
      typeof body.connected === "boolean" ? Boolean(body.connected) : true;
    const ready =
      typeof body.ready === "boolean" ? Boolean(body.ready) : null;

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("set_player_state", {
      p_room_code: roomCode,
      p_user_id: user.id,
      p_connected: connected,
      p_ready: ready
    });

    if (error) {
      throw error;
    }

    const row = data?.[0];
    return json({
      playerId: row?.player_id ?? null,
      roomId: row?.room_id ?? null,
      hostPlayerId: row?.host_player_id ?? null,
      roomStatus: row?.room_status ?? null
    });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Unable to update player state."
      },
      { status: 400 }
    );
  }
});
