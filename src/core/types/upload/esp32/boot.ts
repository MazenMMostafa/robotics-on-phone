import type { EspBootMode } from "./board";

export interface BootContext {
  mode: EspBootMode;
  baudRate: number;
}

export interface BootResult {
  success: boolean;
  mode: EspBootMode;
}
