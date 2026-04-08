import { useEffect, useMemo, useRef, useState } from "react";
import {
  beginSelectionPath,
  extendSelectionPath,
  pathToWord,
  validatePath
} from "@shared/game/validation";
import type { BoardMatrix } from "@shared/types";
import { BoardGrid } from "@/components/BoardGrid";
import { Panel } from "@/components/Panel";
import { cn } from "@/lib/utils";

interface MobileBoardProps {
  board: BoardMatrix;
  dictionary: ReadonlySet<string> | null;
  dictionaryError?: string | null;
  disabled?: boolean;
  submittedWords: string[];
  onSubmitWord: (word: string) => Promise<void> | void;
}

export function MobileBoard({
  board,
  dictionary,
  dictionaryError = null,
  disabled = false,
  submittedWords,
  onSubmitWord
}: MobileBoardProps) {
  const [path, setPath] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const submittedSet = useMemo(
    () => new Set(submittedWords.map((word) => word.toLowerCase())),
    [submittedWords]
  );

  const currentWord = pathToWord(board, path);
  const currentWordKey = currentWord.toLowerCase();
  const currentIndices = path;
  const currentPathIsValid = path.length > 0 && validatePath(board, path, currentWordKey);
  const currentWordIsDictionaryValid = dictionary ? dictionary.has(currentWordKey) : false;
  const canSubmitWord =
    !disabled &&
    Boolean(dictionary) &&
    currentWordKey.length >= 3 &&
    currentPathIsValid &&
    currentWordIsDictionaryValid &&
    !submittedSet.has(currentWordKey);

  const clearPath = () => setPath([]);

  useEffect(() => {
    if (path.length === 0) {
      setFeedback(null);
    }
  }, [path.length]);

  useEffect(() => {
    if (!isDragging || disabled) {
      return;
    }

    const getTileIndexFromPoint = (clientX: number, clientY: number) => {
      const boardElement = boardRef.current;
      const target = document.elementFromPoint(clientX, clientY);
      if (!boardElement || !(target instanceof Element)) {
        return null;
      }

      const tile = target.closest<HTMLElement>("[data-board-index]");
      if (!tile || !boardElement.contains(tile)) {
        return null;
      }

      const rawIndex = tile.dataset.boardIndex;
      if (!rawIndex) {
        return null;
      }

      const index = Number(rawIndex);
      return Number.isInteger(index) ? index : null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const index = getTileIndexFromPoint(event.clientX, event.clientY);
      if (index === null) {
        return;
      }

      setPath((current) => extendSelectionPath(current, index, board.length));
    };

    const stopDragging = () => {
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [board.length, disabled, isDragging]);

  const submit = async () => {
    if (disabled) {
      return;
    }

    if (!dictionary) {
      setFeedback(dictionaryError ?? "Loading dictionary...");
      return;
    }

    if (currentWordKey.length < 3) {
      setFeedback("Need at least 3 letters.");
      return;
    }

    if (!currentPathIsValid) {
      setFeedback("Word path is not valid on the board.");
      return;
    }

    if (!currentWordIsDictionaryValid) {
      setFeedback("Word not found in the dictionary.");
      return;
    }

    if (submittedSet.has(currentWordKey)) {
      setFeedback("Already banked for this round.");
      return;
    }

    await onSubmitWord(currentWord);
    setFeedback(null);
    setPath([]);
  };

  let helperText = "Tap or drag through adjacent letters.";
  if (feedback) {
    helperText = feedback;
  } else if (dictionaryError) {
    helperText = dictionaryError;
  } else if (!dictionary) {
    helperText = "Loading dictionary...";
  } else if (submittedSet.has(currentWordKey)) {
    helperText = "Already banked for this round.";
  } else if (currentWordKey.length > 0 && currentWordKey.length < 3) {
    helperText = "Need at least 3 letters.";
  } else if (currentWordKey.length >= 3 && !currentWordIsDictionaryValid) {
    helperText = "Word not found in the dictionary.";
  }

  return (
    <Panel
      title="Your Controller"
      subtitle="Trace words on your phone. The server validates everything at the end of the round."
    >
      <div className="space-y-4">
        <div
          ref={boardRef}
          className="touch-none select-none rounded-[1.75rem] border border-white/10 bg-black/20 p-3"
        >
          <BoardGrid
            board={board}
            interactive={!disabled}
            selectedIndices={currentIndices}
            submittedIndices={[]}
            className="touch-none"
            onTilePointerDown={(index) => {
              if (disabled) {
                return;
              }
              setIsDragging(true);
              setPath((current) => beginSelectionPath(current, index, board.length));
            }}
            onTilePointerUp={() => setIsDragging(false)}
          />
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-mist/50">Current Word</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="min-h-[2.75rem] font-display text-3xl text-surf">
              {currentWord || "..." }
            </p>
            <p className="rounded-full bg-white/10 px-3 py-1 text-sm text-mist/80">
              {path.length} tiles
            </p>
          </div>
          <p className="mt-2 text-sm text-mist/65">{helperText}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setPath((current) => current.slice(0, -1))}
            disabled={disabled || path.length === 0}
            className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3 text-sm font-semibold text-surf disabled:opacity-45"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={clearPath}
            disabled={disabled || path.length === 0}
            className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3 text-sm font-semibold text-surf disabled:opacity-45"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmitWord}
            className={cn(
              "rounded-2xl px-3 py-3 text-sm font-semibold transition",
              !canSubmitWord
                ? "bg-gold/30 text-ink/70"
                : "bg-gold text-ink"
            )}
          >
            Submit
          </button>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-surf">Accepted Words</p>
            <p className="text-xs uppercase tracking-[0.2em] text-mist/55">
              {submittedWords.length} banked
            </p>
          </div>
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {submittedWords.length > 0 ? (
              submittedWords.map((word) => (
                <span
                  key={word}
                  className="rounded-full border border-mint/20 bg-mint/10 px-3 py-1 text-sm text-mint"
                >
                  {word}
                </span>
              ))
            ) : (
              <p className="text-sm text-mist/60">No words saved yet. Start tracing.</p>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
