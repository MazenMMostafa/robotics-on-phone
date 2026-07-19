import { registerPlugin } from "@capacitor/core";

export interface NbLogPlugin {
  log(options: { level: string; message: string; tag?: string }): Promise<{ ok: boolean }>;
}

const NbLog = registerPlugin<NbLogPlugin>("NbLog");

export function nbLog(level: "debug" | "info" | "warn" | "error" | "verbose", message: string, tag = "NB_UPLOAD"): void {
  NbLog.log({ level, message, tag }).catch(() => {
    // Native plugin unavailable (web/dev), fall through silently
  });
}
