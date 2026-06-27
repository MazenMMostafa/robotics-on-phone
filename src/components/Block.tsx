import type { BlockDef } from "../lib/blocks";

export function BlockChip({
  block,
  colorVar,
  onPointerDown,
  draggable,
}: {
  block: BlockDef;
  colorVar: string;
  onPointerDown?: (e: React.PointerEvent) => void;
  draggable?: boolean;
}) {
  const shape = block.shape ?? "stack";

  const radius =
    shape === "reporter"
      ? "rounded-full px-4"
      : shape === "hat"
        ? "rounded-t-3xl rounded-b-lg"
        : "rounded-lg";

  return (
    <div
      onPointerDown={onPointerDown}
      className={`select-none ${radius} px-3 py-2.5 text-white text-sm font-bold shadow-md ${
        draggable ? "cursor-grab active:cursor-grabbing active:scale-95" : ""
      } transition-transform`}
      style={{ background: `var(--${colorVar})` }}
    >
      {block.label}
    </div>
  );
}
