import type { BoardConfig } from "../../types/boardConfig";
import type { DeviceInfo, ConnectionType, ConnectionAdapter } from "../../types/hardware";
import { EventBus } from "../extension/EventBus";
import type { LoggerService } from "../logging/LoggerService";
import type { StorageAdapter } from "../../platform/types";
import type { PortManager } from "../port/PortManager";
import type { DeviceManager } from "../device/DeviceManager";
import { BoardService } from "../board/BoardService";
import { HARDWARE_EVENTS } from "./HardwareEvents";
import { USBConnection } from "./connections/USBConnection";
import { SerialConnection } from "./connections/SerialConnection";
import { BluetoothConnection } from "./connections/BluetoothConnection";
import { WiFiConnection } from "./connections/WiFiConnection";
import type { USBAdapter } from "../../platform/types";

const LAST_BOARD_KEY = "hardware:lastBoard";

export class HardwareManager {
  private selectedBoardId: string | null = null;
  private portManager: PortManager;
  private deviceManager: DeviceManager;
  private usbAdapter: USBAdapter;
  private storage: StorageAdapter;
  private logger: LoggerService;

  constructor(
    portManager: PortManager,
    deviceManager: DeviceManager,
    usbAdapter: USBAdapter,
    storage: StorageAdapter,
    logger: LoggerService,
  ) {
    this.portManager = portManager;
    this.deviceManager = deviceManager;
    this.usbAdapter = usbAdapter;
    this.storage = storage;
    this.logger = logger;
  }

  init(): void {
    const lastBoard = this.storage.getItem<{ boardId: string }>(LAST_BOARD_KEY);
    if (lastBoard) {
      this.selectedBoardId = lastBoard.boardId;
    }
  }

  getSelectedBoardId(): string | null {
    return this.selectedBoardId;
  }

  getSelectedBoard(): BoardConfig | undefined {
    if (!this.selectedBoardId) return undefined;
    return BoardService.getBoard(this.selectedBoardId);
  }

  getAvailableBoards(): BoardConfig[] {
    return BoardService.getBoards();
  }

  selectBoard(boardId: string): void {
    const board = BoardService.getBoard(boardId);
    if (!board) {
      this.logger.warn("HardwareManager", `Board "${boardId}" not found`);
      return;
    }

    const previous = this.selectedBoardId;
    this.selectedBoardId = boardId;
    this.storage.setItem(LAST_BOARD_KEY, { boardId });

    EventBus.emit(HARDWARE_EVENTS.BOARD_SELECTED, { boardId, board });

    if (previous !== boardId) {
      EventBus.emit(HARDWARE_EVENTS.BOARD_CHANGED, { boardId, board, previousBoardId: previous });
    }
  }

  getBoardCapabilities(boardId: string): string[] {
    const board = BoardService.getBoard(boardId);
    return board?.capabilities ?? [];
  }

  boardHasCapability(boardId: string, capability: string): boolean {
    return BoardService.hasCapability(boardId, capability);
  }

  getConnectedDevice(): DeviceInfo | undefined {
    return this.deviceManager.getConnectedDevice();
  }

  isConnected(): boolean {
    return this.deviceManager.getConnectedDevice() !== undefined;
  }

  createConnection(type: ConnectionType): ConnectionAdapter {
    switch (type) {
      case "usb":
        return new USBConnection(this.usbAdapter);
      case "serial":
        return new SerialConnection();
      case "bluetooth":
        return new BluetoothConnection();
      case "wifi":
        return new WiFiConnection();
    }
  }

  getPortManager(): PortManager {
    return this.portManager;
  }

  getDeviceManager(): DeviceManager {
    return this.deviceManager;
  }
}
