import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SessionStoreState {
  preferredNickname: string;
  roomNicknames: Record<string, string>;
  recentRoomCode: string | null;
  setPreferredNickname: (nickname: string) => void;
  rememberRoomNickname: (roomCode: string, nickname: string) => void;
}

export const useSessionStore = create<SessionStoreState>()(
  persist(
    (set) => ({
      preferredNickname: "",
      roomNicknames: {},
      recentRoomCode: null,
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
        }))
    }),
    {
      name: "boggle-party-session",
      storage: createJSONStorage(() => localStorage)
    }
  )
);
