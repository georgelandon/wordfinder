import QRCode from "react-qr-code";
import type { PlayerRecord, RoomPresenceEntry } from "@shared/types";
import { Panel } from "@/components/Panel";

interface DisplayLobbyProps {
  roomCode: string;
  joinUrl: string;
  players: PlayerRecord[];
  hostPlayerId: string | null;
  presence: RoomPresenceEntry[];
}

export function DisplayLobby({
  roomCode,
  joinUrl,
  players,
  hostPlayerId,
  presence
}: DisplayLobbyProps) {
  const readyPlayers = players.filter((player) => player.ready).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
      <Panel
        title="Scan To Join"
        subtitle="Every phone becomes a controller. The first player in becomes the host."
        className="min-h-[32rem] p-8"
      >
        <div className="grid h-full gap-6 md:grid-cols-[1fr,0.8fr]">
          <div className="flex flex-col justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-mist/55">Room Code</p>
              <p className="mt-3 font-display text-7xl text-surf sm:text-8xl">{roomCode}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-mist/55">Players</p>
                <p className="mt-3 font-display text-5xl text-gold">{players.length}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-mist/55">Ready</p>
                <p className="mt-3 font-display text-5xl text-mint">{readyPlayers}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-mist/55">Watching</p>
                <p className="mt-3 font-display text-5xl text-teal">{presence.length}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center rounded-[2rem] border border-white/10 bg-white p-6 text-ink">
            <QRCode value={joinUrl} size={280} />
          </div>
        </div>
      </Panel>
      <Panel title="Lobby" subtitle="The host starts the next round from their phone.">
        <div className="space-y-3">
          {players.length > 0 ? (
            players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4"
              >
                <div>
                  <p className="text-xl font-semibold text-surf">
                    {player.nickname}
                    {player.id === hostPlayerId ? " - Host" : ""}
                  </p>
                  <p className="text-sm text-mist/60">
                    {player.connected ? "Connected" : "Reconnecting"}
                  </p>
                </div>
                <div
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    player.ready
                      ? "bg-mint/15 text-mint"
                      : "bg-white/10 text-mist/65"
                  }`}
                >
                  {player.ready ? "Ready" : "Waiting"}
                </div>
              </div>
            ))
          ) : (
            <p className="text-lg text-mist/70">Waiting for the first phone to connect.</p>
          )}
        </div>
      </Panel>
    </div>
  );
}
