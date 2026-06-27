export type BoardType = "uno" | "nano" | "esp32";

export const BOARDS: Record<BoardType, { name: string; tagline: string; emoji: string }> = {
  uno: { name: "Arduino Uno", tagline: "The classic starter board", emoji: "🔵" },
  nano: { name: "Arduino Nano", tagline: "Tiny but mighty", emoji: "🟢" },
  esp32: { name: "ESP32", tagline: "Wi-Fi + Bluetooth power", emoji: "🟣" },
};

export type BlockCategoryId =
  | "logic"
  | "loop"
  | "math"
  | "variables"
  | "functions"
  | "io"
  | "analog"
  | "time"
  | "sensors"
  | "servo"
  | "motor"
  | "buzzer"
  | "led"
  | "bluetooth"
  | "wifi"
  | "serial"
  | "display";

export interface BlockCategory {
  id: BlockCategoryId;
  label: string;
  icon: string;
  colorVar: string; // tailwind class suffix
  blocks: BlockDef[];
  boards?: BoardType[]; // restrict to boards (undefined = all)
}

export interface BlockDef {
  id: string;
  label: string;
  shape?: "hat" | "stack" | "c" | "reporter";
}

export const CATEGORIES: BlockCategory[] = [
  {
    id: "logic",
    label: "Logic",
    icon: "🧠",
    colorVar: "cat-logic",
    blocks: [
      { id: "if", label: "if ◇ then", shape: "c" },
      { id: "ifelse", label: "if ◇ then / else", shape: "c" },
      { id: "and", label: "◇ and ◇", shape: "reporter" },
      { id: "or", label: "◇ or ◇", shape: "reporter" },
      { id: "not", label: "not ◇", shape: "reporter" },
      { id: "eq", label: "◇ = ◇", shape: "reporter" },
    ],
  },
  {
    id: "loop",
    label: "Loops",
    icon: "🔁",
    colorVar: "cat-loop",
    blocks: [
      { id: "forever", label: "forever", shape: "c" },
      { id: "repeat", label: "repeat (10)", shape: "c" },
      { id: "while", label: "while ◇", shape: "c" },
    ],
  },
  {
    id: "math",
    label: "Math",
    icon: "➕",
    colorVar: "cat-math",
    blocks: [
      { id: "num", label: "(0)", shape: "reporter" },
      { id: "add", label: "◇ + ◇", shape: "reporter" },
      { id: "sub", label: "◇ − ◇", shape: "reporter" },
      { id: "mul", label: "◇ × ◇", shape: "reporter" },
      { id: "rand", label: "random 1 to 10", shape: "reporter" },
    ],
  },
  {
    id: "variables",
    label: "Variables",
    icon: "📦",
    colorVar: "cat-variables",
    blocks: [
      { id: "set", label: "set [x] to (0)", shape: "stack" },
      { id: "change", label: "change [x] by (1)", shape: "stack" },
      { id: "get", label: "(x)", shape: "reporter" },
    ],
  },
  {
    id: "functions",
    label: "Functions",
    icon: "🧩",
    colorVar: "cat-functions",
    blocks: [
      { id: "def", label: "define myBlock", shape: "hat" },
      { id: "call", label: "call myBlock", shape: "stack" },
    ],
  },
  {
    id: "io",
    label: "Digital I/O",
    icon: "⚡",
    colorVar: "cat-io",
    blocks: [
      { id: "pinmode", label: "pinMode (13) as OUTPUT", shape: "stack" },
      { id: "dwrite", label: "digitalWrite (13) HIGH", shape: "stack" },
      { id: "dread", label: "digitalRead (2)", shape: "reporter" },
    ],
  },
  {
    id: "analog",
    label: "Analog I/O",
    icon: "📈",
    colorVar: "cat-analog",
    blocks: [
      { id: "aread", label: "analogRead (A0)", shape: "reporter" },
      { id: "awrite", label: "analogWrite (9) (128)", shape: "stack" },
    ],
  },
  {
    id: "time",
    label: "Timing",
    icon: "⏱️",
    colorVar: "cat-time",
    blocks: [
      { id: "delay", label: "wait (1) seconds", shape: "stack" },
      { id: "delayms", label: "wait (500) ms", shape: "stack" },
      { id: "millis", label: "millis", shape: "reporter" },
    ],
  },
  {
    id: "sensors",
    label: "Sensors",
    icon: "🌡️",
    colorVar: "cat-sensors",
    blocks: [
      { id: "ultra", label: "ultrasonic distance (cm)", shape: "reporter" },
      { id: "temp", label: "temperature (°C)", shape: "reporter" },
      { id: "ldr", label: "light sensor", shape: "reporter" },
    ],
  },
  {
    id: "servo",
    label: "Servo",
    icon: "🦾",
    colorVar: "cat-servo",
    blocks: [
      { id: "servoAttach", label: "attach servo on pin (9)", shape: "stack" },
      { id: "servoWrite", label: "set servo to (90)°", shape: "stack" },
    ],
  },
  {
    id: "motor",
    label: "DC Motor",
    icon: "⚙️",
    colorVar: "cat-motor",
    blocks: [
      { id: "motorFwd", label: "motor forward at (200)", shape: "stack" },
      { id: "motorBwd", label: "motor backward at (200)", shape: "stack" },
      { id: "motorStop", label: "stop motor", shape: "stack" },
    ],
  },
  {
    id: "buzzer",
    label: "Buzzer",
    icon: "🔔",
    colorVar: "cat-buzzer",
    blocks: [
      { id: "tone", label: "play tone (1000) Hz on pin (8)", shape: "stack" },
      { id: "noTone", label: "stop tone on pin (8)", shape: "stack" },
    ],
  },
  {
    id: "led",
    label: "LEDs",
    icon: "💡",
    colorVar: "cat-led",
    blocks: [
      { id: "ledOn", label: "turn LED on pin (13) ON", shape: "stack" },
      { id: "ledOff", label: "turn LED on pin (13) OFF", shape: "stack" },
      { id: "blink", label: "blink LED on pin (13) (500) ms", shape: "stack" },
    ],
  },
  {
    id: "serial",
    label: "Serial",
    icon: "💬",
    colorVar: "cat-serial",
    blocks: [
      { id: "sBegin", label: "Serial begin (9600)", shape: "stack" },
      { id: "sPrint", label: "Serial print [Hello]", shape: "stack" },
    ],
  },
  {
    id: "display",
    label: "LCD / Display",
    icon: "🖥️",
    colorVar: "cat-display",
    blocks: [
      { id: "lcdInit", label: "init LCD 16x2", shape: "stack" },
      { id: "lcdPrint", label: "LCD print [Hi!] at (0,0)", shape: "stack" },
    ],
  },
  {
    id: "bluetooth",
    label: "Bluetooth",
    icon: "📶",
    colorVar: "cat-bluetooth",
    boards: ["esp32"],
    blocks: [
      { id: "btBegin", label: "Bluetooth begin [RoboBT]", shape: "stack" },
      { id: "btSend", label: "Bluetooth send [Hello]", shape: "stack" },
      { id: "btRead", label: "Bluetooth received", shape: "reporter" },
    ],
  },
  {
    id: "wifi",
    label: "Wi-Fi",
    icon: "📡",
    colorVar: "cat-wifi",
    boards: ["esp32"],
    blocks: [
      { id: "wifiConnect", label: "Wi-Fi connect [SSID] [PASS]", shape: "stack" },
      { id: "wifiStatus", label: "Wi-Fi connected?", shape: "reporter" },
      { id: "httpGet", label: "HTTP GET [url]", shape: "stack" },
    ],
  },
];

export function categoriesForBoard(board: BoardType): BlockCategory[] {
  return CATEGORIES.filter((c) => !c.boards || c.boards.includes(board));
}
