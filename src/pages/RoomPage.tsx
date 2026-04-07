import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Panel } from "@/components/Panel";
import { createOrJoinRoom, createRoom } from "@/lib/roomApi";
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
      const response = await createRoom();
      navigate(routes.display(response.room.code));
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
      <Panel
        title="Create A Party Room"
        subtitle="Create an empty room for the TV first. The first phone that scans the QR code and joins becomes host."
      >
        <div className="space-y-4">
          <p className="max-w-2xl text-sm leading-7 text-mist/70">
            This step does not create a player. It only spins up the room and opens the
            display view so phones can scan in.
          </p>
          <button
            type="button"
            disabled={loadingMode !== null}
            onClick={() => void handleCreate()}
            className="rounded-2xl bg-gold px-5 py-3 font-semibold text-ink disabled:opacity-60"
          >
            {loadingMode === "create" ? "Creating..." : "Create Room And Open Display"}
          </button>
        </div>
      </Panel>
      <Panel
        title="Join A Room"
        subtitle="Only phones that join here become players. The first phone into the room becomes host."
      >
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
