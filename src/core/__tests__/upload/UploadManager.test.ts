import { describe, it, expect, beforeEach, vi } from "vitest";
import { UploadManager } from "../../services/upload/UploadManager";
import { UploadEngineRegistry } from "../../services/upload/UploadEngineRegistry";
import type { UploadEngine, UploadOptions } from "../../services/upload/UploadEngine";
import type { UploadProgress } from "../../types/upload";
import type { UploadResult } from "../../types/upload/result";
import type { LoggerService } from "../../services/logging/LoggerService";
import { UnknownUploaderError } from "../../types/upload/error";
import { EventBus } from "../../services/extension/EventBus";
import { UPLOAD_EVENTS_CONST } from "../../services/upload/UploadEvents";

class MockLogger {
  info = vi.fn();
  warn = vi.fn();
  error = vi.fn();
}

function createMockEngine(
  id: string,
  supportedBoards: string[],
  failOnPrepare = false,
  failOnUpload = false,
  failOnVerify = false,
): UploadEngine {
  return {
    id,
    name: `Mock ${id}`,
    version: "1.0.0",
    supports(boardId: string) {
      return supportedBoards.includes(boardId);
    },
    async prepare(_options: UploadOptions) {
      if (failOnPrepare) throw new Error("Prepare failed");
    },
    async upload(
      _options: UploadOptions,
      _onProgress?: (progress: UploadProgress) => void,
    ): Promise<UploadResult> {
      if (failOnUpload) throw new Error("Upload failed");
      return { status: "success", stage: "done", message: "ok", duration: 100, timestamp: Date.now() };
    },
    async verify(_options: UploadOptions): Promise<boolean> {
      if (failOnVerify) throw new Error("Verify failed");
      return true;
    },
    async cancel() {},
    async cleanup(_options: UploadOptions) {},
  };
}

describe("UploadManager", () => {
  let registry: UploadEngineRegistry;
  let manager: UploadManager;
  let logger: MockLogger;
  const defaultOptions: UploadOptions = {
    boardId: "uno",
    portId: "/dev/ttyUSB0",
    artifactPath: "/tmp/build/sketch.hex",
  };

  beforeEach(() => {
    registry = new UploadEngineRegistry();
    logger = new MockLogger();
    manager = new UploadManager(registry, logger as unknown as LoggerService);
  });

  it("starts idle", () => {
    expect(manager.getStatus()).toBe("idle");
    expect(manager.getActiveEngine()).toBeNull();
  });

  it("has no queued uploads initially", () => {
    expect(manager.hasQueuedUploads()).toBe(false);
  });

  it("throws UnknownUploaderError if no engine found", async () => {
    await expect(manager.start(defaultOptions)).rejects.toThrow(UnknownUploaderError);
  });

  it("throws error if engine id not found", async () => {
    await expect(manager.startWithEngine("nonexistent", defaultOptions)).rejects.toThrow(UnknownUploaderError);
  });

  it("completes a successful upload", async () => {
    const engine = createMockEngine("avr", ["uno"]);
    registry.register(engine);
    const result = await manager.start(defaultOptions);
    expect(result.status).toBe("success");
    expect(manager.getStatus()).toBe("done");
  });

  it("reports progress during upload", async () => {
    const engine = createMockEngine("avr", ["uno"]);
    registry.register(engine);
    const events: string[] = [];
    const unsub = EventBus.on(UPLOAD_EVENTS_CONST.PROGRESS, (p: UploadProgress) => {
      events.push(p.stage);
    });
    await manager.start(defaultOptions);
    expect(events).toContain("validating");
    expect(events).toContain("uploading");
    expect(events).toContain("verifying");
    expect(events).toContain("done");
    unsub();
  });

  it("emits started and finished events", async () => {
    const engine = createMockEngine("avr", ["uno"]);
    registry.register(engine);
    const started = vi.fn();
    const finished = vi.fn();
    EventBus.on(UPLOAD_EVENTS_CONST.STARTED, started);
    EventBus.on(UPLOAD_EVENTS_CONST.FINISHED, finished);
    await manager.start(defaultOptions);
    expect(started).toHaveBeenCalledOnce();
    expect(finished).toHaveBeenCalledOnce();
  });

  it("emits failed event on upload error", async () => {
    const engine = createMockEngine("avr", ["uno"], false, true);
    registry.register(engine);
    const failed = vi.fn();
    EventBus.on(UPLOAD_EVENTS_CONST.FAILED, failed);
    await expect(manager.start(defaultOptions)).rejects.toThrow("Upload failed");
    expect(failed).toHaveBeenCalledOnce();
  });

  it("cancels a running upload", async () => {
    const engine = createMockEngine("avr", ["uno"]);
    registry.register(engine);
    const cancelSpy = vi.spyOn(engine, "cancel");
    const cancelled = vi.fn();
    EventBus.on(UPLOAD_EVENTS_CONST.CANCELLED, cancelled);

    const uploadPromise = manager.start(defaultOptions);
    manager.cancel();
    await uploadPromise;
    expect(cancelSpy).toHaveBeenCalled();
  });

  it("enqueues upload options", () => {
    manager.enqueue(defaultOptions);
    expect(manager.hasQueuedUploads()).toBe(true);
  });

  it("emits queued event on enqueue", () => {
    const queued = vi.fn();
    EventBus.on(UPLOAD_EVENTS_CONST.QUEUED, queued);
    manager.enqueue(defaultOptions);
    expect(queued).toHaveBeenCalledOnce();
  });

  it("processes queue", async () => {
    const engine = createMockEngine("avr", ["uno"]);
    registry.register(engine);
    manager.enqueue(defaultOptions);
    await manager.processQueue();
    expect(manager.hasQueuedUploads()).toBe(false);
  });

  it("resets state", () => {
    manager.enqueue(defaultOptions);
    manager.reset();
    expect(manager.getStatus()).toBe("idle");
    expect(manager.hasQueuedUploads()).toBe(false);
    expect(manager.getActiveEngine()).toBeNull();
  });

  it("retries an upload", async () => {
    const engine = createMockEngine("avr", ["uno"]);
    registry.register(engine);
    const result = await manager.retry(defaultOptions);
    expect(result.status).toBe("success");
  });

  it("starts with a specific engine", async () => {
    const engine1 = createMockEngine("engine-a", ["uno"]);
    const engine2 = createMockEngine("engine-b", ["uno"]);
    registry.registerMany([engine1, engine2]);
    const result = await manager.startWithEngine("engine-b", defaultOptions);
    expect(result.status).toBe("success");
  });

  it("startWithEngine throws if engine does not support board", async () => {
    const engine = createMockEngine("nano-engine", ["nano"]);
    registry.register(engine);
    await expect(
      manager.startWithEngine("nano-engine", defaultOptions),
    ).rejects.toThrow(UnknownUploaderError);
  });

  it("reports current progress", () => {
    const progress = manager.getCurrentProgress();
    expect(progress.stage).toBe("idle");
    expect(progress.percent).toBe(0);
  });

  it("handles processQueue with failing upload", async () => {
    const engine = createMockEngine("avr", ["uno"], false, true);
    registry.register(engine);
    manager.enqueue(defaultOptions);
    await expect(manager.processQueue()).resolves.toBeUndefined();
    expect(manager.hasQueuedUploads()).toBe(false);
  });

  it("throws if engine does not support board", async () => {
    const engine = createMockEngine("avr", ["nano"]);
    registry.register(engine);
    await expect(manager.start(defaultOptions)).rejects.toThrow(UnknownUploaderError);
  });

  it("cancel when idle does nothing", async () => {
    const cancelled = vi.fn();
    EventBus.on(UPLOAD_EVENTS_CONST.CANCELLED, cancelled);
    await manager.cancel();
    expect(cancelled).not.toHaveBeenCalled();
    expect(manager.getStatus()).toBe("idle");
  });

  it("handles verify returning false", async () => {
    const engine: UploadEngine = {
      id: "fail-verify", name: "Fail Verify", version: "1.0.0",
      supports() { return true; },
      async prepare() {},
      async upload() { return { status: "success" as const, stage: "done", message: "ok", duration: 100, timestamp: Date.now() }; },
      async verify() { return false; },
      async cancel() {},
      async cleanup() {},
    };
    registry.register(engine);
    const result = await manager.start(defaultOptions);
    expect(result.status).toBe("failure");
    expect(result.message).toContain("verification failed");
  });

  it("handles non-Error throw during upload", async () => {
    const engine: UploadEngine = {
      id: "throw-string", name: "Throw String", version: "1.0.0",
      supports() { return true; },
      async prepare() {},
      async upload() { throw "string error"; },
      async verify() { return true; },
      async cancel() {},
      async cleanup() {},
    };
    registry.register(engine);
    const failed = vi.fn();
    EventBus.on(UPLOAD_EVENTS_CONST.FAILED, failed);
    await expect(manager.start(defaultOptions)).rejects.toBe("string error");
    expect(failed).toHaveBeenCalledOnce();
  });

  it("engine upload progress callback is forwarded", async () => {
    const progressSpy = vi.fn();
    EventBus.on(UPLOAD_EVENTS_CONST.PROGRESS, progressSpy);

    const engine: UploadEngine = {
      id: "progress-test",
      name: "Progress Test",
      version: "1.0.0",
      supports() { return true; },
      async prepare() {},
      async upload(
        _options: UploadOptions,
        onProgress?: (progress: UploadProgress) => void,
      ): Promise<UploadResult> {
        if (onProgress) {
          onProgress({ stage: "uploading", percent: 50, estimatedRemaining: 5000, speed: 1000, messages: [], errors: [], timestamp: Date.now() });
        }
        return { status: "success", stage: "done", message: "ok", duration: 100, timestamp: Date.now() };
      },
      async verify() { return true; },
      async cancel() {},
      async cleanup() {},
    };
    registry.register(engine);
    await manager.start(defaultOptions);

    expect(progressSpy).toHaveBeenCalled();
    const lastCall = progressSpy.mock.calls[progressSpy.mock.calls.length - 1][0] as UploadProgress;
    expect(lastCall.stage).toBe("done");
    expect(lastCall.percent).toBe(100);
  });
});
