import { useEffect, useState } from "react";
import { nowWithOffset } from "@/lib/time";

export function useServerNow(
  serverOffsetMs: number,
  enabled = true,
  intervalMs = 250
) {
  const [now, setNow] = useState(() => nowWithOffset(serverOffsetMs));

  useEffect(() => {
    setNow(nowWithOffset(serverOffsetMs));

    if (!enabled) {
      return;
    }

    const interval = window.setInterval(() => {
      setNow(nowWithOffset(serverOffsetMs));
    }, intervalMs);

    return () => clearInterval(interval);
  }, [enabled, intervalMs, serverOffsetMs]);

  return now;
}
