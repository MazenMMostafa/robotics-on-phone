import { describe, it, expect, beforeEach, vi } from "vitest";
import { EsptoolBackend } from "../../services/upload/backends/EsptoolBackend";
import type { ConnectionAdapter } from "../../types/hardware";
import type { HardwareManager } from "../../services/hardware/HardwareManager";
import type { UploadOptions } from "../../services/upload/UploadEngine";
import type { LoggerService } from "../../services/logging/LoggerService";

const BIG_WRITE = (buffer: number[]) => Promise.resolve({ bytesWritten: buffer.length });

function makeOptions(overrides?: Partial<UploadOptions>): UploadOptions {
  return { boardId: "esp32", portId: "/dev/ttyUSB0", artifactPath: "/tmp/build/firmware.bin", ...overrides };
}

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

describe("EsptoolBackend", () => {
  let backend: EsptoolBackend;
  let connection: ConnectionAdapter;
  let readBytesCallCount: number;

  beforeEach(() => {
    vi.clearAllMocks();
    readBytesCallCount = 0;
    connection = {
      type: "usb" as const,
      state: "connected" as const,
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      read: vi.fn(),
      write: vi.fn(),
      writeBytes: vi.fn().mockImplementation(BIG_WRITE),
      readBytes: vi.fn().mockImplementation(() => {
        readBytesCallCount++;
        if (readBytesCallCount <= 1) return Promise.resolve({ data: "", bytes: [0x55] });
        return Promise.resolve({ data: "", bytes: [0x00] });
      }),
      flush: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockReturnValue(true),
    };
    const hardwareManager = { createConnection: vi.fn().mockReturnValue(connection) } as unknown as HardwareManager;
    backend = new EsptoolBackend(hardwareManager, mockLogger as unknown as LoggerService);
  });

  describe("detect", () => {
    it("returns installed status", async () => {
      const info = await backend.detect();
      expect(info.status).toBe("installed");
      expect(info.id).toBe("esptool-v1");
      expect(info.supportedBoards).toContain("esp32");
      expect(info.supportedBoards).toContain("esp32-c3");
    });
  });

  describe("validate", () => {
    it("validates supported board", async () => {
      const r = await backend.validate(makeOptions());
      expect(r.valid).toBe(true);
    });

    it("rejects unsupported board", async () => {
      const r = await backend.validate(makeOptions({ boardId: "uno" }));
      expect(r.valid).toBe(false);
    });

    it("rejects missing port", async () => {
      const r = await backend.validate(makeOptions({ portId: "" }));
      expect(r.valid).toBe(false);
    });

    it("rejects missing artifact", async () => {
      const r = await backend.validate(makeOptions({ artifactPath: "" }));
      expect(r.valid).toBe(false);
    });
  });

  describe("execute", () => {
    it("completes a successful upload", async () => {
      const result = await backend.execute(makeOptions());
      expect(result.status).toBe("success");
      expect(connection.connect).toHaveBeenCalled();
      expect(connection.disconnect).toHaveBeenCalled();
    });

    it("uses custom baud rate", async () => {
      await backend.execute(makeOptions({ baudRate: 115200 }));
      expect(connection.connect).toHaveBeenCalledWith({ baudRate: 115200 });
    });

    it("handles cancellation mid-execution", async () => {
      const resultPromise = backend.execute(makeOptions());
      await backend.cancel();
      const result = await resultPromise;
      expect(result.status).toBe("cancelled");
    });

    it("throws for unsupported board", async () => {
      await expect(backend.execute(makeOptions({ boardId: "uno" }))).rejects.toThrow();
    });

    it("maps connection error", async () => {
      vi.mocked(connection.connect).mockRejectedValue(new Error("Port not found"));
      await expect(backend.execute(makeOptions())).rejects.toThrow();
    });

    it("cancels during flash loop", async () => {
      const resultPromise = backend.execute(makeOptions({ additionalArgs: { size: 1048576 } }));
      await new Promise(resolve => setTimeout(resolve, 100));
      await backend.cancel();
      const result = await resultPromise;
      expect(result.status).toBe("cancelled");
    }, 20000);

    it("sends progress updates", async () => {
      const onProgress = vi.fn();
      await backend.execute(makeOptions(), onProgress);
      expect(onProgress).toHaveBeenCalled();
    });
  });

  describe("verify", () => {
    it("verifies matching chip", async () => {
      const ok = await backend.verify(makeOptions());
      expect(ok).toBe(true);
    });

    it("detects chip mismatch", async () => {
      vi.mocked(connection.readBytes).mockImplementation(() => {
        readBytesCallCount++;
        if (readBytesCallCount <= 1) return Promise.resolve({ data: "", bytes: [0x55] });
        return Promise.resolve({ data: "", bytes: [0x00] });
      });
      const ok = await backend.verify(makeOptions({ boardId: "esp32-c3" }));
      expect(ok).toBe(false);
    });

    it("returns false for unsupported board", async () => {
      const ok = await backend.verify(makeOptions({ boardId: "uno" }));
      expect(ok).toBe(false);
    });

    it("returns false on connection error", async () => {
      vi.mocked(connection.connect).mockRejectedValue(new Error("failed"));
      const ok = await backend.verify(makeOptions());
      expect(ok).toBe(false);
    });
  });

  describe("cleanup", () => {
    it("resolves without error", async () => {
      await expect(backend.cleanup(makeOptions())).resolves.toBeUndefined();
    });

    it("handles disconnect error gracefully", async () => {
      vi.mocked(connection.disconnect).mockRejectedValue(new Error("already disconnected"));
      await expect(backend.cleanup(makeOptions())).resolves.toBeUndefined();
    });
  });

  describe("error mapping", () => {
    it("maps permission errors", async () => {
      vi.mocked(connection.connect).mockRejectedValue(new Error("Permission denied"));
      await expect(backend.execute(makeOptions())).rejects.toThrow();
    });

    it("maps timeout errors", async () => {
      vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [] });
      await expect(backend.execute(makeOptions({ additionalArgs: { size: 1024 } }))).rejects.toThrow();
    });

    it("maps plain timeout error", async () => {
      vi.mocked(connection.writeBytes).mockRejectedValue(new Error("port timeout"));
      await expect(backend.execute(makeOptions())).rejects.toThrow();
    });

    it("maps unknown errors", async () => {
      vi.mocked(connection.connect).mockRejectedValue(new Error("something went wrong"));
      await expect(backend.execute(makeOptions())).rejects.toThrow();
    });

    it("maps device disconnection errors", async () => {
      vi.mocked(connection.connect).mockRejectedValue(new Error("device removed"));
      await expect(backend.execute(makeOptions())).rejects.toThrow();
    });
  });
});
