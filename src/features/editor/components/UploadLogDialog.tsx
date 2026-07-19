import { useEffect, useRef } from "react";
import { logger, type LogEntry } from "../../../core/services/logging/LoggerService";
import { X } from "lucide-react";

const UPLOAD_MODULES = new Set([
  "USB",
  "USB-Adapter",
  "Avrdude",
  "STK500v1",
  "STK500v2",
  "AvrEngine",
  "UploadMgr",
  "Pipeline",
]);

const LEVEL_COLORS: Record<LogEntry["level"], string> = {
  debug: "text-muted-foreground",
  info: "text-foreground",
  warn: "text-yellow-500",
  error: "text-destructive",
  silent: "text-muted-foreground",
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function UploadLogDialog({ open, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!open || !containerRef.current) return;
    const container = containerRef.current;

    const existing = logger.getHistory().filter((e) => UPLOAD_MODULES.has(e.module));
    container.innerHTML = "";
    if (countRef.current) countRef.current.textContent = `${existing.length} entries`;

    for (const entry of existing) {
      appendEntry(container, entry);
    }
    container.scrollTop = container.scrollHeight;

    const unsub = logger.onEntry((entry) => {
      if (UPLOAD_MODULES.has(entry.module)) {
        appendEntry(container, entry);
        if (countRef.current) {
          const children = container.childElementCount;
          countRef.current.textContent = `${children} entries`;
        }
        container.scrollTop = container.scrollHeight;
      }
    });

    return unsub;
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-card w-full max-w-2xl max-h-[80dvh] flex flex-col sm:rounded-3xl rounded-t-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm">Upload Log</h2>
            <p ref={countRef} className="text-[10px] text-muted-foreground">0 entries</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={containerRef} className="flex-1 min-h-0 overflow-auto p-3 font-mono text-[11px] leading-relaxed bg-black text-white" />
      </div>
    </div>
  );
}

function appendEntry(container: HTMLDivElement, entry: LogEntry): void {
  const div = document.createElement("div");
  div.className = "whitespace-pre-wrap break-all";

  const time = document.createElement("span");
  time.className = "text-gray-500";
  time.textContent = formatTime(entry.timestamp);

  const mod = document.createElement("span");
  mod.className = "text-cyan-400";
  mod.textContent = ` [${entry.module}] `;

  const msg = document.createElement("span");
  msg.className = LEVEL_COLORS[entry.level];
  msg.textContent = entry.message;

  div.appendChild(time);
  div.appendChild(mod);
  div.appendChild(msg);
  container.appendChild(div);
}
