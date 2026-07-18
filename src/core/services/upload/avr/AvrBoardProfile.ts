export type StkProtocol = "stk500v1" | "stk500v2";

export interface AvrBoardProfile {
  boardId: string;
  mcu: string;
  flashSize: number;
  pageSize: number;
  protocol: StkProtocol;
  signature: number[];
  bootloader: string;
  defaultBaudRate: number;
  resetBaudRate: number;
  resetWaitMs: number;
}

const AVR_BOARD_PROFILES: Record<string, AvrBoardProfile> = {
  uno: {
    boardId: "uno",
    mcu: "ATmega328P",
    flashSize: 32256,
    pageSize: 128,
    protocol: "stk500v1",
    signature: [0x1E, 0x95, 0x0F],
    bootloader: "optiboot",
    defaultBaudRate: 115200,
    resetBaudRate: 1200,
    resetWaitMs: 2000,
  },
  nano: {
    boardId: "nano",
    mcu: "ATmega328P",
    flashSize: 30720,
    pageSize: 128,
    protocol: "stk500v1",
    signature: [0x1E, 0x95, 0x0F],
    bootloader: "optiboot",
    defaultBaudRate: 115200,
    resetBaudRate: 1200,
    resetWaitMs: 2000,
  },
  mega: {
    boardId: "mega",
    mcu: "ATmega2560",
    flashSize: 253952,
    pageSize: 256,
    protocol: "stk500v2",
    signature: [0x1E, 0x98, 0x01],
    bootloader: "optiboot",
    defaultBaudRate: 115200,
    resetBaudRate: 1200,
    resetWaitMs: 2000,
  },
};

export function getAvrBoardProfile(boardId: string): AvrBoardProfile | undefined {
  return AVR_BOARD_PROFILES[boardId];
}

export function isAvrBoard(boardId: string): boolean {
  return boardId in AVR_BOARD_PROFILES;
}
