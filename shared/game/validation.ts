import type { BoardMatrix, BoardPath } from "../types";

export function normalizeWord(word: string) {
  return word.trim().replace(/[^a-z]/gi, "").toLowerCase();
}

export function toBoardToken(tile: string) {
  return tile.toUpperCase() === "QU" ? "QU" : tile.toUpperCase();
}

export function indexToPoint(index: number, size: number) {
  return {
    row: Math.floor(index / size),
    column: index % size
  };
}

export function pointToIndex(row: number, column: number, size: number) {
  return row * size + column;
}

export function getNeighborIndices(index: number, size: number) {
  const { row, column } = indexToPoint(index, size);
  const neighbors: number[] = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) {
        continue;
      }

      const nextRow = row + rowOffset;
      const nextColumn = column + columnOffset;
      if (
        nextRow >= 0 &&
        nextColumn >= 0 &&
        nextRow < size &&
        nextColumn < size
      ) {
        neighbors.push(pointToIndex(nextRow, nextColumn, size));
      }
    }
  }

  return neighbors;
}

export function pathToWord(board: BoardMatrix, path: BoardPath) {
  const flat = board.flat();
  return path.map((index) => flat[index] ?? "").join("");
}

function consumeTile(
  normalizedUppercaseWord: string,
  position: number,
  tile: string
) {
  const token = toBoardToken(tile);
  if (normalizedUppercaseWord.slice(position, position + token.length) === token) {
    return position + token.length;
  }

  return null;
}

export function validatePath(
  board: BoardMatrix,
  path: BoardPath,
  expectedWord?: string
) {
  if (path.length === 0) {
    return false;
  }

  const flat = board.flat();
  const size = board.length;
  const visited = new Set<number>();
  let built = "";

  for (let index = 0; index < path.length; index += 1) {
    const current = path[index];
    if (current < 0 || current >= flat.length || visited.has(current)) {
      return false;
    }

    if (index > 0) {
      const previous = path[index - 1];
      if (!getNeighborIndices(previous, size).includes(current)) {
        return false;
      }
    }

    visited.add(current);
    built += flat[current] ?? "";
  }

  if (!expectedWord) {
    return true;
  }

  return normalizeWord(built) === normalizeWord(expectedWord);
}

export function findWordPath(board: BoardMatrix, word: string): BoardPath | null {
  const normalized = normalizeWord(word).toUpperCase();
  if (!normalized) {
    return null;
  }

  const flat = board.flat();
  const size = board.length;
  const visited = new Set<number>();

  const search = (index: number, position: number, path: number[]): BoardPath | null => {
    const nextPosition = consumeTile(normalized, position, flat[index] ?? "");
    if (nextPosition === null) {
      return null;
    }

    const nextPath = [...path, index];
    if (nextPosition === normalized.length) {
      return nextPath;
    }

    visited.add(index);
    for (const neighbor of getNeighborIndices(index, size)) {
      if (visited.has(neighbor)) {
        continue;
      }

      const found = search(neighbor, nextPosition, nextPath);
      if (found) {
        return found;
      }
    }
    visited.delete(index);

    return null;
  };

  for (let index = 0; index < flat.length; index += 1) {
    visited.clear();
    const found = search(index, 0, []);
    if (found) {
      return found;
    }
  }

  return null;
}

