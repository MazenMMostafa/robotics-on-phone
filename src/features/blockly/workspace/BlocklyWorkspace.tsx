import { useRef } from "react";
import type { BoardType } from "../../../core/types/board";
import { useBlocklyStore } from "../store/blocklyStore";
import { useWorkspace } from "./useWorkspace";

interface Props {
  board: BoardType;
  initialXml?: string;
  onChange?: (xml: string) => void;
}

export function BlocklyWorkspace({ board, initialXml, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const loading = useBlocklyStore((s) => s.loading);
  const error = useBlocklyStore((s) => s.error);

  useWorkspace(containerRef, board, initialXml, onChange);

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background p-8">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-destructive font-bold mb-2">Failed to load Blockly</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading workspace...</p>
          </div>
        </div>
      )}
    </>
  );
}
