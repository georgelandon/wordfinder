import { useState } from "react";
import { Panel } from "@/components/Panel";

interface ControllerJoinCardProps {
  roomCode: string;
  defaultNickname?: string;
  loading?: boolean;
  onJoin: (nickname: string) => Promise<void> | void;
}

export function ControllerJoinCard({
  roomCode,
  defaultNickname = "",
  loading = false,
  onJoin
}: ControllerJoinCardProps) {
  const [nickname, setNickname] = useState(defaultNickname);

  return (
    <Panel
      title={`Join ${roomCode}`}
      subtitle="Pick a nickname and bind this phone as your controller."
      className="mx-auto max-w-lg"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onJoin(nickname);
        }}
      >
        <label className="block">
          <span className="mb-2 block text-sm text-mist/70">Nickname</span>
          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            maxLength={24}
            required
            className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-surf outline-none ring-0 placeholder:text-mist/35 focus:border-gold/50"
            placeholder="Word wizard"
          />
        </label>
        <button
          type="submit"
          disabled={loading || nickname.trim().length === 0}
          className="w-full rounded-2xl bg-gold px-4 py-3 font-semibold text-ink transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Joining..." : "Join Controller"}
        </button>
      </form>
    </Panel>
  );
}

