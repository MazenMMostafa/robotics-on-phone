import type { BoardConfig, DigitalPinInfo } from "../../types/boardConfig";

type BoardModule = { default: BoardConfig };

const boardModules = import.meta.glob<BoardModule>("/src/data/boards/*.json", {
  eager: true,
});

function loadBoards(): BoardConfig[] {
  return Object.values(boardModules).map((m) => m.default);
}

const cache = loadBoards();

export const BoardService = {
  getBoards(): BoardConfig[] {
    return cache;
  },

  getBoard(id: string): BoardConfig | undefined {
    return cache.find((b) => b.id === id);
  },

  getPinInfo(boardId: string, pin: number | string): DigitalPinInfo | undefined {
    const board = this.getBoard(boardId);
    if (!board) return undefined;
    return board.digitalPins.find((p) => p.pin === Number(pin));
  },

  supportsComponent(boardId: string, componentId: string): boolean {
    const board = this.getBoard(boardId);
    if (!board) return false;
    return board.supportedComponents.includes(componentId);
  },

  supportsLibrary(boardId: string, library: string): boolean {
    const board = this.getBoard(boardId);
    if (!board) return false;
    return board.libraries.some((l) => l.toLowerCase().includes(library.toLowerCase()));
  },

  supportsPWM(boardId: string, pin: number): boolean {
    const board = this.getBoard(boardId);
    if (!board) return false;
    return board.pwmPins.includes(pin);
  },

  supportsAnalog(boardId: string, pin: string): boolean {
    const board = this.getBoard(boardId);
    if (!board) return false;
    return board.analogPins.some((a) => a.pin === pin);
  },

  supportsInterrupt(boardId: string, pin: number): boolean {
    const board = this.getBoard(boardId);
    if (!board) return false;
    return board.interruptPins.includes(pin);
  },

  hasCapability(boardId: string, capability: string): boolean {
    const board = this.getBoard(boardId);
    if (!board) return false;
    return board.capabilities.includes(capability);
  },

  getSupportedBoardsForComponent(componentId: string): BoardConfig[] {
    return cache.filter((b) => b.supportedComponents.includes(componentId));
  },
};
