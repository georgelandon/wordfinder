import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { DailyHistoryEntry } from "@shared/types";

interface SessionStoreState {
  preferredNickname: string;
  roomNicknames: Record<string, string>;
  recentRoomCode: string | null;
  dailyHistory: DailyHistoryEntry[];
  setPreferredNickname: (nickname: string) => void;
  rememberRoomNickname: (roomCode: string, nickname: string) => void;
  addDailyHistory: (entry: DailyHistoryEntry) => void;
}

export const useSessionStore = create<SessionStoreState>()(
  persist(
    (set) => ({
      preferredNickname: "",
      roomNicknames: {},
      recentRoomCode: null,
      dailyHistory: [],
      setPreferredNickname: (nickname) =>
        set({
          preferredNickname: nickname
        }),
      rememberRoomNickname: (roomCode, nickname) =>
        set((state) => ({
          roomNicknames: {
            ...state.roomNicknames,
            [roomCode.toUpperCase()]: nickname
          },
          preferredNickname: nickname,
          recentRoomCode: roomCode.toUpperCase()
        })),
      addDailyHistory: (entry) =>
        set((state) => ({
          dailyHistory: [
            entry,
            ...state.dailyHistory.filter((item) => item.date !== entry.date)
          ].slice(0, 30)
        }))
    }),
    {
      name: "boggle-party-session",
      storage: createJSONStorage(() => localStorage)
    }
  )
);

