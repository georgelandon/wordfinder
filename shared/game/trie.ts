import { getNeighborIndices, normalizeWord, toBoardToken } from "./validation";
import type { BoardMatrix } from "../types";

export interface TrieNode {
  children: Map<string, TrieNode>;
  terminal: boolean;
}

export function createTrieNode(): TrieNode {
  return {
    children: new Map<string, TrieNode>(),
    terminal: false
  };
}

export function buildTrie(words: Iterable<string>) {
  const root = createTrieNode();

  for (const rawWord of words) {
    const word = normalizeWord(rawWord).toUpperCase();
    if (!word) {
      continue;
    }

    let node = root;
    for (const letter of word) {
      if (!node.children.has(letter)) {
        node.children.set(letter, createTrieNode());
      }
      node = node.children.get(letter)!;
    }
    node.terminal = true;
  }

  return root;
}

function walkToken(node: TrieNode, token: string) {
  let current: TrieNode | undefined = node;
  for (const letter of token) {
    current = current?.children.get(letter);
    if (!current) {
      return null;
    }
  }
  return current;
}

export function enumerateBoardWords(
  board: BoardMatrix,
  trie: TrieNode,
  minimumLength = 3
) {
  const size = board.length;
  const flat = board.flat();
  const found = new Set<string>();
  const visited = new Set<number>();

  const explore = (index: number, node: TrieNode, word: string) => {
    const nextNode = walkToken(node, toBoardToken(flat[index] ?? ""));
    if (!nextNode) {
      return;
    }

    const nextWord = `${word}${toBoardToken(flat[index] ?? "")}`;
    if (nextNode.terminal && nextWord.length >= minimumLength) {
      found.add(nextWord.toLowerCase());
    }

    visited.add(index);
    for (const neighbor of getNeighborIndices(index, size)) {
      if (!visited.has(neighbor)) {
        explore(neighbor, nextNode, nextWord);
      }
    }
    visited.delete(index);
  };

  for (let index = 0; index < flat.length; index += 1) {
    explore(index, trie, "");
  }

  return [...found].sort();
}

