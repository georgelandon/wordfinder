import {
  DICTIONARY_SOURCE,
  DICTIONARY_WORD_COUNT,
  DICTIONARY_WORDS_TEXT
} from "./generated/dictionary-data.ts";

function normalizeDictionaryWord(word: string) {
  return word.trim().toLowerCase();
}

function parseDictionaryText(text: string) {
  return Array.from(
    new Set(
      text
        .split(/\s+/)
        .map((word) => normalizeDictionaryWord(word))
        .filter(Boolean)
    )
  );
}

export const FILTERED_DICTIONARY_SOURCE = DICTIONARY_SOURCE;
export const FILTERED_DICTIONARY_WORD_COUNT = DICTIONARY_WORD_COUNT;
export const DICTIONARY_WORDS = parseDictionaryText(DICTIONARY_WORDS_TEXT);
export const DICTIONARY_SET = new Set(DICTIONARY_WORDS);
