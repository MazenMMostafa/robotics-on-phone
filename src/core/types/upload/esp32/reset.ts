import type { EspResetStrategy } from "./board";

export interface ResetContext {
  strategy: EspResetStrategy;
  resetBaudRate: number;
  resetWaitMs: number;
}

export interface ResetResult {
  success: boolean;
  inBootloader: boolean;
}
