import { describe, it, expect, beforeEach, vi } from "vitest";
import { EsptoolProtocol } from "../../../services/upload/esp32/EsptoolProtocol";
import type { ConnectionAdapter } from "../../../types/hardware";

describe("EsptoolProtocol", () => {
  let protocol: EsptoolProtocol;
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
      readBytes: vi.fn().mockResolvedValue({ data: "", bytes: [0x55] }),
      flush: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true),
    };
    protocol = new EsptoolProtocol(connection);
  });

  describe("sync", () => {
    it("succeeds when chip responds with 0x55", async () => {
      await expect(protocol.sync()).resolves.toBeUndefined();
      expect(connection.writeBytes).toHaveBeenCalledWith([0x07, 0x07, 0x12, 0x20]);
    });

    it("throws timeout on invalid response", async () => {
      vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [0x00] });
      await expect(protocol.sync()).rejects.toThrow();
    });

    it("retries on failure", async () => {
      vi.mocked(connection.readBytes)
        .mockResolvedValueOnce({ data: "", bytes: [] })
        .mockResolvedValueOnce({ data: "", bytes: [] })
        .mockResolvedValueOnce({ data: "", bytes: [] })
        .mockResolvedValueOnce({ data: "", bytes: [] })
        .mockResolvedValueOnce({ data: "", bytes: [0x55] });
      await expect(protocol.sync()).resolves.toBeUndefined();
      expect(connection.writeBytes).toHaveBeenCalledTimes(5);
    });
  });

  describe("detectChip", () => {
    it("detects ESP32", async () => {
      vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [0x00, 0x00, 0x00] });
      const chip = await protocol.detectChip();
      expect(chip).toBe("ESP32");
    });

    it("detects ESP32-S2", async () => {
      vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [0x00, 0x00, 0x01] });
      const chip = await protocol.detectChip();
      expect(chip).toBe("ESP32-S2");
    });

    it("detects ESP32-S3", async () => {
      vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [0x00, 0x01, 0x01] });
      const chip = await protocol.detectChip();
      expect(chip).toBe("ESP32-S3");
    });

    it("detects ESP32-C3", async () => {
      vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [0x00, 0x01, 0x02] });
      const chip = await protocol.detectChip();
      expect(chip).toBe("ESP32-C3");
    });

    it("throws on non-OK response", async () => {
      vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [0x05] });
      await expect(protocol.detectChip()).rejects.toThrow();
    });
  });

  describe("beginFlash", () => {
    it("succeeds with OK response", async () => {
      vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [0x00] });
      await expect(protocol.beginFlash(0, 1048576, 1024)).resolves.toBeUndefined();
    });

    it("throws on non-OK response", async () => {
      vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [0x05] });
      await expect(protocol.beginFlash(0, 1024, 256)).rejects.toThrow();
    });
  });

  describe("sendData", () => {
    it("sends data block successfully", async () => {
      vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [0x00] });
      await expect(protocol.sendData(0, [0xFF, 0xAA, 0x55])).resolves.toBeUndefined();
      expect(connection.writeBytes).toHaveBeenCalled();
    });

    it("throws on non-OK response", async () => {
      vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [0x05] });
      await expect(protocol.sendData(0, [])).rejects.toThrow();
    });
  });

  describe("endFlash", () => {
    it("succeeds with reboot flag", async () => {
      vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [0x00] });
      await expect(protocol.endFlash(true)).resolves.toBeUndefined();
    });

    it("succeeds without reboot", async () => {
      vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [0x00] });
      await expect(protocol.endFlash(false)).resolves.toBeUndefined();
    });

    it("throws on failure", async () => {
      vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [0x05] });
      await expect(protocol.endFlash(true)).rejects.toThrow();
    });
  });

  describe("readFlash", () => {
    it("reads flash data", async () => {
      vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [0x00, 0xFF, 0xAA, 0x55] });
      const data = await protocol.readFlash(0, 3);
      expect(data).toEqual([0xFF, 0xAA, 0x55]);
    });

    it("throws on non-OK response", async () => {
      vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [0x05] });
      await expect(protocol.readFlash(0, 1)).rejects.toThrow();
    });
  });

  describe("command", () => {
    it("throws on write failure in command", async () => {
      vi.mocked(connection.writeBytes).mockResolvedValue({ bytesWritten: 0 });
      await expect(protocol.beginFlash(0, 1024, 256)).rejects.toThrow();
    });
  });
});
