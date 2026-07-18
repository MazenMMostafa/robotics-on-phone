import { describe, it, expect, beforeEach, vi } from "vitest";
import { USBConnection } from "../../services/hardware/connections/USBConnection";
import type { USBAdapter } from "../../platform/types";

function createMockAdapter(): USBAdapter {
  return {
    scan: vi.fn().mockResolvedValue([]),
    openConnection: vi.fn().mockResolvedValue(undefined),
    endConnection: vi.fn().mockResolvedValue(undefined),
    write: vi.fn().mockResolvedValue({}),
    read: vi.fn().mockResolvedValue({ data: "ok" }),
    writeBytes: vi.fn().mockResolvedValue({}),
    readBytes: vi.fn().mockResolvedValue({ data: "" }),
    setDTR: vi.fn().mockResolvedValue(undefined),
  };
}

describe("USBConnection", () => {
  let conn: USBConnection;
  let adapter: USBAdapter;

  beforeEach(() => {
    adapter = createMockAdapter();
    conn = new USBConnection(adapter);
  });

  it("starts disconnected", () => {
    expect(conn.state).toBe("disconnected");
    expect(conn.isConnected()).toBe(false);
  });

  it("type is usb", () => {
    expect(conn.type).toBe("usb");
  });

  it("connect transitions to connected", async () => {
    await conn.connect();
    expect(conn.state).toBe("connected");
    expect(conn.isConnected()).toBe(true);
  });

  it("connect throws and transitions to error", async () => {
    vi.mocked(adapter.openConnection).mockRejectedValueOnce(new Error("fail"));
    await expect(conn.connect()).rejects.toThrow("fail");
    expect(conn.state).toBe("error");
  });

  it("disconnect transitions to disconnected", async () => {
    await conn.connect();
    await conn.disconnect();
    expect(conn.state).toBe("disconnected");
    expect(conn.isConnected()).toBe(false);
  });

  it("read delegates to adapter", async () => {
    await conn.connect();
    const result = await conn.read();
    expect(result.data).toBe("ok");
  });

  it("read throws when not connected", async () => {
    await expect(conn.read()).rejects.toThrow("Not connected");
  });

  it("write delegates to adapter", async () => {
    await conn.connect();
    await conn.write("hello");
    expect(adapter.write).toHaveBeenCalledWith("usb-0", "hello", undefined);
  });

  it("writeBytes delegates to adapter", async () => {
    await conn.connect();
    await conn.writeBytes([0x01, 0x02]);
    expect(adapter.writeBytes).toHaveBeenCalledWith("usb-0", [0x01, 0x02]);
  });

  it("readBytes delegates to adapter", async () => {
    await conn.connect();
    await conn.readBytes();
    expect(adapter.readBytes).toHaveBeenCalledWith("usb-0");
  });

  it("flush does not throw", async () => {
    await expect(conn.flush()).resolves.toBeUndefined();
  });

  it("uses connection options", async () => {
    await conn.connect({ baudRate: 9600, dataBits: 7 });
    expect(adapter.openConnection).toHaveBeenCalledWith(
      expect.objectContaining({ baudRate: 9600, dataBits: 7 }),
    );
  });
});
