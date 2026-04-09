import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { DeviceKind, RoomPresenceEntry, RoomSnapshot } from "@shared/types";
import { endRoundAndScore, fetchRoomSnapshot, setPlayerState } from "@/lib/roomApi";
import { supabase } from "@/lib/supabase";
import { getServerOffsetMs, nowWithOffset } from "@/lib/time";
import { useAnonymousAuth } from "./useAnonymousAuth";

interface UseRoomSnapshotOptions {
  roomCode: string;
  presenceLabel?: string;
  presenceKind?: DeviceKind;
  playerConnected?: boolean;
  enableHeartbeat?: boolean;
}

function flattenPresence(channel: RealtimeChannel) {
  const state = channel.presenceState<RoomPresenceEntry>();
  return Object.entries(state).flatMap(([key, entries]) =>
    entries.map((entry) => ({
      ...entry,
      key
    }))
  );
}

export function useRoomSnapshot({
  roomCode,
  presenceLabel = "Viewer",
  presenceKind = "display",
  playerConnected = true,
  enableHeartbeat = false
}: UseRoomSnapshotOptions) {
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  const { user, loading: authLoading, error: authError } = useAnonymousAuth();
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(authError);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const presenceRef = useRef<RoomPresenceEntry[]>([]);
  const pendingAutoCloseRef = useRef<string | null>(null);
  const roomId = snapshot?.room.id ?? null;
  const roomStatus = snapshot?.room.status ?? null;
  const activeRoundId = snapshot?.activeRound?.id ?? null;
  const activeRoundStatus = snapshot?.activeRound?.status ?? null;
  const activeRoundEndsAt = snapshot?.activeRound?.ends_at ?? null;
  const latestRoundId = snapshot?.latestRound?.id ?? null;

  const refresh = useCallback(async () => {
    if (!user || !normalizedRoomCode) {
      return;
    }

    const next = await fetchRoomSnapshot(normalizedRoomCode, presenceRef.current);
    setSnapshot(next);
  }, [normalizedRoomCode, user]);

  useEffect(() => {
    setError(authError);
  }, [authError]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    void Promise.all([refresh(), getServerOffsetMs()])
      .then(([_, offset]) => {
        if (!cancelled) {
          setServerOffsetMs(offset);
          setLoading(false);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Room sync failed.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refresh, user]);

  useEffect(() => {
    if (!user || !roomId) {
      return;
    }

    const detailRoundId =
      (roomStatus === "results" || roomStatus === "scoring"
        ? latestRoundId
        : activeRoundId ?? latestRoundId) ?? null;

    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        presence: {
          key: `${presenceKind}:${user.id}`
        }
      }
    });

    channel.on("presence", { event: "sync" }, () => {
      const nextPresence = flattenPresence(channel);
      presenceRef.current = nextPresence;
      setSnapshot((current) => (current ? { ...current, presence: nextPresence } : current));
    });

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
      () => void refresh()
    );
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "players",
        filter: `room_id=eq.${roomId}`
      },
      () => void refresh()
    );
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "rounds",
        filter: `room_id=eq.${roomId}`
      },
      () => void refresh()
    );
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "session_totals",
        filter: `room_id=eq.${roomId}`
      },
      () => void refresh()
    );

    if (detailRoundId) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
          filter: `round_id=eq.${detailRoundId}`
        },
        () => void refresh()
      );
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "round_totals",
          filter: `round_id=eq.${detailRoundId}`
        },
        () => void refresh()
      );
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scored_words",
          filter: `round_id=eq.${detailRoundId}`
        },
        () => void refresh()
      );
    }

    void channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          userId: user.id,
          label: presenceLabel,
          kind: presenceKind,
          joinedAt: new Date().toISOString()
        } satisfies Omit<RoomPresenceEntry, "key">);
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    activeRoundId,
    latestRoundId,
    presenceKind,
    presenceLabel,
    refresh,
    roomId,
    roomStatus,
    user
  ]);

  useEffect(() => {
    if (!enableHeartbeat || !user) {
      return;
    }

    const heartbeat = () => {
      void setPlayerState({
        roomCode: normalizedRoomCode,
        connected: playerConnected
      }).catch(() => undefined);
    };

    heartbeat();
    const interval = window.setInterval(heartbeat, 12_000);

    const onVisibilityChange = () => {
      void setPlayerState({
        roomCode: normalizedRoomCode,
        connected: document.visibilityState === "visible"
      }).catch(() => undefined);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void setPlayerState({
        roomCode: normalizedRoomCode,
        connected: false
      }).catch(() => undefined);
    };
  }, [enableHeartbeat, normalizedRoomCode, playerConnected, user]);

  useEffect(() => {
    if (!activeRoundId || !activeRoundEndsAt || activeRoundStatus === "results") {
      return;
    }

    const tick = window.setInterval(() => {
      const expired =
        nowWithOffset(serverOffsetMs) >= new Date(activeRoundEndsAt).getTime() + 1000;
      const readyToClose =
        (activeRoundStatus === "active" || activeRoundStatus === "countdown") &&
        pendingAutoCloseRef.current !== activeRoundId;

      if (expired && readyToClose) {
        pendingAutoCloseRef.current = activeRoundId;
        void endRoundAndScore({
          roomCode: normalizedRoomCode,
          roundId: activeRoundId
        })
          .then(() => refresh())
          .catch(() => undefined)
          .finally(() => {
            pendingAutoCloseRef.current = null;
          });
      }
    }, 1_000);

    return () => clearInterval(tick);
  }, [activeRoundEndsAt, activeRoundId, activeRoundStatus, normalizedRoomCode, refresh, serverOffsetMs]);

  useEffect(() => {
    if (!user || !snapshot) {
      return;
    }

    const roundExpired = activeRoundEndsAt
      ? nowWithOffset(serverOffsetMs) >= new Date(activeRoundEndsAt).getTime() + 1000
      : false;
    const shouldPoll =
      roomStatus === "scoring" ||
      activeRoundStatus === "scoring" ||
      (Boolean(activeRoundId) && roundExpired);

    if (!shouldPoll) {
      return;
    }

    const interval = window.setInterval(() => {
      void refresh().catch(() => undefined);
    }, 1_500);

    return () => clearInterval(interval);
  }, [
    activeRoundEndsAt,
    activeRoundId,
    activeRoundStatus,
    refresh,
    roomStatus,
    serverOffsetMs,
    snapshot,
    user
  ]);

  return useMemo(
    () => ({
      user,
      loading: authLoading || loading,
      error,
      snapshot,
      refresh,
      serverOffsetMs
    }),
    [authLoading, error, loading, refresh, serverOffsetMs, snapshot, user]
  );
}
