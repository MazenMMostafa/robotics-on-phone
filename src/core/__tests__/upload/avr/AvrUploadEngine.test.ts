import { describe, it, expect, beforeEach, vi } from "vitest";
import { LoggerService } from "../../../services/logging/LoggerService";
import { AvrUploadEngine } from "../../../services/upload/avr/AvrUploadEngine";
import { MockBackend } from "../../../services/upload/backends/MockBackend";
import { UploaderBackendRegistry } from "../../../services/upload/UploaderBackendRegistry";
import { BackendUnavailable, InvalidArguments } from "../../../types/upload/error";
import type { UploadOptions } from "../../../services/upload/UploadEngine";

function makeOptions(overrides?: Partial<UploadOptions>): UploadOptions {
  return {
    boardId: "uno",
    portId: "/dev/ttyUSB0",
    artifactPath: "/tmp/build/sketch.hex",
    ...overrides,
  };
}

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), nbLog: vi.fn() } as unknown as LoggerService;

describe("AvrUploadEngine", () => {
  let engine: AvrUploadEngine;
  let registry: UploaderBackendRegistry;
  let backend: MockBackend;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new UploaderBackendRegistry();
    backend = new MockBackend(["uno", "nano", "mega"], "avrdude-v1", "AVR Dude");
    registry.register(backend);
    engine = new AvrUploadEngine(registry, mockLogger);
  });

  describe("supports", () => {
    it("returns true for uno", () => {
      expect(engine.supports("uno")).toBe(true);
    });
    it("returns true for nano", () => {
      expect(engine.supports("nano")).toBe(true);
    });
    it("returns true for mega", () => {
      expect(engine.supports("mega")).toBe(true);
    });
    it("returns false for esp32", () => {
      expect(engine.supports("esp32")).toBe(false);
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
      const lonely = new AvrUploadEngine(emptyRegistry, mockLogger);
      await expect(lonely.upload(makeOptions())).rejects.toThrow(BackendUnavailable);
    });

    it("throws on invalid options", async () => {
      backend.setSimulateFailure(true);
      await expect(engine.upload(makeOptions())).rejects.toThrow(InvalidArguments);
    });

    it("handles cancellation", async () => {
      backend.setSimulateDelay(100);
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

    it("returns false when backend verification fails", async () => {
      backend.setSimulateFailure(true);
      const ok = await engine.verify(makeOptions());
      expect(ok).toBe(false);
    });

    it("returns false when no backend registered", async () => {
      const emptyRegistry = new UploaderBackendRegistry();
      const lonely = new AvrUploadEngine(emptyRegistry, mockLogger);
      const ok = await lonely.verify(makeOptions());
      expect(ok).toBe(false);
    });
  });

  describe("cancel", () => {
    it("propagates to backend", async () => {
      backend.setSimulateDelay(100);
      await engine.cancel();
      const result = await engine.upload(makeOptions());
      expect(result.status).toBe("cancelled");
    });
  });

  describe("cleanup", () => {
    it("propagates to backend", async () => {
      await expect(engine.cleanup(makeOptions())).resolves.toBeUndefined();
    });

    it("handles missing backend gracefully", async () => {
      const emptyRegistry = new UploaderBackendRegistry();
      const lonely = new AvrUploadEngine(emptyRegistry, mockLogger);
      await expect(lonely.cleanup(makeOptions())).resolves.toBeUndefined();
    });
  });

  describe("engine metadata", () => {
    it("has correct id, name, and version", () => {
      expect(engine.id).toBe("arduino-avr-v1");
      expect(engine.name).toBe("Arduino AVR Uploader");
      expect(engine.version).toBe("1.0.0");
    });
  });
});
