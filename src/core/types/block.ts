export type BlockCategoryId =
  | "logic" | "loop" | "math" | "variables" | "functions"
  | "io" | "analog" | "time" | "sensors" | "servo"
  | "motor" | "buzzer" | "led" | "bluetooth" | "wifi"
  | "serial" | "display";

export interface BlockDef {
  id: string;
  label: string;
  shape?: "hat" | "stack" | "c" | "reporter";
}

export interface BlockCategory {
  id: BlockCategoryId;
  label: string;
  icon: string;
  colorVar: string;
  blocks: BlockDef[];
  boards?: string[];
}
