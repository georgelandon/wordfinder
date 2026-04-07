import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { RoomRecord, SessionTotalRecord } from "@shared/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSeconds(totalSeconds: number) {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function titleCaseStatus(status: string) {
  return status
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function isHost(room: Pick<RoomRecord, "host_player_id">, playerId?: string | null) {
  return Boolean(playerId && room.host_player_id === playerId);
}

export function sortSessionTotals(
  totals: SessionTotalRecord[],
  fallbackOrder: string[]
) {
  const order = new Map(fallbackOrder.map((id, index) => [id, index]));
  return [...totals].sort((left, right) => {
    if (right.cumulative_points !== left.cumulative_points) {
      return right.cumulative_points - left.cumulative_points;
    }
    if (right.words_found !== left.words_found) {
      return right.words_found - left.words_found;
    }
    return (order.get(left.player_id) ?? 999) - (order.get(right.player_id) ?? 999);
  });
}

export async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

