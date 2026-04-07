import { BOGGLE_DICE_4X4, DEFAULT_BOARD_SIZE } from "./constants";
import { seededRandom, shuffleWithSeed } from "./random";
import type { BoardMatrix } from "../types";

function normalizeDieFace(face: string) {
  return face === "Q" ? "Qu" : face;
}

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size)
  );
}

export function generateSeededBoard(
  seed: string,
  boardSize = DEFAULT_BOARD_SIZE
): BoardMatrix {
  if (boardSize !== 4) {
    throw new Error("This implementation currently supports 4x4 boards only.");
  }

  const random = seededRandom(`${seed}:rolls`);
  const dice = shuffleWithSeed(BOGGLE_DICE_4X4, `${seed}:dice`);
  const faces = dice.map((die) => {
    const choice = die[Math.floor(random() * die.length)];
    return normalizeDieFace(choice);
  });

  return chunk(shuffleWithSeed(faces, `${seed}:layout`), boardSize);
}

export function boardToSeedLabel(seed: string, roundNumber: number) {
  return `R${String(roundNumber).padStart(2, "0")} - ${seed.slice(0, 8)}`;
}

export function flattenBoard(board: BoardMatrix) {
  return board.flat();
}
