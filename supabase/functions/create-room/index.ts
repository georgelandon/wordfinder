import { createAdminClient } from "../_shared/clients.ts";
import { getUserFromRequest, handleOptions, json } from "../_shared/http.ts";

Deno.serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) {
    return optionsResponse;
  }

  try {
    await getUserFromRequest(request);
    const body = await request.json().catch(() => ({}));
    const roomCode = body.roomCode ? String(body.roomCode).trim().toUpperCase() : null;
    const supabase = createAdminClient();

    const { data: created, error: createError } = await supabase.rpc("create_room", {
      p_room_code: roomCode
    });

    if (createError) {
      throw createError;
    }

    const createdRow = created?.[0];
    if (!createdRow?.room_id) {
      throw new Error("Room creation did not return a room id.");
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", createdRow.room_id)
      .single();

    if (roomError) {
      throw roomError;
    }

    return json({ room });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Unable to create room."
      },
      { status: 400 }
    );
  }
});
