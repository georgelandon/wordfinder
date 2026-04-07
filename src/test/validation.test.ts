import { describe, expect, it } from "vitest";
import { findWordPath, validatePath } from "@shared/game/validation";

const board = [
  ["Qu", "E", "S", "T"],
  ["A", "B", "C", "D"],
  ["L", "I", "N", "E"],
  ["R", "O", "A", "D"]
];

describe("board validation", () => {
  it("finds a valid path for a word on the board", () => {
    const path = findWordPath(board, "line");
    expect(path).not.toBeNull();
    expect(validatePath(board, path ?? [], "line")).toBe(true);
  });

  it("supports Qu tiles as a single board step", () => {
    const path = findWordPath(board, "quest");
    expect(path).not.toBeNull();
    expect(path?.length).toBe(4);
  });

  it("rejects words that cannot be traced", () => {
    expect(findWordPath(board, "stone")).toBeNull();
  });
});

