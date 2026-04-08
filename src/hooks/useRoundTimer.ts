import { useServerNow } from "./useServerNow";

export function useRoundTimer(
  startsAt: string | undefined,
  endsAt: string | undefined,
  serverOffsetMs: number
) {
  const now = useServerNow(serverOffsetMs);

  if (!startsAt || !endsAt) {
    return {
      phase: "idle" as const,
      secondsRemaining: 0,
      progress: 0
    };
  }

  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();
  const durationMs = Math.max(1, endMs - startMs);

  if (now < startMs) {
    return {
      phase: "countdown" as const,
      secondsRemaining: Math.ceil((startMs - now) / 1000),
      progress: 0
    };
  }

  if (now >= endMs) {
    return {
      phase: "expired" as const,
      secondsRemaining: 0,
      progress: 1
    };
  }

  return {
    phase: "active" as const,
    secondsRemaining: Math.ceil((endMs - now) / 1000),
    progress: Math.min(1, Math.max(0, (now - startMs) / durationMs))
  };
}
