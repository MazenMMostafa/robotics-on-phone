import { describe, it, expect, beforeEach, vi } from "vitest";
import { executeReset } from "../../../services/upload/esp32/EspResetStrategy";
import type { ConnectionAdapter } from "../../../types/hardware";
import type { LoggerService } from "../../../services/logging/LoggerService";

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

describe("EspResetStrategy", () => {
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
      writeBytes: vi.fn().mockImplementation((buffer: number[]) => Promise.resolve({ bytesWritten: buffer.length })),
      readBytes: vi.fn().mockResolvedValue({ data: "", bytes: [] }),
      flush: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockReturnValue(true),
    };
  });

  it("handles en_pin reset strategy", async () => {
    const result = await executeReset("en_pin", connection, 115200, 2000, mockLogger as unknown as LoggerService);
    expect(result.success).toBe(true);
    expect(connection.connect).toHaveBeenCalledWith({ baudRate: 115200 });
    expect(connection.flush).toHaveBeenCalled();
    expect(connection.disconnect).toHaveBeenCalled();
  });

  it("handles boot_pin reset strategy", async () => {
    const result = await executeReset("boot_pin", connection, 115200, 2000, mockLogger as unknown as LoggerService);
    expect(result.success).toBe(true);
    expect(result.inBootloader).toBe(true);
    expect(connection.writeBytes).toHaveBeenCalled();
  });

  it("handles usb reset strategy", async () => {
    const result = await executeReset("usb", connection, 115200, 2000, mockLogger as unknown as LoggerService);
    expect(result.success).toBe(true);
    expect(result.inBootloader).toBe(true);
    expect(connection.flush).toHaveBeenCalled();
  });

  it("falls back to boot_pin for unknown strategy", async () => {
    const result = await executeReset("invalid" as never, connection, 115200, 2000, mockLogger as unknown as LoggerService);
    expect(result.success).toBe(true);
    expect(mockLogger.warn).toHaveBeenCalled();
  });
});
