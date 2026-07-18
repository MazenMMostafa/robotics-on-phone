import type { PortInfo, PortEvent } from "../../types/hardware";
import type { StorageAdapter } from "../../platform/types";
import type { LoggerService } from "../logging/LoggerService";
import { EventBus } from "../extension/EventBus";
import { HARDWARE_EVENTS } from "../hardware/HardwareEvents";

const LAST_PORT_KEY = "hardware:lastPort";

export class PortManager {
  private ports: PortInfo[] = [];
  private selectedPortId: string | null = null;
  private storage: StorageAdapter;
  private logger: LoggerService;

  constructor(storage: StorageAdapter, logger: LoggerService) {
    this.storage = storage;
    this.logger = logger;
  }

  init(): void {
    const lastPort = this.storage.getItem<{ portId: string }>(LAST_PORT_KEY);
    if (lastPort) {
      this.selectedPortId = lastPort.portId;
    }
  }

  getPorts(): ReadonlyArray<PortInfo> {
    return this.ports;
  }

  getSelectedPort(): PortInfo | undefined {
    return this.ports.find((p) => p.id === this.selectedPortId);
  }

  getSelectedPortId(): string | null {
    return this.selectedPortId;
  }

  setPorts(ports: PortInfo[]): void {
    this.ports = ports;
  }

  async refresh(): Promise<PortInfo[]> {
    // In a real implementation, this would enumerate system ports
    // For now, return the cached list
    return this.ports;
  }

  selectPort(portId: string): void {
    const port = this.ports.find((p) => p.id === portId);
    if (!port) {
      this.logger.warn("PortManager", `Port "${portId}" not found`);
      return;
    }
    this.selectedPortId = portId;
    this.storage.setItem(LAST_PORT_KEY, { portId });
    const event: PortEvent = { port, timestamp: Date.now() };
    EventBus.emit(HARDWARE_EVENTS.PORT_SELECTED, event);
    EventBus.emit(HARDWARE_EVENTS.PORT_CHANGED, event);
  }

  clearSelection(): void {
    this.selectedPortId = null;
    this.storage.removeItem(LAST_PORT_KEY);
  }

  addPort(port: PortInfo): void {
    const existing = this.ports.findIndex((p) => p.id === port.id);
    if (existing >= 0) {
      this.ports[existing] = port;
    } else {
      this.ports = [...this.ports, port];
    }
  }

  removePort(portId: string): void {
    this.ports = this.ports.filter((p) => p.id !== portId);
    if (this.selectedPortId === portId) {
      this.selectedPortId = null;
    }
  }
}
