import { describe, expect, it } from "vitest";
import { scoreRound, scoreWordLength } from "@shared/game/scoring";

const board = [
  ["C", "A", "T", "S"],
  ["D", "O", "G", "E"],
  ["F", "I", "S", "H"],
  ["B", "I", "R", "D"]
];

describe("scoreWordLength", () => {
  it("uses classic Boggle scoring", () => {
    expect(scoreWordLength(3)).toBe(1);
    expect(scoreWordLength(4)).toBe(1);
    expect(scoreWordLength(5)).toBe(2);
    expect(scoreWordLength(6)).toBe(3);
    expect(scoreWordLength(7)).toBe(5);
    expect(scoreWordLength(8)).toBe(11);
  });
});

describe("scoreRound", () => {
  it("deduplicates repeat submissions from the same player and across players", () => {
    const result = scoreRound({
      board,
      dictionary: new Set(["cat", "dog", "fish"]),
      submissions: [
        { playerId: "p1", word: "cat" },
        { playerId: "p1", word: "cat" },
        { playerId: "p1", word: "dog" },
        { playerId: "p2", word: "dog" },
        { playerId: "p2", word: "fish" }
      ]
    });

    const p1 = result.roundTotals.find((item) => item.playerId === "p1");
    const p2 = result.roundTotals.find((item) => item.playerId === "p2");
    expect(p1?.totalPoints).toBe(1);
    expect(p2?.totalPoints).toBe(1);
    expect(
      result.scoredWords.filter((item) => item.status === "duplicate_global")
    ).toHaveLength(2);
    expect(
      result.scoredWords.filter((item) => item.status === "duplicate_self")
    ).toHaveLength(1);
  });
});

