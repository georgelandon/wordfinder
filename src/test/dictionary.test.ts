import { describe, expect, it } from "vitest";
import {
  filterDictionaryWords,
  loadDictionarySet,
  parseDictionaryText
} from "@shared/dictionary";

describe("dictionary helpers", () => {
  it("normalizes whitespace and casing while parsing source text", () => {
    expect(parseDictionaryText(" TOE\nfat  fat \nQuest ")).toEqual(["toe", "fat", "quest"]);
  });

  it("removes blocklisted words while preserving common words", () => {
    expect(filterDictionaryWords(["toe", "fat", "crudeword"], ["crudeword"])).toEqual([
      "fat",
      "toe"
    ]);
  });

  it("loads the generated ENABLE dictionary", async () => {
    const dictionary = await loadDictionarySet();

    expect(dictionary.size).toBeGreaterThan(170_000);
    expect(dictionary.has("toe")).toBe(true);
    expect(dictionary.has("fat")).toBe(true);
  });
});
