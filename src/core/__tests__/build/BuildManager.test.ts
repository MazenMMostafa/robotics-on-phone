import { describe, it, expect, beforeEach, vi } from "vitest";
import { BuildManager } from "../../services/build/BuildManager";
import { BuildEngineRegistry } from "../../services/build/BuildEngineRegistry";
import { BuildCache } from "../../services/build/BuildCache";
import type { BuildEngine, BuildOptions, BuildProgress, BuildResult } from "../../types/build/engine";
import type { BuildArtifact } from "../../types/build/artifact";
import { BUILD_EVENTS } from "../../types/build/events";
import { EventBus } from "../../services/extension/EventBus";

class MockLogger {
  info = vi.fn();
  warn = vi.fn();
  error = vi.fn();
}

const defaultOptions: BuildOptions = {
  boardId: "uno",
  framework: "arduino",
};

function createMockEngine(
  id: string,
  supportedBoards: string[],
  supportedFrameworks?: string[],
  failOnPrepare = false,
  failOnBuild = false,
): BuildEngine {
  return {
    id,
    name: `Mock ${id}`,
    version: "1.0.0",
    supportedFrameworks: supportedFrameworks ?? ["arduino"],
    supports(boardId: string) {
      return supportedBoards.includes(boardId);
    },
    async prepare(_options: BuildOptions) {
      if (failOnPrepare) throw new Error("Prepare failed");
    },
    async build(_options: BuildOptions, _onProgress?: (progress: BuildProgress) => void): Promise<BuildResult> {
      if (failOnBuild) throw new Error("Build failed");
      return {
        status: "success",
        stage: "done",
        message: "ok",
        artifact: {
          boardId: _options.boardId,
          framework: _options.framework,
          firmwarePath: "/tmp/build/firmware.hex",
          size: 32256,
          checksum: "mock-checksum",
          timestamp: Date.now(),
        },
        duration: 100,
        timestamp: Date.now(),
      };
    },
    async verify(_artifact: BuildArtifact): Promise<boolean> {
      return true;
    },
    async cleanup(_options: BuildOptions) {},
  };
}

describe("BuildManager", () => {
  let registry: BuildEngineRegistry;
  let cache: BuildCache;
  let manager: BuildManager;
  let logger: MockLogger;

  beforeEach(() => {
    registry = new BuildEngineRegistry();
    cache = new BuildCache(10);
    logger = new MockLogger();
    manager = new BuildManager(registry, logger as never, cache);
  });

  it("starts idle", () => {
    expect(manager.getStatus()).toBe("idle");
    expect(manager.getActiveEngine()).toBeNull();
  });

  it("has no queued builds initially", () => {
    expect(manager.hasQueuedBuilds()).toBe(false);
  });

  it("throws if no engine found", async () => {
    await expect(manager.start(defaultOptions)).rejects.toThrow();
  });

  it("throws if engine id not found", async () => {
    await expect(manager.startWithEngine("nonexistent", defaultOptions)).rejects.toThrow(
      'Build engine "nonexistent" not found',
    );
  });

  it("completes a successful build", async () => {
    const engine = createMockEngine("avr-build", ["uno"]);
    registry.register(engine);
    const result = await manager.start(defaultOptions);
    expect(result.status).toBe("success");
    expect(manager.getStatus()).toBe("done");
  });

  it("reports progress during build", async () => {
    const engine = createMockEngine("avr-build", ["uno"]);
    registry.register(engine);
    const events: string[] = [];
    const unsub = EventBus.on(BUILD_EVENTS.BUILD_PROGRESS, (p: BuildProgress) => {
      events.push(p.stage);
    });
    await manager.start(defaultOptions);
    expect(events).toContain("preparing");
    expect(events).toContain("compiling");
    expect(events).toContain("finishing");
    expect(events).toContain("done");
    unsub();
  });

  it("emits started and finished events", async () => {
    const engine = createMockEngine("avr-build", ["uno"]);
    registry.register(engine);
    const started = vi.fn();
    const finished = vi.fn();
    EventBus.on(BUILD_EVENTS.BUILD_STARTED, started);
    EventBus.on(BUILD_EVENTS.BUILD_FINISHED, finished);
    await manager.start(defaultOptions);
    expect(started).toHaveBeenCalledOnce();
    expect(finished).toHaveBeenCalledOnce();
  });

  it("emits failed event on build error", async () => {
    const engine = createMockEngine("avr-build", ["uno"], ["arduino"], false, true);
    registry.register(engine);
    const failed = vi.fn();
    EventBus.on(BUILD_EVENTS.BUILD_FAILED, failed);
    await expect(manager.start(defaultOptions)).rejects.toThrow("Build failed");
    expect(failed).toHaveBeenCalledOnce();
  });

  it("enqueues build options", () => {
    manager.enqueue(defaultOptions);
    expect(manager.hasQueuedBuilds()).toBe(true);
  });

  it("emits queued event on enqueue", () => {
    const queued = vi.fn();
    EventBus.on(BUILD_EVENTS.BUILD_QUEUED, queued);
    manager.enqueue(defaultOptions);
    expect(queued).toHaveBeenCalledOnce();
  });

  it("processes queue", async () => {
    const engine = createMockEngine("avr-build", ["uno"]);
    registry.register(engine);
    manager.enqueue(defaultOptions);
    await manager.processQueue();
    expect(manager.hasQueuedBuilds()).toBe(false);
  });

  it("processes queue with engineId", async () => {
    const engine = createMockEngine("avr-build", ["uno"]);
    registry.register(engine);
    manager.enqueue(defaultOptions, "avr-build");
    await manager.processQueue();
    expect(manager.hasQueuedBuilds()).toBe(false);
  });

  it("resets state", () => {
    manager.enqueue(defaultOptions);
    manager.reset();
    expect(manager.getStatus()).toBe("idle");
    expect(manager.hasQueuedBuilds()).toBe(false);
    expect(manager.getActiveEngine()).toBeNull();
  });

  it("retries a build", async () => {
    const engine = createMockEngine("avr-build", ["uno"]);
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

  it("reports current progress", () => {
    const progress = manager.getCurrentProgress();
    expect(progress.stage).toBe("queued");
    expect(progress.percent).toBe(0);
  });

  it("handles processQueue with failing build", async () => {
    const engine = createMockEngine("avr-build", ["uno"], ["arduino"], false, true);
    registry.register(engine);
    manager.enqueue(defaultOptions);
    await expect(manager.processQueue()).resolves.toBeUndefined();
    expect(manager.hasQueuedBuilds()).toBe(false);
  });

  it("cancel when idle does nothing", async () => {
    const cancelled = vi.fn();
    EventBus.on(BUILD_EVENTS.BUILD_CANCELLED, cancelled);
    await manager.cancel();
    expect(cancelled).not.toHaveBeenCalled();
    expect(manager.getStatus()).toBe("idle");
  });

  it("handles non-Error throw during build", async () => {
    const engine: BuildEngine = {
      id: "throw-string",
      name: "Throw String",
      version: "1.0.0",
      supportedFrameworks: ["arduino"],
      supports() { return true; },
      async prepare() {},
      async build() { throw "string error"; },
      async verify() { return true; },
      async cleanup() {},
    };
    registry.register(engine);
    const failed = vi.fn();
    EventBus.on(BUILD_EVENTS.BUILD_FAILED, failed);
    await expect(manager.start(defaultOptions)).rejects.toBe("string error");
    expect(failed).toHaveBeenCalledOnce();
  });

  it("supports custom cache", () => {
    const customCache = new BuildCache(5);
    const mgr = new BuildManager(registry, logger as never, customCache);
    expect(mgr["cache"]).toBe(customCache);
  });

  it("creates default cache when not provided", () => {
    const mgr = new BuildManager(registry, logger as never);
    expect(mgr["cache"]).toBeInstanceOf(BuildCache);
  });

  it("getCachedArtifact returns undefined when not cached", () => {
    expect(manager.getCachedArtifact("uno", "arduino")).toBeUndefined();
  });

  it("hasCachedArtifact returns false when not cached", () => {
    expect(manager.hasCachedArtifact("uno", "arduino")).toBe(false);
  });

  it("caches artifact after successful build", async () => {
    const engine = createMockEngine("avr-build", ["uno"]);
    registry.register(engine);
    await manager.start(defaultOptions);
    expect(manager.hasCachedArtifact("uno", "arduino")).toBe(true);
    expect(manager.getCachedArtifact("uno", "arduino")).toBeDefined();
  });

  it("clearCache removes all artifacts", async () => {
    const engine = createMockEngine("avr-build", ["uno"]);
    registry.register(engine);
    await manager.start(defaultOptions);
    expect(manager.hasCachedArtifact("uno", "arduino")).toBe(true);
    manager.clearCache();
    expect(manager.hasCachedArtifact("uno", "arduino")).toBe(false);
  });

  it("getCurrentProgress returns copy of messages and errors", () => {
    const progress = manager.getCurrentProgress();
    progress.messages.push("mutated");
    progress.errors.push("mutated-error");
    const progress2 = manager.getCurrentProgress();
    expect(progress2.messages).not.toContain("mutated");
    expect(progress2.errors).not.toContain("mutated-error");
  });

  it("cancel when preparing sets cancelled stage", async () => {
    const delayedEngine: BuildEngine = {
      id: "delayed-build",
      name: "Delayed Build",
      version: "1.0.0",
      supportedFrameworks: ["arduino"],
      supports() { return true; },
      async prepare() { await new Promise((r) => setTimeout(r, 100)); },
      async build() { return { status: "success", stage: "done", message: "ok", duration: 0, timestamp: Date.now() }; },
      async verify() { return true; },
      async cleanup() {},
    };
    registry.register(delayedEngine);
    manager.start(defaultOptions);
    await new Promise((r) => setTimeout(r, 10));
    await manager.cancel();
    expect(manager.getStatus()).toBe("done");
  });

  it("cancel emits BUILDCANCELLED event", async () => {
    const delayedEngine: BuildEngine = {
      id: "delayed-build-2",
      name: "Delayed Build 2",
      version: "1.0.0",
      supportedFrameworks: ["arduino"],
      supports() { return true; },
      async prepare() { await new Promise((r) => setTimeout(r, 100)); },
      async build() { return { status: "success", stage: "done", message: "ok", duration: 0, timestamp: Date.now() }; },
      async verify() { return true; },
      async cleanup() {},
    };
    registry.register(delayedEngine);
    const cancelled = vi.fn();
    EventBus.on(BUILD_EVENTS.BUILD_CANCELLED, cancelled);
    manager.start(defaultOptions);
    await new Promise((r) => setTimeout(r, 10));
    await manager.cancel();
    expect(cancelled).toHaveBeenCalledOnce();
  });

  it("startWithEngine throws if engine does not support board", async () => {
    const engine = createMockEngine("nano-build", ["nano"]);
    registry.register(engine);
    await expect(
      manager.startWithEngine("nano-build", defaultOptions),
    ).rejects.toThrow("not supported");
  });

  it("forwards progress callback to engine build", async () => {
    const callbackSpy = vi.fn();
    const progressEngine: BuildEngine = {
      id: "progress-engine",
      name: "Progress",
      version: "1.0.0",
      supportedFrameworks: ["arduino"],
      supports() { return true; },
      async prepare() {},
      async build(_options, onProgress) {
        if (onProgress) onProgress({ stage: "compiling", percent: 50, messages: ["progress"], errors: [], timestamp: Date.now() });
        return { status: "success", stage: "done", message: "ok", duration: 0, timestamp: Date.now() };
      },
      async verify() { return true; },
      async cleanup() {},
    };
    registry.register(progressEngine);
    EventBus.on(BUILD_EVENTS.BUILD_PROGRESS, callbackSpy);
    await manager.start(defaultOptions);
    expect(callbackSpy).toHaveBeenCalled();
  });
});
