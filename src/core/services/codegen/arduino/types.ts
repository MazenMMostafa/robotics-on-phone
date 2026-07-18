export interface ArduinoBlock {
  type: string;
  id?: string;
  fields?: Record<string, string>;
  inputs?: Record<string, unknown>;
  next?: ArduinoBlock;
  mutation?: string;
}

export interface BoardPins {
  digital: number[];
  analog: number[];
  pwm: number[];
}

function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i++) result.push(i);
  return result;
}

export const BOARD_PIN_MAP: Record<string, BoardPins> = {
  uno: { digital: range(0, 13), analog: range(0, 5), pwm: [3, 5, 6, 9, 10, 11] },
  nano: { digital: range(0, 13), analog: range(0, 7), pwm: [3, 5, 6, 9, 10, 11] },
  mega: { digital: range(0, 53), analog: range(0, 15), pwm: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] },
  leonardo: { digital: range(0, 13), analog: range(0, 11), pwm: [3, 5, 6, 9, 10, 11, 13] },
  micro: { digital: range(0, 13), analog: range(0, 11), pwm: [3, 5, 6, 9, 10, 11, 13] },
};

export const SUPPORTED_BOARDS = Object.keys(BOARD_PIN_MAP);

export const SUPPORTED_BLOCK_TYPES = [
  "controls_start",
  "controls_forever",
  "pin_mode",
  "pin_write",
  "pin_read",
  "analog_read",
  "analog_write",
  "delay",
  "create_variable",
  "set_variable",
  "change_variable",
  "get_variable",
  "controls_if",
  "logic_compare",
  "logic_operation",
  "logic_negate",
  "logic_boolean",
  "logic_null",
  "controls_repeat",
  "controls_whileUntil",
  "math_number",
  "math_arithmetic",
  "math_random_int",
  "comment",
] as const;

export type SupportedBlockType = (typeof SUPPORTED_BLOCK_TYPES)[number];
