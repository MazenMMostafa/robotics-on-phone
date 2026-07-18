import { describe, it, expect, beforeEach, vi } from "vitest";
import { PortManager } from "../../services/port/PortManager";
import type { StorageAdapter } from "../../platform/types";
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

describe("PortManager", () => {
  let pm: PortManager;
  let storage: StorageAdapter;
  let logger: LoggerService;

  beforeEach(() => {
    storage = createMockStorage();
    logger = new LoggerService();
    pm = new PortManager(storage, logger);
  });

  it("starts with no ports", () => {
    expect(pm.getPorts()).toHaveLength(0);
    expect(pm.getSelectedPortId()).toBeNull();
  });

  it("init restores last port from storage", () => {
    storage.setItem("hardware:lastPort", { portId: "usb-0" });
    pm.init();
    expect(pm.getSelectedPortId()).toBe("usb-0");
  });

  it("setPorts replaces port list", () => {
    pm.setPorts([{ id: "p1", name: "COM1", connectionType: "usb", available: true }]);
    expect(pm.getPorts()).toHaveLength(1);
  });

  it("addPort adds new port", () => {
    pm.addPort({ id: "p1", name: "COM1", connectionType: "usb", available: true });
    expect(pm.getPorts()).toHaveLength(1);
  });

  it("addPort updates existing port", () => {
    pm.addPort({ id: "p1", name: "COM1", connectionType: "usb", available: true });
    pm.addPort({ id: "p1", name: "COM2", connectionType: "usb", available: true });
    expect(pm.getPorts()).toHaveLength(1);
    expect(pm.getPorts()[0].name).toBe("COM2");
  });

  it("removePort removes port", () => {
    pm.addPort({ id: "p1", name: "COM1", connectionType: "usb", available: true });
    pm.removePort("p1");
    expect(pm.getPorts()).toHaveLength(0);
  });

  it("selectPort selects port", () => {
    pm.addPort({ id: "p1", name: "COM1", connectionType: "usb", available: true });
    pm.selectPort("p1");
    expect(pm.getSelectedPortId()).toBe("p1");
    expect(pm.getSelectedPort()).toBeDefined();
  });

  it("selectPort warns for unknown port", () => {
    pm.selectPort("unknown");
    expect(pm.getSelectedPortId()).toBeNull();
  });

  it("clearSelection clears port", () => {
    pm.addPort({ id: "p1", name: "COM1", connectionType: "usb", available: true });
    pm.selectPort("p1");
    pm.clearSelection();
    expect(pm.getSelectedPortId()).toBeNull();
  });

  it("refresh returns cached ports", async () => {
    pm.setPorts([{ id: "p1", name: "COM1", connectionType: "usb", available: true }]);
    const ports = await pm.refresh();
    expect(ports).toHaveLength(1);
  });

  it("removePort clears selection if selected", () => {
    pm.addPort({ id: "p1", name: "COM1", connectionType: "usb", available: true });
    pm.selectPort("p1");
    pm.removePort("p1");
    expect(pm.getSelectedPortId()).toBeNull();
  });
});
