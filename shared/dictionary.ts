function normalizeDictionaryWord(word: string) {
  return word.trim().toLowerCase();
}

export function parseDictionaryText(text: string) {
  return Array.from(
    new Set(
      text
        .split(/\s+/)
        .map((word) => normalizeDictionaryWord(word))
        .filter(Boolean)
    )
  );
}

export function filterDictionaryWords(
  words: Iterable<string>,
  blockedWords: Iterable<string>,
  allowedWords: Iterable<string> = []
) {
  const blockedSet = new Set(
    Array.from(blockedWords, (word) => normalizeDictionaryWord(word)).filter(Boolean)
  );
  const allowedSet = new Set(
    Array.from(allowedWords, (word) => normalizeDictionaryWord(word)).filter(Boolean)
  );

  return Array.from(
    new Set(
      Array.from(words, (word) => normalizeDictionaryWord(word)).filter(
        (word) => Boolean(word) && (!blockedSet.has(word) || allowedSet.has(word))
      )
    )
  ).sort((left, right) => left.localeCompare(right));
}

let dictionaryWordsPromise: Promise<readonly string[]> | null = null;
let dictionarySetPromise: Promise<ReadonlySet<string>> | null = null;

export async function loadDictionaryWords() {
  dictionaryWordsPromise ??= import("./generated/dictionary-data").then((module) =>
    parseDictionaryText(module.DICTIONARY_WORDS_TEXT)
  );

  return dictionaryWordsPromise;
}

export async function loadDictionarySet() {
  dictionarySetPromise ??= loadDictionaryWords().then((words) => new Set(words));

  return dictionarySetPromise;
}
