import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Panel } from "@/components/Panel";
import { createOrJoinRoom } from "@/lib/roomApi";
import { routes } from "@/lib/routes";
import { useSessionStore } from "@/store/sessionStore";

export function RoomPage() {
  const navigate = useNavigate();
  const preferredNickname = useSessionStore((state) => state.preferredNickname);
  const rememberRoomNickname = useSessionStore((state) => state.rememberRoomNickname);
  const [nickname, setNickname] = useState(preferredNickname);
  const [roomCode, setRoomCode] = useState("");
  const [loadingMode, setLoadingMode] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoadingMode("create");
    setError(null);
    try {
      const response = await createOrJoinRoom({
        nickname,
        createIfMissing: true
      });
      rememberRoomNickname(response.room.code, nickname);
      navigate(routes.controller(response.room.code));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not create room.");
    } finally {
      setLoadingMode(null);
    }
  };

  const handleJoin = async () => {
    setLoadingMode("join");
    setError(null);
    try {
      const response = await createOrJoinRoom({
        nickname,
        roomCode,
        createIfMissing: false
      });
      rememberRoomNickname(response.room.code, nickname);
      navigate(routes.controller(response.room.code));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not join room.");
    } finally {
      setLoadingMode(null);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr,0.8fr]">
      <Panel title="Create A Party Room" subtitle="Make a room, become the first host, then open the TV display from the controller screen.">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-mist/70">Nickname</span>
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={24}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-surf outline-none placeholder:text-mist/35 focus:border-gold/50"
              placeholder="Party host"
            />
          </label>
          <button
            type="button"
            disabled={loadingMode !== null || nickname.trim().length === 0}
            onClick={() => void handleCreate()}
            className="rounded-2xl bg-gold px-5 py-3 font-semibold text-ink disabled:opacity-60"
          >
            {loadingMode === "create" ? "Creating..." : "Create Room"}
          </button>
        </div>
      </Panel>
      <Panel title="Join A Room" subtitle="Already have a TV code? Jump straight into your phone controller.">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-mist/70">Nickname</span>
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={24}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-surf outline-none placeholder:text-mist/35 focus:border-gold/50"
              placeholder="Word hunter"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/70">Room Code</span>
            <input
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
              maxLength={6}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-surf outline-none placeholder:text-mist/35 focus:border-gold/50"
              placeholder="ABCDE"
            />
          </label>
          <button
            type="button"
            disabled={
              loadingMode !== null ||
              nickname.trim().length === 0 ||
              roomCode.trim().length < 4
            }
            onClick={() => void handleJoin()}
            className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 font-semibold text-surf disabled:opacity-60"
          >
            {loadingMode === "join" ? "Joining..." : "Join Room"}
          </button>
          {error ? <p className="text-sm text-coral">{error}</p> : null}
        </div>
      </Panel>
    </div>
  );
}

