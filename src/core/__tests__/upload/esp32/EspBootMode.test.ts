import { describe, it, expect, beforeEach, vi } from "vitest";
import { executeBoot } from "../../../services/upload/esp32/EspBootMode";
import type { ConnectionAdapter } from "../../../types/hardware";
import type { LoggerService } from "../../../services/logging/LoggerService";

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

describe("EspBootMode", () => {
  let connection: ConnectionAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    connection = {
      type: "usb" as const,
      state: "connected" as const,
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      read: vi.fn(),
      write: vi.fn(),
      writeBytes: vi.fn(),
      readBytes: vi.fn().mockResolvedValue({ data: "", bytes: [0x01] }),
      flush: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true),
    };
  });

  it("handle auto boot mode with response", async () => {
    const result = await executeBoot("auto", connection, 115200, mockLogger as unknown as LoggerService);
    expect(result.success).toBe(true);
    expect(result.mode).toBe("auto");
  });

  it("handle auto boot mode without response", async () => {
    vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [] });
    const result = await executeBoot("auto", connection, 115200, mockLogger as unknown as LoggerService);
    expect(result.success).toBe(false);
  });

  it("handle auto boot mode with undefined bytes", async () => {
    vi.mocked(connection.readBytes).mockResolvedValue({ data: "" });
    const result = await executeBoot("auto", connection, 115200, mockLogger as unknown as LoggerService);
    expect(result.success).toBe(false);
  });

  it("handle manual boot mode", async () => {
    const result = await executeBoot("manual", connection, 115200, mockLogger as unknown as LoggerService);
    expect(result.success).toBe(true);
    expect(result.mode).toBe("manual");
  });

  it("handle usb_cdc boot mode", async () => {
    const result = await executeBoot("usb_cdc", connection, 115200, mockLogger as unknown as LoggerService);
    expect(result.success).toBe(true);
    expect(result.mode).toBe("usb_cdc");
  });

  it("falls back to auto for unknown mode", async () => {
    vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [] });
    const result = await executeBoot("invalid" as never, connection, 115200, mockLogger as unknown as LoggerService);
    expect(result.success).toBe(false);
    expect(result.mode).toBe("auto");
    expect(mockLogger.warn).toHaveBeenCalled();
  });
});
