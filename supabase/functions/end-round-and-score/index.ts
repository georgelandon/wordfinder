import { DICTIONARY_SET } from "../../../shared/dictionary.ts";
import { scoreRound } from "../../../shared/game/scoring.ts";
import { applyRoundTotalsToSessionTotals } from "../../../shared/game/session.ts";
import type { PlayerRoundSummary } from "../../../shared/types.ts";
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
    const roundId = String(body.roundId ?? "").trim();
    const supabase = createAdminClient();

    const [{ data: room, error: roomError }, { data: round, error: roundError }] =
      await Promise.all([
        supabase.from("rooms").select("*").eq("code", roomCode).single(),
        supabase.from("rounds").select("*").eq("id", roundId).single()
      ]);

    if (roomError) {
      throw roomError;
    }
    if (roundError) {
      throw roundError;
    }
    if (round.room_id !== room.id) {
      throw new Error("Round does not belong to this room.");
    }

    const { data: maybePlayer } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", room.id)
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const callerIsHost = maybePlayer?.id === room.host_player_id;
    const roundExpired = Date.now() >= new Date(round.ends_at).getTime();

    if (!callerIsHost && !roundExpired) {
      throw new Error("Only the host can end a round early.");
    }

    if (round.status === "results" || round.scored_at) {
      return json({ success: true, roundId });
    }

    await supabase.from("rounds").update({ status: "scoring" }).eq("id", round.id);
    await supabase.from("rooms").update({ status: "scoring" }).eq("id", room.id);

    const [playersResponse, submissionsResponse, sessionTotalsResponse] = await Promise.all([
      supabase
        .from("players")
        .select("*")
        .eq("room_id", room.id)
        .order("joined_at", { ascending: true }),
      supabase.from("submissions").select("*").eq("round_id", round.id),
      supabase.from("session_totals").select("*").eq("room_id", room.id)
    ]);

    if (playersResponse.error) {
      throw playersResponse.error;
    }
    if (submissionsResponse.error) {
      throw submissionsResponse.error;
    }
    if (sessionTotalsResponse.error) {
      throw sessionTotalsResponse.error;
    }

    const players = playersResponse.data ?? [];
    const submissions = submissionsResponse.data ?? [];
    const scoring = scoreRound({
      board: round.board,
      submissions: submissions.map((item) => ({
        playerId: item.player_id,
        word: item.word
      })),
      dictionary: DICTIONARY_SET
    });

    const totalsByPlayer = new Map(
      scoring.roundTotals.map((item) => [item.playerId, item] as const)
    );
    const completeRoundTotals: PlayerRoundSummary[] = players.map((player, index) => {
      const existing = totalsByPlayer.get(player.id);
      return (
        existing ?? {
          playerId: player.id,
          totalPoints: 0,
          validWordCount: 0,
          duplicateWordCount: 0,
          invalidWordCount: 0,
          rank: index + 1
        }
      );
    });

    completeRoundTotals.sort((left, right) => {
      if (right.totalPoints !== left.totalPoints) {
        return right.totalPoints - left.totalPoints;
      }
      if (right.validWordCount !== left.validWordCount) {
        return right.validWordCount - left.validWordCount;
      }
      return left.playerId.localeCompare(right.playerId);
    });

    const rankedRoundTotals = completeRoundTotals.map((item, index) => ({
      ...item,
      rank: index + 1
    }));

    const updatedSessionTotals = applyRoundTotalsToSessionTotals(
      room.id,
      sessionTotalsResponse.data ?? [],
      rankedRoundTotals
    );

    await supabase.from("scored_words").delete().eq("round_id", round.id);
    await supabase.from("round_totals").delete().eq("round_id", round.id);

    if (scoring.scoredWords.length > 0) {
      const { error: scoredWordsError } = await supabase.from("scored_words").insert(
        scoring.scoredWords.map((item) => ({
          round_id: round.id,
          player_id: item.playerId,
          word: item.word,
          normalized_word: item.normalizedWord,
          status: item.status,
          points: item.points,
          reason: item.reason,
          path: item.path
        }))
      );

      if (scoredWordsError) {
        throw scoredWordsError;
      }
    }

    const { error: roundTotalsError } = await supabase.from("round_totals").upsert(
      rankedRoundTotals.map((item) => ({
        round_id: round.id,
        player_id: item.playerId,
        total_points: item.totalPoints,
        valid_word_count: item.validWordCount,
        duplicate_word_count: item.duplicateWordCount,
        invalid_word_count: item.invalidWordCount,
        rank: item.rank
      })),
      {
        onConflict: "round_id,player_id"
      }
    );

    if (roundTotalsError) {
      throw roundTotalsError;
    }

    const { error: sessionTotalsError } = await supabase.from("session_totals").upsert(
      updatedSessionTotals,
      {
        onConflict: "room_id,player_id"
      }
    );

    if (sessionTotalsError) {
      throw sessionTotalsError;
    }

    const completedAt = new Date().toISOString();

    const { error: roundCompleteError } = await supabase
      .from("rounds")
      .update({
        status: "results",
        scored_at: completedAt,
        summary_ready_at: completedAt,
        results_published_at: completedAt
      })
      .eq("id", round.id);

    if (roundCompleteError) {
      throw roundCompleteError;
    }

    const { error: roomCompleteError } = await supabase
      .from("rooms")
      .update({
        status: "results",
        active_round_id: null
      })
      .eq("id", room.id);

    if (roomCompleteError) {
      throw roomCompleteError;
    }

    return json({ success: true, roundId });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Unable to score round."
      },
      { status: 400 }
    );
  }
});
