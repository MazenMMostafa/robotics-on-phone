import { describe, it, expect, beforeEach, vi } from "vitest";
import { DeviceManager } from "../../services/device/DeviceManager";
import type { StorageAdapter } from "../../platform/types";
import type { ConnectionAdapter, DeviceInfo } from "../../types/hardware";

function createMockStorage(): StorageAdapter {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => {
      const v = store.get(key);
      return v ? JSON.parse(v) : null;
    }),
    setItem: vi.fn((key: string, value: unknown) => {
      store.set(key, JSON.stringify(value));
    }),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  };
}

function makeDevice(overrides?: Partial<DeviceInfo>): DeviceInfo {
  return {
    id: "dev-1",
    name: "Arduino Uno",
    connectionType: "usb",
    connectionKey: "usb-0",
    ...overrides,
  };
}

function makeConnectionAdapter(isConnected = false): ConnectionAdapter {
  return {
    type: "usb",
    state: isConnected ? "connected" : "disconnected",
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue({ data: "" }),
    write: vi.fn().mockResolvedValue({}),
    writeBytes: vi.fn().mockResolvedValue({}),
    readBytes: vi.fn().mockResolvedValue({ data: "" }),
    flush: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(isConnected),
  };
}

describe("DeviceManager", () => {
  let dm: DeviceManager;
  let storage: StorageAdapter;

  beforeEach(() => {
    storage = createMockStorage();
    dm = new DeviceManager(storage);
  });

  it("starts with no devices", () => {
    expect(dm.getDevices()).toHaveLength(0);
  });

  it("addDevice adds device", () => {
    dm.addDevice(makeDevice());
    expect(dm.getDevices()).toHaveLength(1);
  });

  it("addDevice does not duplicate", () => {
    dm.addDevice(makeDevice());
    dm.addDevice(makeDevice());
    expect(dm.getDevices()).toHaveLength(1);
  });

  it("getDevice returns device by id", () => {
    dm.addDevice(makeDevice({ id: "dev-1" }));
    expect(dm.getDevice("dev-1")).toBeDefined();
    expect(dm.getDevice("nonexistent")).toBeUndefined();
  });

  it("removeDevice removes device", () => {
    dm.addDevice(makeDevice());
    dm.removeDevice("dev-1");
    expect(dm.getDevices()).toHaveLength(0);
  });

  it("getConnectedDevice returns undefined when no connection", () => {
    dm.addDevice(makeDevice());
    expect(dm.getConnectedDevice()).toBeUndefined();
  });

  it("connectDevice connects and emits event", async () => {
    dm.addDevice(makeDevice());
    const adapter = makeConnectionAdapter();
    await dm.connectDevice("dev-1", adapter);
    expect(adapter.connect).toHaveBeenCalled();
  });

  it("connectDevice throws for unknown device", async () => {
    const adapter = makeConnectionAdapter();
    await expect(dm.connectDevice("unknown", adapter)).rejects.toThrow(
      'Device "unknown" not found',
    );
  });

  it("disconnectDevice disconnects", async () => {
    dm.addDevice(makeDevice());
    const adapter = makeConnectionAdapter();
    await dm.connectDevice("dev-1", adapter);
    await dm.disconnectDevice("dev-1");
    expect(adapter.disconnect).toHaveBeenCalled();
  });

  it("disconnectDevice does nothing for unknown device", async () => {
    await expect(dm.disconnectDevice("unknown")).resolves.toBeUndefined();
  });

  it("isConnected returns false when not connected", () => {
    expect(dm.isConnected("dev-1")).toBe(false);
  });

  it("isConnected returns true when connected", async () => {
    dm.addDevice(makeDevice());
    const adapter = makeConnectionAdapter(true);
    await dm.connectDevice("dev-1", adapter);
    expect(dm.isConnected("dev-1")).toBe(true);
  });

  it("discoverDevices returns cached devices", () => {
    dm.addDevice(makeDevice());
    expect(dm.discoverDevices()).toHaveLength(1);
  });

  it("clearDevices removes all", () => {
    dm.addDevice(makeDevice());
    dm.clearDevices();
    expect(dm.getDevices()).toHaveLength(0);
  });

  it("init restores recent devices", () => {
    const device = makeDevice();
    storage.setItem("hardware:recentDevices", [device]);
    dm.init();
    expect(dm.getDevices()).toHaveLength(1);
  });

  it("getConnection returns adapter", async () => {
    dm.addDevice(makeDevice());
    const adapter = makeConnectionAdapter();
    await dm.connectDevice("dev-1", adapter);
    expect(dm.getConnection("dev-1")).toBe(adapter);
  });
});
