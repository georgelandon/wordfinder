import type { PointerEventHandler } from "react";
import type { BoardMatrix } from "@shared/types";
import { cn } from "@/lib/utils";

interface BoardGridProps {
  board: BoardMatrix;
  selectedIndices?: number[];
  submittedIndices?: number[];
  interactive?: boolean;
  large?: boolean;
  className?: string;
  tileClassName?: string;
  onTilePointerDown?: (index: number) => void;
  onTilePointerEnter?: (index: number) => void;
  onTilePointerUp?: () => void;
}

export function BoardGrid({
  board,
  selectedIndices = [],
  submittedIndices = [],
  interactive = false,
  large = false,
  className,
  tileClassName,
  onTilePointerDown,
  onTilePointerEnter,
  onTilePointerUp
}: BoardGridProps) {
  const selected = new Set(selectedIndices);
  const submitted = new Set(submittedIndices);
  const flat = board.flat();

  const renderTile = (tile: string, index: number) => {
    const commonProps = {
      className: cn(
        "relative flex aspect-square items-center justify-center rounded-[1.35rem] border font-display uppercase transition",
        large ? "text-3xl sm:text-5xl" : "text-2xl",
        selected.has(index)
          ? "scale-[1.02] border-gold bg-gold/20 text-surf shadow-[0_0_40px_rgba(244,207,104,0.22)]"
          : submitted.has(index)
            ? "border-mint/50 bg-mint/15 text-surf"
            : "border-white/10 bg-white/[0.06] text-surf",
        interactive && "cursor-pointer active:scale-[0.98]",
        tileClassName
      ),
      style: {
        touchAction: "none"
      }
    };

    if (!interactive) {
      return (
        <div key={index} {...commonProps}>
          <span>{tile}</span>
        </div>
      );
    }

    return (
      <button
        key={index}
        type="button"
        {...commonProps}
        onPointerDown={() => onTilePointerDown?.(index)}
        onPointerEnter={() => onTilePointerEnter?.(index)}
        onPointerUp={onTilePointerUp as PointerEventHandler<HTMLButtonElement>}
      >
        <span>{tile}</span>
      </button>
    );
  };

  return (
    <div
      className={cn("grid gap-2.5 sm:gap-3", className)}
      style={{
        gridTemplateColumns: `repeat(${board.length || 4}, minmax(0, 1fr))`
      }}
    >
      {flat.map(renderTile)}
    </div>
  );
}

