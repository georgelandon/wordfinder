export const routes = {
  landing: "/",
  room: "/room",
  display: (roomCode: string) => `/display/${roomCode.toUpperCase()}`,
  controller: (roomCode: string) => `/controller/${roomCode.toUpperCase()}`,
  results: (roomCode: string, roundId: string) =>
    `/results/${roomCode.toUpperCase()}/${roundId}`
};
