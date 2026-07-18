import type { DeviceInfo, DeviceEvent } from "../../types/hardware";
import type { ConnectionAdapter, ConnectionOptions } from "../../types/hardware";
import type { StorageAdapter } from "../../platform/types";
import { EventBus } from "../extension/EventBus";
import { HARDWARE_EVENTS } from "../hardware/HardwareEvents";

const RECENT_DEVICES_KEY = "hardware:recentDevices";
const MAX_RECENT_DEVICES = 10;

export class DeviceManager {
  private devices: Map<string, DeviceInfo> = new Map();
  private connections: Map<string, ConnectionAdapter> = new Map();
  private storage: StorageAdapter;

  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }

  init(): void {
    const recent = this.storage.getItem<DeviceInfo[]>(RECENT_DEVICES_KEY);
    if (recent) {
      for (const device of recent) {
        this.devices.set(device.id, device);
      }
    }
  }

  getDevices(): DeviceInfo[] {
    return Array.from(this.devices.values());
  }

  getDevice(id: string): DeviceInfo | undefined {
    return this.devices.get(id);
  }

  getConnectedDevice(): DeviceInfo | undefined {
    for (const device of this.devices.values()) {
      if (device.connectionType && this.connections.has(device.id)) {
        const conn = this.connections.get(device.id);
        if (conn?.isConnected()) return device;
      }
    }
    return undefined;
  }

  discoverDevices(): DeviceInfo[] {
    // Future: actual USB/Bluetooth discovery
    // For now returns known devices from cache
    return this.getDevices();
  }

  addDevice(device: DeviceInfo): void {
    const existing = this.devices.get(device.id);
    if (!existing || existing.connectionKey !== device.connectionKey) {
      this.devices.set(device.id, device);
      this.persistRecent();
      const event: DeviceEvent = { device, timestamp: Date.now() };
      EventBus.emit(HARDWARE_EVENTS.DEVICE_FOUND, event);
    }
  }

  removeDevice(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (device) {
      this.devices.delete(deviceId);
      this.persistRecent();
      const event: DeviceEvent = { device, timestamp: Date.now() };
      EventBus.emit(HARDWARE_EVENTS.DEVICE_LOST, event);
    }
  }

  async connectDevice(
    deviceId: string,
    adapter: ConnectionAdapter,
    options?: ConnectionOptions,
  ): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error(`Device "${deviceId}" not found`);

    this.connections.set(deviceId, adapter);

    try {
      await adapter.connect(options);
      device.lastConnected = Date.now();
      this.persistRecent();
      const event: DeviceEvent = { device, timestamp: Date.now() };
      EventBus.emit(HARDWARE_EVENTS.DEVICE_CONNECTED, event);
      EventBus.emit(HARDWARE_EVENTS.CONNECTION_OPENED, event);
    } catch (e) {
      this.connections.delete(deviceId);
      EventBus.emit(HARDWARE_EVENTS.CONNECTION_ERROR, { device, error: e });
      throw e;
    }
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    const adapter = this.connections.get(deviceId);
    if (!adapter) return;

    try {
      await adapter.disconnect();
    } catch {
      // ignore disconnect errors
    }

    this.connections.delete(deviceId);
    const device = this.devices.get(deviceId);
    if (device) {
      const event: DeviceEvent = { device, timestamp: Date.now() };
      EventBus.emit(HARDWARE_EVENTS.DEVICE_DISCONNECTED, event);
      EventBus.emit(HARDWARE_EVENTS.CONNECTION_CLOSED, event);
    }
  }

  getConnection(deviceId: string): ConnectionAdapter | undefined {
    return this.connections.get(deviceId);
  }

  isConnected(deviceId: string): boolean {
    const conn = this.connections.get(deviceId);
    return conn?.isConnected() ?? false;
  }

  clearDevices(): void {
    this.devices.clear();
    this.connections.clear();
    this.storage.removeItem(RECENT_DEVICES_KEY);
  }

  private persistRecent(): void {
    const recent = Array.from(this.devices.values()).slice(0, MAX_RECENT_DEVICES);
    this.storage.setItem(RECENT_DEVICES_KEY, recent);
  }
}
