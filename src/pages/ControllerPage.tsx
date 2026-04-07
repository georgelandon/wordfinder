import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { canStartRound } from "@shared/game/session";
import { normalizeWord } from "@shared/game/validation";
import { ControllerJoinCard } from "@/components/controller/ControllerJoinCard";
import { ControllerResults } from "@/components/controller/ControllerResults";
import { HostPanel } from "@/components/controller/HostPanel";
import { MobileBoard } from "@/components/controller/MobileBoard";
import { Panel } from "@/components/Panel";
import { StatusPill } from "@/components/StatusPill";
import { useRoomSnapshot } from "@/hooks/useRoomSnapshot";
import { buildHashUrl } from "@/lib/links";
import {
  createOrJoinRoom,
  resolveCurrentPlayer,
  setPlayerState,
  startRound,
  submitWords
} from "@/lib/roomApi";
import { routes } from "@/lib/routes";
import { useSessionStore } from "@/store/sessionStore";

export function ControllerPage() {
  const params = useParams();
  const roomCode = (params.roomCode ?? "").toUpperCase();
  const rememberedNickname = useSessionStore(
    (state) => state.roomNicknames[roomCode] ?? state.preferredNickname
  );
  const rememberRoomNickname = useSessionStore((state) => state.rememberRoomNickname);
  const { user, snapshot, loading, error, refresh, serverOffsetMs } = useRoomSnapshot({
    roomCode,
    presenceKind: "controller",
    presenceLabel: rememberedNickname || "Controller",
    enableHeartbeat: true
  });
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [localWords, setLocalWords] = useState<string[]>([]);
  const queueRef = useRef<string[]>([]);
  const flushTimerRef = useRef<number | null>(null);

  const currentPlayer = resolveCurrentPlayer(snapshot?.players ?? [], user?.id);
  const activeRound = snapshot?.activeRound ?? null;
  const displayUrl = useMemo(() => buildHashUrl(routes.display(roomCode)), [roomCode]);

  useEffect(() => {
    if (!activeRound || !currentPlayer) {
      setLocalWords([]);
      return;
    }

    const persisted = (snapshot?.submissions ?? [])
      .filter((item) => item.player_id === currentPlayer.id)
      .map((item) => item.normalized_word);
    setLocalWords(Array.from(new Set(persisted)));
  }, [activeRound?.id, currentPlayer?.id, snapshot?.submissions]);

  useEffect(
    () => () => {
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
      }
    },
    []
  );

  const enqueueWord = (word: string) => {
    if (!activeRound || !currentPlayer) {
      return;
    }

    queueRef.current = [...queueRef.current, word];
    if (flushTimerRef.current) {
      return;
    }

    flushTimerRef.current = window.setTimeout(() => {
      const batch = [...queueRef.current];
      queueRef.current = [];
      flushTimerRef.current = null;
      void submitWords(activeRound.id, currentPlayer.id, batch).catch(() => undefined);
    }, 600);
  };

  const handleJoin = async (nickname: string) => {
    setJoining(true);
    setActionError(null);
    try {
      const response = await createOrJoinRoom({
        nickname,
        roomCode,
        createIfMissing: false
      });
      rememberRoomNickname(response.room.code, nickname);
      await refresh();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : "Could not join room.");
    } finally {
      setJoining(false);
    }
  };

  const toggleReady = async () => {
    if (!currentPlayer) {
      return;
    }

    setActionError(null);
    try {
      await setPlayerState({
        roomCode,
        connected: true,
        ready: !currentPlayer.ready
      });
      await refresh();
    } catch (nextError) {
      setActionError(
        nextError instanceof Error ? nextError.message : "Could not update ready state."
      );
    }
  };

  const handleStartRound = async (durationSeconds: number) => {
    setStarting(true);
    setActionError(null);
    try {
      await startRound({
        roomCode,
        durationSeconds
      });
      await refresh();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : "Could not start round.");
    } finally {
      setStarting(false);
    }
  };

  const canHostStart =
    snapshot !== null &&
    canStartRound(snapshot.room.status, snapshot.activeRound, snapshot.latestRound);

  const personalRoundTotal = snapshot?.roundTotals.find(
    (item) => item.player_id === currentPlayer?.id
  );
  const personalSessionTotal = snapshot?.sessionTotals.find(
    (item) => item.player_id === currentPlayer?.id
  );
  const personalScoredWords = (snapshot?.scoredWords ?? []).filter(
    (item) => item.player_id === currentPlayer?.id
  );

  if (!roomCode) {
    return <Panel title="Missing room code" subtitle="Open a controller link from a valid room." />;
  }

  if (loading) {
    return <Panel title="Connecting controller..." subtitle="Restoring your session." />;
  }

  if (error) {
    return <Panel title="Controller error" subtitle={error} />;
  }

  if (!snapshot) {
    return <Panel title="Room not found" subtitle="Check the room code and try again." />;
  }

  if (!currentPlayer) {
    return (
      <ControllerJoinCard
        roomCode={roomCode}
        defaultNickname={rememberedNickname}
        loading={joining}
        onJoin={handleJoin}
      />
    );
  }

  const isHost = snapshot.room.host_player_id === currentPlayer.id;
  const isRoundLive =
    activeRound && (activeRound.status === "countdown" || activeRound.status === "active");

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr,0.8fr]">
        <Panel
          title={`${currentPlayer.nickname} - ${isHost ? "Host" : "Player"}`}
          subtitle={`Room ${snapshot.room.code} - Display stays on the TV while you control from your phone.`}
          headerRight={<StatusPill status={snapshot.room.status} />}
        >
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void toggleReady()}
              className={`rounded-2xl px-4 py-3 font-semibold ${
                currentPlayer.ready
                  ? "bg-mint/15 text-mint"
                  : "border border-white/10 bg-white/[0.05] text-surf"
              }`}
            >
              {currentPlayer.ready ? "Ready" : "Mark Ready"}
            </button>
            <a
              href={displayUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 font-semibold text-surf"
            >
              <ExternalLink className="h-4 w-4" />
              Open TV Display
            </a>
          </div>
          {actionError ? <p className="mt-4 text-sm text-coral">{actionError}</p> : null}
        </Panel>
        {isHost ? (
          <HostPanel
            disabled={Boolean(isRoundLive)}
            loading={starting}
            canStart={canHostStart}
            playerCount={snapshot.players.length}
            onStartRound={handleStartRound}
          />
        ) : (
          <Panel
            title="Stand By"
            subtitle="The host controls round starts, but your ready state and submissions stay synced in realtime."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-mist/55">Players</p>
                <p className="mt-2 font-display text-4xl text-gold">{snapshot.players.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-mist/55">Round</p>
                <p className="mt-2 font-display text-4xl text-surf">
                  {snapshot.latestRound?.round_number ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-mist/55">Clock Sync</p>
                <p className="mt-2 font-display text-4xl text-teal">
                  {Math.abs(Math.round(serverOffsetMs))}ms
                </p>
              </div>
            </div>
          </Panel>
        )}
      </div>

      {activeRound && isRoundLive ? (
        <MobileBoard
          board={activeRound.board}
          submittedWords={localWords}
          onSubmitWord={(word) => {
            const normalized = normalizeWord(word);
            if (localWords.includes(normalized)) {
              return;
            }
            setLocalWords((current) => [...current, normalized]);
            enqueueWord(normalized);
          }}
        />
      ) : (
        <ControllerResults
          player={currentPlayer}
          roundTotal={
            personalRoundTotal
              ? {
                  playerId: personalRoundTotal.player_id,
                  totalPoints: personalRoundTotal.total_points,
                  validWordCount: personalRoundTotal.valid_word_count,
                  duplicateWordCount: personalRoundTotal.duplicate_word_count,
                  invalidWordCount: personalRoundTotal.invalid_word_count,
                  rank: personalRoundTotal.rank ?? 0
                }
              : undefined
          }
          sessionTotal={personalSessionTotal}
          scoredWords={personalScoredWords}
        />
      )}
    </div>
  );
}
