import { describe, expect, it } from "vitest";
import {
  beginSelectionPath,
  extendSelectionPath,
  findWordPath,
  validatePath
} from "@shared/game/validation";

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

  it("extends drag selection and trims when dragging backward", () => {
    expect(extendSelectionPath([0], 1, board.length)).toEqual([0, 1]);
    expect(extendSelectionPath([0, 1, 2], 1, board.length)).toEqual([0, 1]);
  });

  it("starts a fresh gesture on a non-adjacent tile", () => {
    expect(beginSelectionPath([0, 1], 15, board.length)).toEqual([15]);
  });
});
