import { describe, it, expect, beforeEach, vi } from "vitest";
import { Esp32UploadEngine } from "../../../services/upload/esp32/Esp32UploadEngine";
import { MockBackend } from "../../../services/upload/backends/MockBackend";
import { UploaderBackendRegistry } from "../../../services/upload/UploaderBackendRegistry";
import { BackendUnavailable, InvalidArguments } from "../../../types/upload/error";
import type { UploadOptions } from "../../../services/upload/UploadEngine";
import type { LoggerService } from "../../../services/logging/LoggerService";

function makeOptions(overrides?: Partial<UploadOptions>): UploadOptions {
  return { boardId: "esp32", portId: "/dev/ttyUSB0", artifactPath: "/tmp/build/firmware.bin", ...overrides };
}

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as LoggerService;

describe("Esp32UploadEngine", () => {
  let engine: Esp32UploadEngine;
  let registry: UploaderBackendRegistry;
  let backend: MockBackend;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new UploaderBackendRegistry();
    backend = new MockBackend(["esp32", "esp32-s2", "esp32-s3", "esp32-c3"], "esptool-v1", "ESP Tool");
    registry.register(backend);
    engine = new Esp32UploadEngine(registry, mockLogger);
  });

  describe("supports", () => {
    it("returns true for esp32", () => {
      expect(engine.supports("esp32")).toBe(true);
    });
    it("returns true for esp32-s3", () => {
      expect(engine.supports("esp32-s3")).toBe(true);
    });
    it("returns true for esp32-c3", () => {
      expect(engine.supports("esp32-c3")).toBe(true);
    });
    it("returns false for uno", () => {
      expect(engine.supports("uno")).toBe(false);
    });
  });

  describe("prepare", () => {
    it("returns without error", async () => {
      await expect(engine.prepare(makeOptions())).resolves.toBeUndefined();
    });
  });

  describe("upload", () => {
    it("delegates to backend and returns success", async () => {
      const result = await engine.upload(makeOptions());
      expect(result.status).toBe("success");
    });

    it("throws when no backend registered", async () => {
      const emptyRegistry = new UploaderBackendRegistry();
      const lonely = new Esp32UploadEngine(emptyRegistry, mockLogger);
      await expect(lonely.upload(makeOptions())).rejects.toThrow(BackendUnavailable);
    });

    it("throws on invalid options", async () => {
      backend.setSimulateFailure(true);
      await expect(engine.upload(makeOptions())).rejects.toThrow(InvalidArguments);
    });

    it("handles cancellation", async () => {
      backend.setSimulateDelay(50);
      engine.cancel();
      const result = await engine.upload(makeOptions());
      expect(result.status).toBe("cancelled");
    });
  });

  describe("verify", () => {
    it("returns true when backend verifies", async () => {
      const ok = await engine.verify(makeOptions());
      expect(ok).toBe(true);
    });

    it("returns false when verification fails", async () => {
      backend.setSimulateFailure(true);
      const ok = await engine.verify(makeOptions());
      expect(ok).toBe(false);
    });

    it("returns false when no backend registered", async () => {
      const emptyRegistry = new UploaderBackendRegistry();
      const lonely = new Esp32UploadEngine(emptyRegistry, mockLogger);
      const ok = await lonely.verify(makeOptions());
      expect(ok).toBe(false);
    });
  });

  describe("cancel", () => {
    it("propagates to backend without error", async () => {
      await expect(engine.cancel()).resolves.toBeUndefined();
    });
  });

  describe("cleanup", () => {
    it("propagates to backend", async () => {
      await expect(engine.cleanup(makeOptions())).resolves.toBeUndefined();
    });

    it("handles missing backend gracefully", async () => {
      const emptyRegistry = new UploaderBackendRegistry();
      const lonely = new Esp32UploadEngine(emptyRegistry, mockLogger);
      await expect(lonely.cleanup(makeOptions())).resolves.toBeUndefined();
    });
  });

  describe("engine metadata", () => {
    it("has correct id, name, and version", () => {
      expect(engine.id).toBe("arduino-esp32-v1");
      expect(engine.name).toBe("Arduino ESP32 Uploader");
      expect(engine.version).toBe("1.0.0");
    });
  });
});
