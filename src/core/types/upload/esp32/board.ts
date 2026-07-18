export type EspFlashMode = "qio" | "qout" | "dio" | "dout";
export type EspFlashFreq = "80m" | "40m" | "20m" | "26m";
export type EspFlashSize = "1MB" | "2MB" | "4MB" | "8MB" | "16MB";
export type EspResetStrategy = "en_pin" | "boot_pin" | "usb";
export type EspBootMode = "auto" | "manual" | "usb_cdc";

export interface EspBoardProfile {
  boardId: string;
  chip: string;
  flashMode: EspFlashMode;
  flashFreq: EspFlashFreq;
  flashSize: EspFlashSize;
  defaultBaudRate: number;
  resetBaudRate: number;
  resetWaitMs: number;
  resetStrategy: EspResetStrategy;
  bootMode: EspBootMode;
}

export function getEspBoardProfile(boardId: string): EspBoardProfile | undefined {
  return ESP_BOARD_PROFILES[boardId];
}

export function isEspBoard(boardId: string): boolean {
  return boardId in ESP_BOARD_PROFILES;
}

const ESP_BOARD_PROFILES: Record<string, EspBoardProfile> = {
  "esp32": {
    boardId: "esp32",
    chip: "ESP32",
    flashMode: "dio",
    flashFreq: "40m",
    flashSize: "4MB",
    defaultBaudRate: 921600,
    resetBaudRate: 115200,
    resetWaitMs: 2000,
    resetStrategy: "boot_pin",
    bootMode: "auto",
  },
  "esp32-s2": {
    boardId: "esp32-s2",
    chip: "ESP32-S2",
    flashMode: "dio",
    flashFreq: "40m",
    flashSize: "4MB",
    defaultBaudRate: 921600,
    resetBaudRate: 115200,
    resetWaitMs: 1500,
    resetStrategy: "boot_pin",
    bootMode: "auto",
  },
  "esp32-s3": {
    boardId: "esp32-s3",
    chip: "ESP32-S3",
    flashMode: "dio",
    flashFreq: "40m",
    flashSize: "8MB",
    defaultBaudRate: 921600,
    resetBaudRate: 115200,
    resetWaitMs: 1500,
    resetStrategy: "boot_pin",
    bootMode: "usb_cdc",
  },
  "esp32-c3": {
    boardId: "esp32-c3",
    chip: "ESP32-C3",
    flashMode: "dio",
    flashFreq: "40m",
    flashSize: "4MB",
    defaultBaudRate: 921600,
    resetBaudRate: 115200,
    resetWaitMs: 1500,
    resetStrategy: "en_pin",
    bootMode: "auto",
  },
};
