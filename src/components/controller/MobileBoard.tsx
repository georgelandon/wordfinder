import { useMemo, useState } from "react";
import { getNeighborIndices, pathToWord } from "@shared/game/validation";
import type { BoardMatrix } from "@shared/types";
import { BoardGrid } from "@/components/BoardGrid";
import { Panel } from "@/components/Panel";
import { cn } from "@/lib/utils";

interface MobileBoardProps {
  board: BoardMatrix;
  disabled?: boolean;
  submittedWords: string[];
  onSubmitWord: (word: string) => Promise<void> | void;
}

export function MobileBoard({
  board,
  disabled = false,
  submittedWords,
  onSubmitWord
}: MobileBoardProps) {
  const [path, setPath] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const submittedSet = useMemo(
    () => new Set(submittedWords.map((word) => word.toLowerCase())),
    [submittedWords]
  );

  const currentWord = pathToWord(board, path);
  const currentWordKey = currentWord.toLowerCase();
  const currentIndices = path;

  const appendIndex = (index: number) => {
    setPath((current) => {
      if (current.length === 0) {
        return [index];
      }

      const last = current[current.length - 1];
      if (last === index) {
        return current;
      }

      const previous = current[current.length - 2];
      if (previous === index) {
        return current.slice(0, -1);
      }

      if (current.includes(index)) {
        return current;
      }

      if (!getNeighborIndices(last, board.length).includes(index)) {
        return current;
      }

      return [...current, index];
    });
  };

  const clearPath = () => setPath([]);

  const submit = async () => {
    if (disabled || currentWordKey.length < 3) {
      return;
    }

    await onSubmitWord(currentWord);
    setPath([]);
  };

  const helperText = submittedSet.has(currentWordKey)
    ? "Already banked for this round."
    : currentWordKey.length > 0 && currentWordKey.length < 3
      ? "Need at least 3 letters."
      : "Tap or drag through adjacent letters.";

  return (
    <Panel
      title="Your Controller"
      subtitle="Trace words on your phone. The server validates everything at the end of the round."
    >
      <div className="space-y-4">
        <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-3">
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
              if (path.length === 0) {
                setPath([index]);
              } else {
                appendIndex(index);
              }
            }}
            onTilePointerEnter={(index) => {
              if (!isDragging || disabled) {
                return;
              }
              appendIndex(index);
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
            disabled={
              disabled || currentWordKey.length < 3 || submittedSet.has(currentWordKey)
            }
            className={cn(
              "rounded-2xl px-3 py-3 text-sm font-semibold transition",
              disabled || currentWordKey.length < 3 || submittedSet.has(currentWordKey)
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
