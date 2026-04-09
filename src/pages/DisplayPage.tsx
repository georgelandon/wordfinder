import { MonitorUp, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { DisplayLobby } from "@/components/display/DisplayLobby";
import { DisplayRound } from "@/components/display/DisplayRound";
import { DisplaySummary } from "@/components/display/DisplaySummary";
import { Panel } from "@/components/Panel";
import { useRoomSnapshot } from "@/hooks/useRoomSnapshot";
import { useServerNow } from "@/hooks/useServerNow";
import { buildHashUrl } from "@/lib/links";
import { routes } from "@/lib/routes";

export function DisplayPage() {
  const params = useParams();
  const roomCode = (params.roomCode ?? "").toUpperCase();
  const { snapshot, loading, error, refresh, serverOffsetMs } = useRoomSnapshot({
    roomCode,
    presenceKind: "display",
    presenceLabel: "TV Display"
  });
  const joinUrl = useMemo(() => buildHashUrl(routes.controller(roomCode)), [roomCode]);
  const serverNow = useServerNow(serverOffsetMs, Boolean(snapshot?.activeRound));
  const liveRoundStorageKey = useMemo(() => `bp-display-live-round:${roomCode}`, [roomCode]);
  const celebrationRoundStorageKey = useMemo(
    () => `bp-display-celebration-round:${roomCode}`,
    [roomCode]
  );
  const celebrationAnchorStorageKey = useMemo(
    () => `bp-display-celebration-anchor:${roomCode}`,
    [roomCode]
  );
  const [celebrationAnchorMs, setCelebrationAnchorMs] = useState<number | null>(null);
  const shouldShowResults =
    snapshot?.room.status === "results" ||
    snapshot?.latestRound?.status === "results" ||
    Boolean(
      snapshot?.latestRound?.results_published_at ??
        snapshot?.latestRound?.summary_ready_at ??
        snapshot?.latestRound?.scored_at
    );
  const recoveryReloadedRef = useRef(false);
  const expiredRoundId =
    snapshot?.activeRound &&
    !shouldShowResults &&
    serverNow >= new Date(snapshot.activeRound.ends_at).getTime() + 1000
      ? snapshot.activeRound.id
      : null;

  useEffect(() => {
    recoveryReloadedRef.current = false;
  }, [snapshot?.latestRound?.id]);

  useEffect(() => {
    if (!roomCode || !snapshot?.activeRound?.id) {
      return;
    }

    try {
      window.sessionStorage.setItem(liveRoundStorageKey, snapshot.activeRound.id);

      if (snapshot.latestRound?.id !== snapshot.activeRound.id) {
        window.sessionStorage.removeItem(celebrationRoundStorageKey);
        window.sessionStorage.removeItem(celebrationAnchorStorageKey);
      }
    } catch {
      // Ignore storage failures and fall back to server timestamps only.
    }
  }, [
    celebrationAnchorStorageKey,
    celebrationRoundStorageKey,
    liveRoundStorageKey,
    roomCode,
    snapshot?.activeRound?.id,
    snapshot?.latestRound?.id
  ]);

  useEffect(() => {
    if (!roomCode || snapshot?.latestRound?.status !== "results") {
      setCelebrationAnchorMs(null);
      return;
    }

    try {
      const storedCelebrationRoundId = window.sessionStorage.getItem(
        celebrationRoundStorageKey
      );
      const storedCelebrationAnchorMs = Number(
        window.sessionStorage.getItem(celebrationAnchorStorageKey)
      );

      if (
        storedCelebrationRoundId === snapshot.latestRound.id &&
        Number.isFinite(storedCelebrationAnchorMs)
      ) {
        setCelebrationAnchorMs(storedCelebrationAnchorMs);
        return;
      }

      const storedLiveRoundId = window.sessionStorage.getItem(liveRoundStorageKey);
      if (storedLiveRoundId === snapshot.latestRound.id) {
        window.sessionStorage.setItem(celebrationRoundStorageKey, snapshot.latestRound.id);
        window.sessionStorage.setItem(celebrationAnchorStorageKey, String(serverNow));
        window.sessionStorage.removeItem(liveRoundStorageKey);
        setCelebrationAnchorMs(serverNow);
        return;
      }
    } catch {
      // Ignore storage failures and fall back to server timestamps only.
    }

    setCelebrationAnchorMs(null);
  }, [
    celebrationAnchorStorageKey,
    celebrationRoundStorageKey,
    liveRoundStorageKey,
    roomCode,
    serverNow,
    snapshot?.latestRound?.id,
    snapshot?.latestRound?.status
  ]);

  useEffect(() => {
    if (!expiredRoundId) {
      return;
    }

    const pollInterval = window.setInterval(() => {
      void refresh().catch(() => undefined);
    }, 1_500);

    const reloadTimeout = window.setTimeout(() => {
      if (recoveryReloadedRef.current) {
        return;
      }

      recoveryReloadedRef.current = true;
      window.location.reload();
    }, 8_000);

    return () => {
      window.clearInterval(pollInterval);
      window.clearTimeout(reloadTimeout);
    };
  }, [expiredRoundId, refresh]);

  if (!roomCode) {
    return <div className="safe-pad text-surf">Missing room code.</div>;
  }

  return (
    <div className="min-h-screen bg-grain tv-safe">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1600px] flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-mist/55">Display Mode</p>
            <h1 className="font-display text-4xl text-surf sm:text-5xl">
              Boggle Party
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-surf"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => void document.documentElement.requestFullscreen?.()}
              className="inline-flex items-center gap-2 rounded-2xl bg-gold px-4 py-3 font-semibold text-ink"
            >
              <MonitorUp className="h-5 w-5" />
              Fullscreen
            </button>
          </div>
        </div>

        {loading ? (
          <Panel title="Connecting display..." subtitle="Subscribing to room updates." />
        ) : error ? (
          <Panel title="Display error" subtitle={error} />
        ) : !snapshot ? (
          <Panel title="Room not found" subtitle="Double-check the display code." />
        ) : snapshot.room.status === "lobby" ? (
          <DisplayLobby
            roomCode={snapshot.room.code}
            joinUrl={joinUrl}
            players={snapshot.players}
            hostPlayerId={snapshot.room.host_player_id}
            presence={snapshot.presence}
          />
        ) : shouldShowResults && snapshot.latestRound ? (
          <DisplaySummary
            round={snapshot.latestRound}
            players={snapshot.players}
            scoredWords={snapshot.scoredWords}
            serverOffsetMs={serverOffsetMs}
            presentationAnchorMs={celebrationAnchorMs}
            roundTotals={snapshot.roundTotals.map((item) => ({
              playerId: item.player_id,
              totalPoints: item.total_points,
              validWordCount: item.valid_word_count,
              duplicateWordCount: item.duplicate_word_count,
              invalidWordCount: item.invalid_word_count,
              rank: item.rank ?? 0
            }))}
            sessionTotals={snapshot.sessionTotals}
          />
        ) : snapshot.activeRound ? (
          <DisplayRound
            room={snapshot.room}
            round={snapshot.activeRound}
            players={snapshot.players}
            submissions={snapshot.submissions}
            serverOffsetMs={serverOffsetMs}
          />
        ) : snapshot.latestRound ? (
          <DisplaySummary
            round={snapshot.latestRound}
            players={snapshot.players}
            scoredWords={snapshot.scoredWords}
            serverOffsetMs={serverOffsetMs}
            presentationAnchorMs={celebrationAnchorMs}
            roundTotals={snapshot.roundTotals.map((item) => ({
              playerId: item.player_id,
              totalPoints: item.total_points,
              validWordCount: item.valid_word_count,
              duplicateWordCount: item.duplicate_word_count,
              invalidWordCount: item.invalid_word_count,
              rank: item.rank ?? 0
            }))}
            sessionTotals={snapshot.sessionTotals}
          />
        ) : (
          <Panel title="Waiting for the first round" subtitle="The host starts the action from their phone." />
        )}
      </div>
    </div>
  );
}
