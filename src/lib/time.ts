import { supabase } from "./supabase";

export async function getServerOffsetMs() {
  const startedAt = Date.now();
  const { data, error } = await supabase.rpc("get_server_time");
  if (error) {
    throw error;
  }

  const finishedAt = Date.now();
  const midpoint = startedAt + (finishedAt - startedAt) / 2;
  return new Date(data as string).getTime() - midpoint;
}

export function nowWithOffset(offsetMs: number) {
  return Date.now() + offsetMs;
}

export function secondsUntil(targetIso: string, offsetMs: number) {
  const delta = new Date(targetIso).getTime() - nowWithOffset(offsetMs);
  return Math.max(0, Math.ceil(delta / 1000));
}

