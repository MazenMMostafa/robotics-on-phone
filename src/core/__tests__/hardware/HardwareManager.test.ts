import { describe, it, expect, beforeEach, vi } from "vitest";
import { HardwareManager } from "../../services/hardware/HardwareManager";
import { PortManager } from "../../services/port/PortManager";
import { DeviceManager } from "../../services/device/DeviceManager";
import type { StorageAdapter, USBAdapter } from "../../platform/types";
import { LoggerService } from "../../services/logging/LoggerService";

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

function createMockUsbAdapter(): USBAdapter {
  return {
    scan: vi.fn().mockResolvedValue([]),
    openConnection: vi.fn().mockResolvedValue(undefined),
    endConnection: vi.fn().mockResolvedValue(undefined),
    write: vi.fn().mockResolvedValue({}),
    read: vi.fn().mockResolvedValue({ data: "" }),
    writeBytes: vi.fn().mockResolvedValue({}),
    readBytes: vi.fn().mockResolvedValue({ data: "" }),
    setDTR: vi.fn().mockResolvedValue(undefined),
  };
}

describe("HardwareManager", () => {
  let hm: HardwareManager;
  let pm: PortManager;
  let dm: DeviceManager;
  let storage: StorageAdapter;
  let usbAdapter: USBAdapter;

  beforeEach(() => {
    storage = createMockStorage();
    usbAdapter = createMockUsbAdapter();
    const logger = new LoggerService();
    pm = new PortManager(storage, logger);
    dm = new DeviceManager(storage);
    hm = new HardwareManager(pm, dm, usbAdapter, storage, logger);
  });

  it("starts with no selected board", () => {
    expect(hm.getSelectedBoardId()).toBeNull();
    expect(hm.getSelectedBoard()).toBeUndefined();
  });

  it("init restores last board from storage", () => {
    storage.setItem("hardware:lastBoard", { boardId: "uno" });
    hm.init();
    expect(hm.getSelectedBoardId()).toBe("uno");
  });

  it("getAvailableBoards returns boards", () => {
    const boards = hm.getAvailableBoards();
    expect(boards.length).toBeGreaterThan(0);
    expect(boards[0].id).toBeDefined();
  });

  it("selectBoard selects board", () => {
    hm.selectBoard("uno");
    expect(hm.getSelectedBoardId()).toBe("uno");
    expect(hm.getSelectedBoard()?.id).toBe("uno");
  });

  it("selectBoard warns for unknown board", () => {
    hm.selectBoard("nonexistent");
    expect(hm.getSelectedBoardId()).toBeNull();
  });

  it("getBoardCapabilities returns capabilities for valid board", () => {
    const caps = hm.getBoardCapabilities("uno");
    expect(caps).toContain("digital");
    expect(caps).toContain("pwm");
  });

  it("getBoardCapabilities returns empty for unknown board", () => {
    expect(hm.getBoardCapabilities("unknown")).toEqual([]);
  });

  it("boardHasCapability checks capability", () => {
    expect(hm.boardHasCapability("uno", "pwm")).toBe(true);
    expect(hm.boardHasCapability("uno", "wifi")).toBe(false);
  });

  it("isConnected returns false when no device", () => {
    expect(hm.isConnected()).toBe(false);
  });

  it("createConnection creates USB connection", () => {
    const conn = hm.createConnection("usb");
    expect(conn.type).toBe("usb");
  });

  it("createConnection creates Serial connection", () => {
    const conn = hm.createConnection("serial");
    expect(conn.type).toBe("serial");
  });

  it("createConnection creates Bluetooth connection", () => {
    const conn = hm.createConnection("bluetooth");
    expect(conn.type).toBe("bluetooth");
  });

  it("createConnection creates WiFi connection", () => {
    const conn = hm.createConnection("wifi");
    expect(conn.type).toBe("wifi");
  });

  it("getPortManager returns port manager", () => {
    expect(hm.getPortManager()).toBe(pm);
  });

  it("getDeviceManager returns device manager", () => {
    expect(hm.getDeviceManager()).toBe(dm);
  });
});
