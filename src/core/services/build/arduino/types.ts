export const ARDUINO_BOARD_FQBNS: Record<string, string> = {
  uno: "arduino:avr:uno",
  nano: "arduino:avr:nano",
  mega: "arduino:avr:mega2560",
};

export const ARDUINO_SUPPORTED_BOARDS = Object.keys(ARDUINO_BOARD_FQBNS);

export const ARDUINO_FRAMEWORK = "arduino";

export interface ArduinoCliCompileOptions {
  fqbn: string;
  sketchPath: string;
  buildPath: string;
  verbose?: boolean;
  libraries?: string[];
  additionalFlags?: string[];
}

export interface ArduinoCliCompileResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  hexPath?: string;
  elfPath?: string;
  mapPath?: string;
  size: number;
  warnings: string[];
  errors: string[];
}

export interface ArduinoCliToolInfo {
  path: string;
  version: string;
}
