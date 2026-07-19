import { describe, it, expect, beforeEach, vi } from "vitest";
import type { HardwareManager } from "../../services/hardware/HardwareManager";
import { AvrdudeBackend } from "../../services/upload/backends/AvrdudeBackend";
import { STK500V1Protocol } from "../../services/upload/avr/Stk500V1Protocol";
import type { ConnectionAdapter } from "../../types/hardware";
import type { UploadOptions } from "../../services/upload/UploadEngine";

const BIG_WRITE = (buffer: number[]) => Promise.resolve({ bytesWritten: buffer.length });

function makeOptions(overrides?: Partial<UploadOptions>): UploadOptions {
  return {
    boardId: "uno", portId: "/dev/ttyUSB0", artifactPath: "/tmp/build/sketch.hex", ...overrides,
  };
}

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as unknown as import("../../services/logging/LoggerService").LoggerService;

describe("AvrdudeBackend", () => {
  let backend: AvrdudeBackend;
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
      writeBytes: vi.fn().mockImplementation(BIG_WRITE),
      readBytes: vi.fn().mockResolvedValue({ data: "", bytes: [0x14, 0x10, 0x00, 0x00] }),
      flush: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true),
    };
    const hardwareManager = { createConnection: vi.fn().mockReturnValue(connection) } as unknown as HardwareManager;
    backend = new AvrdudeBackend(hardwareManager, mockLogger);
  });

  describe("detect", () => {
    it("returns installed status", async () => {
      const info = await backend.detect();
      expect(info.status).toBe("installed");
      expect(info.id).toBe("avrdude-v1");
      expect(info.supportedBoards).toContain("uno");
    });
  });

  describe("validate", () => {
    it("validates supported board", async () => {
      const r = await backend.validate(makeOptions());
      expect(r.valid).toBe(true);
    });

    it("rejects unsupported board", async () => {
      const r = await backend.validate(makeOptions({ boardId: "esp32" }));
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
      expect(connection.connect).toHaveBeenCalledWith({ baudRate: 115200 });
      expect(connection.disconnect).toHaveBeenCalled();
    });

    it("handles cancellation", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proto = STK500V1Protocol.prototype as any;
      const origCommand = proto.command;
      proto.command = async function (cmd: number, data: number[], expectedLen: number) {
        if (cmd === 0x64) {
          proto.command = origCommand;
          await backend.cancel();
        }
        return origCommand.call(this, cmd, data, expectedLen);
      };

      const result = await backend.execute(makeOptions());
      expect(result.status).toBe("cancelled");
    });

    it("uses specified baud rate", async () => {
      await backend.execute(makeOptions({ baudRate: 57600 }));
      expect(connection.connect).toHaveBeenCalledWith({ baudRate: 57600 });
    });

    it("throws for unsupported board", async () => {
      await expect(backend.execute(makeOptions({ boardId: "esp32" }))).rejects.toThrow();
    });

    it("maps connection error during execute", async () => {
      vi.mocked(connection.connect).mockRejectedValue(new Error("Port not found"));
      await expect(backend.execute(makeOptions())).rejects.toThrow();
    });
  });

  describe("verify", () => {
    it("returns true when signature matches", async () => {
      vi.mocked(connection.readBytes)
        .mockResolvedValueOnce({ data: "", bytes: [0x14] })
        .mockResolvedValueOnce({ data: "", bytes: [0x14] })
        .mockResolvedValueOnce({ data: "", bytes: [0x1E, 0x95, 0x0F, 0x14] });
      const ok = await backend.verify(makeOptions());
      expect(ok).toBe(true);
    });

    it("returns false for unsupported board", async () => {
      const ok = await backend.verify(makeOptions({ boardId: "esp32" }));
      expect(ok).toBe(false);
    });

    it("returns false on connection error", async () => {
      vi.mocked(connection.connect).mockRejectedValue(new Error("connection failed"));
      const ok = await backend.verify(makeOptions());
      expect(ok).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("prepareReset", () => {
    it("connects at reset speed and disconnects", async () => {
      await backend.prepareReset(makeOptions());
      expect(connection.connect).toHaveBeenCalledWith({ baudRate: 1200 });
      expect(connection.disconnect).toHaveBeenCalled();
    });

    it("returns early for unsupported board", async () => {
      await backend.prepareReset(makeOptions({ boardId: "esp32" }));
      expect(connection.connect).not.toHaveBeenCalled();
    });

    it("maps connection error", async () => {
      vi.mocked(connection.connect).mockRejectedValue(new Error("timeout"));
      await expect(backend.prepareReset(makeOptions())).rejects.toThrow();
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

  describe("progress reporting", () => {
    it("calls progress callback during upload", async () => {
      const onProgress = vi.fn();
      const result = await backend.execute(makeOptions(), onProgress);
      expect(result.status).toBe("success");
      expect(onProgress).toHaveBeenCalled();
    });
  });

  describe("error mapping", () => {
    it("passes through UploadError instances", async () => {
      vi.mocked(connection.connect).mockRejectedValue(
        new (await import("../../types/upload/error")).PortUnavailableError("/dev/test"),
      );
      await expect(backend.execute(makeOptions({ portId: "/dev/test" }))).rejects.toThrow(
        (await import("../../types/upload/error")).PortUnavailableError,
      );
    });

    it("maps permission denied errors", async () => {
      vi.mocked(connection.connect).mockRejectedValue(new Error("Permission denied"));
      await expect(backend.execute(makeOptions())).rejects.toThrow(
        (await import("../../types/upload/error")).PermissionDeniedError,
      );
    });

    it("maps device disconnection errors", async () => {
      vi.mocked(connection.connect).mockRejectedValue(new Error("device removed"));
      await expect(backend.execute(makeOptions())).rejects.toThrow(
        (await import("../../types/upload/error")).DeviceDisconnectedError,
      );
    });

    it("maps unknown errors to UploadError", async () => {
      vi.mocked(connection.connect).mockRejectedValue(new Error("Something went wrong"));
      await expect(backend.execute(makeOptions())).rejects.toThrow(
        (await import("../../types/upload/error")).UploadError,
      );
    });
  });
});
