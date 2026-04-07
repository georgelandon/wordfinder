import { describe, expect, it } from "vitest";
import { generateSeededBoard } from "@shared/game/board";

describe("generateSeededBoard", () => {
  it("returns the same board for the same seed", () => {
    expect(generateSeededBoard("room-1")).toEqual(generateSeededBoard("room-1"));
  });

  it("returns a 4x4 grid by default", () => {
    const board = generateSeededBoard("room-2");
    expect(board).toHaveLength(4);
    expect(board.every((row) => row.length === 4)).toBe(true);
    expect(board.flat()).toHaveLength(16);
  });

  it("changes layout when the seed changes", () => {
    expect(generateSeededBoard("room-1")).not.toEqual(generateSeededBoard("room-3"));
  });
});
