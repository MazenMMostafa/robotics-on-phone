export type BoardType =
  | "uno" | "nano" | "mega" | "leonardo"
  | "esp32" | "esp8266" | "pico";

export interface BoardDefinition {
  name: string;
  tagline: string;
  emoji: string;
  fqbn: string;
  uploadProtocol: string;
  defaultBaudRate: number;
  baudRates: number[];
  pins: {
    digital: { pin: number; name?: string; pwm: boolean; builtinLed?: boolean }[];
    analog: { pin: string; sda?: boolean; scl?: boolean }[];
  };
  interfaces: {
    uart: { rx: number; tx: number }[];
    i2c: { sda: string; scl: string }[];
    spi: { mosi: number; miso: number; sck: number; ss: number }[];
  };
  supportedComponents: string[];
  libraries: string[];
  voltage: string;
  clockSpeed: number;
  flashSize: number;
  ramSize: number;
}

export const BOARDS: Record<BoardType, { name: string; tagline: string; emoji: string }> = {
  uno: { name: "Arduino Uno", tagline: "The classic starter board", emoji: "🔵" },
  nano: { name: "Arduino Nano", tagline: "Tiny but mighty", emoji: "🟢" },
  mega: { name: "Arduino Mega 2560", tagline: "More pins, more power", emoji: "🟠" },
  leonardo: { name: "Arduino Leonardo", tagline: "Built-in USB HID", emoji: "🔴" },
  esp32: { name: "ESP32", tagline: "Wi-Fi + Bluetooth power", emoji: "🟣" },
  esp8266: { name: "ESP8266", tagline: "Wi-Fi for less", emoji: "🟤" },
  pico: { name: "Raspberry Pi Pico", tagline: "ARM-based flexibility", emoji: "🟡" },
};

export type { BoardConfig } from "./boardConfig";
export type { ComponentConfig } from "./componentConfig";
