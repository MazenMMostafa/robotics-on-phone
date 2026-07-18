import { describe, it, expect, beforeEach, vi } from "vitest";
import { CodeGenerationManager } from "../../services/codegen/CodeGenerationManager";
import { CodeGeneratorRegistry } from "../../services/codegen/CodeGeneratorRegistry";
import type { CodeGenerator, GenerationOptions, GenerationProgress, GenerationResult, ValidationResult } from "../../types/codegen/generator";
import { CODEGEN_EVENTS } from "../../types/codegen/events";
import { GeneratorMissing } from "../../types/codegen/error";
import { EventBus } from "../../services/extension/EventBus";

class MockLogger {
  info = vi.fn();
  warn = vi.fn();
  error = vi.fn();
}

const defaultOptions: GenerationOptions = {
  language: "arduino-cpp",
  framework: "arduino",
  board: "uno",
};

function createMockGenerator(
  id: string,
  languages: string[],
  frameworks?: string[],
  failOnValidate = false,
  failOnGenerate = false,
): CodeGenerator {
  return {
    id,
    name: `Mock ${id}`,
    version: "1.0.0",
    supportedLanguages: languages,
    supportedFrameworks: frameworks ?? languages,
    supports(lang: string, fw: string) {
      return languages.includes(lang) && (frameworks ?? languages).includes(fw);
    },
    async prepare(_options: GenerationOptions) {},
    async generate(_options: GenerationOptions, _onProgress?: (p: GenerationProgress) => void): Promise<GenerationResult> {
      if (failOnGenerate) throw new Error("Generation failed");
      return {
        status: "success",
        stage: "done",
        message: "ok",
        artifact: {
          language: _options.language,
          framework: _options.framework,
          board: _options.board,
          sourceFiles: [],
          headers: [],
          assets: [],
          metadata: {},
          checksum: "chk",
          timestamp: Date.now(),
        },
        duration: 100,
        timestamp: Date.now(),
      };
    },
    async validate(_options: GenerationOptions): Promise<ValidationResult> {
      if (failOnValidate) return { valid: false, issues: [{ severity: "error", code: "FAIL", message: "Validation failed" }] };
      return { valid: true, issues: [] };
    },
    async cleanup(_options: GenerationOptions) {},
  };
}

describe("CodeGenerationManager", () => {
  let registry: CodeGeneratorRegistry;
  let manager: CodeGenerationManager;
  let logger: MockLogger;

  beforeEach(() => {
    registry = new CodeGeneratorRegistry();
    logger = new MockLogger();
    manager = new CodeGenerationManager(registry, logger as never);
  });

  it("starts idle", () => {
    expect(manager.getStatus()).toBe("idle");
    expect(manager.getActiveGenerator()).toBeNull();
    expect(manager.getLastArtifact()).toBeNull();
  });

  it("has no queued generations initially", () => {
    expect(manager.hasQueuedGenerations()).toBe(false);
  });

  it("throws GeneratorMissing if no generator found", async () => {
    await expect(manager.generate(defaultOptions)).rejects.toThrow(GeneratorMissing);
  });

  it("throws if generator id not found", async () => {
    await expect(manager.generateWithGenerator("nonexistent", defaultOptions)).rejects.toThrow(
      'Code generator "nonexistent" not found',
    );
  });

  it("completes a successful generation", async () => {
    const gen = createMockGenerator("arduino-gen", ["arduino-cpp"], ["arduino"]);
    registry.register(gen);
    const result = await manager.generate(defaultOptions);
    expect(result.status).toBe("success");
    expect(manager.getStatus()).toBe("done");
    expect(manager.getLastArtifact()).toBeDefined();
  });

  it("reports progress during generation", async () => {
    const gen = createMockGenerator("arduino-gen", ["arduino-cpp"], ["arduino"]);
    registry.register(gen);
    const events: string[] = [];
    const unsub = EventBus.on(CODEGEN_EVENTS.GENERATION_PROGRESS, (p: GenerationProgress) => {
      events.push(p.stage);
    });
    await manager.generate(defaultOptions);
    expect(events).toContain("validating");
    expect(events).toContain("preparing");
    expect(events).toContain("generating");
    expect(events).toContain("done");
    unsub();
  });

  it("emits started and finished events", async () => {
    const gen = createMockGenerator("arduino-gen", ["arduino-cpp"], ["arduino"]);
    registry.register(gen);
    const started = vi.fn();
    const finished = vi.fn();
    EventBus.on(CODEGEN_EVENTS.GENERATION_STARTED, started);
    EventBus.on(CODEGEN_EVENTS.GENERATION_FINISHED, finished);
    await manager.generate(defaultOptions);
    expect(started).toHaveBeenCalledOnce();
    expect(finished).toHaveBeenCalledOnce();
  });

  it("emits failed event on generation error", async () => {
    const gen = createMockGenerator("arduino-gen", ["arduino-cpp"], ["arduino"], false, true);
    registry.register(gen);
    const failed = vi.fn();
    EventBus.on(CODEGEN_EVENTS.GENERATION_FAILED, failed);
    await expect(manager.generate(defaultOptions)).rejects.toThrow("Generation failed");
    expect(failed).toHaveBeenCalledOnce();
  });

  it("enqueues generation options", () => {
    manager.enqueue(defaultOptions);
    expect(manager.hasQueuedGenerations()).toBe(true);
  });

  it("emits queued event on enqueue", () => {
    const queued = vi.fn();
    EventBus.on(CODEGEN_EVENTS.GENERATION_QUEUED, queued);
    manager.enqueue(defaultOptions);
    expect(queued).toHaveBeenCalledOnce();
  });

  it("processes queue", async () => {
    const gen = createMockGenerator("arduino-gen", ["arduino-cpp"], ["arduino"]);
    registry.register(gen);
    manager.enqueue(defaultOptions);
    await manager.processQueue();
    expect(manager.hasQueuedGenerations()).toBe(false);
  });

  it("processes queue with generatorId", async () => {
    const gen = createMockGenerator("arduino-gen", ["arduino-cpp"], ["arduino"]);
    registry.register(gen);
    manager.enqueue(defaultOptions, "arduino-gen");
    await manager.processQueue();
    expect(manager.hasQueuedGenerations()).toBe(false);
  });

  it("resets state", () => {
    manager.enqueue(defaultOptions);
    manager.reset();
    expect(manager.getStatus()).toBe("idle");
    expect(manager.hasQueuedGenerations()).toBe(false);
    expect(manager.getActiveGenerator()).toBeNull();
  });

  it("retries a generation", async () => {
    const gen = createMockGenerator("arduino-gen", ["arduino-cpp"], ["arduino"]);
    registry.register(gen);
    const result = await manager.retry(defaultOptions);
    expect(result.status).toBe("success");
  });

  it("generates with a specific generator", async () => {
    const gen1 = createMockGenerator("gen-a", ["arduino-cpp"], ["arduino"]);
    const gen2 = createMockGenerator("gen-b", ["arduino-cpp"], ["arduino"]);
    registry.registerMany([gen1, gen2]);
    const result = await manager.generateWithGenerator("gen-b", defaultOptions);
    expect(result.status).toBe("success");
  });

  it("reports current progress", () => {
    const progress = manager.getCurrentProgress();
    expect(progress.stage).toBe("queued");
    expect(progress.percent).toBe(0);
  });

  it("handles processQueue with failing generation", async () => {
    const gen = createMockGenerator("arduino-gen", ["arduino-cpp"], ["arduino"], false, true);
    registry.register(gen);
    manager.enqueue(defaultOptions);
    await expect(manager.processQueue()).resolves.toBeUndefined();
    expect(manager.hasQueuedGenerations()).toBe(false);
  });

  it("cancel when idle does nothing", async () => {
    const cancelled = vi.fn();
    EventBus.on(CODEGEN_EVENTS.GENERATION_CANCELLED, cancelled);
    await manager.cancel();
    expect(cancelled).not.toHaveBeenCalled();
    expect(manager.getStatus()).toBe("idle");
  });

  it("handles non-Error throw during generation", async () => {
    const gen: CodeGenerator = {
      id: "throw-string",
      name: "Throw String",
      version: "1.0.0",
      supportedLanguages: ["arduino-cpp"],
      supportedFrameworks: ["arduino"],
      supports() { return true; },
      async prepare() {},
      async generate() { throw "string error"; },
      async validate() { return { valid: true, issues: [] }; },
      async cleanup() {},
    };
    registry.register(gen);
    const failed = vi.fn();
    EventBus.on(CODEGEN_EVENTS.GENERATION_FAILED, failed);
    await expect(manager.generate(defaultOptions)).rejects.toBe("string error");
    expect(failed).toHaveBeenCalledOnce();
  });

  it("validateOnly returns validation result", async () => {
    const gen = createMockGenerator("arduino-gen", ["arduino-cpp"], ["arduino"]);
    registry.register(gen);
    const result = await manager.validateOnly(defaultOptions);
    expect(result.valid).toBe(true);
  });

  it("validateOnly returns invalid when no generator", async () => {
    const result = await manager.validateOnly(defaultOptions);
    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe("NO_GENERATOR");
  });

  it("fails on validation error", async () => {
    const gen = createMockGenerator("arduino-gen", ["arduino-cpp"], ["arduino"], true);
    registry.register(gen);
    await expect(manager.generate(defaultOptions)).rejects.toThrow("Validation failed");
  });

  it("cancel when preparing sets cancelled stage", async () => {
    const delayedGen: CodeGenerator = {
      id: "delayed-gen",
      name: "Delayed",
      version: "1.0.0",
      supportedLanguages: ["arduino-cpp"],
      supportedFrameworks: ["arduino"],
      supports() { return true; },
      async prepare() { await new Promise((r) => setTimeout(r, 100)); },
      async generate() { return { status: "success", stage: "done", message: "ok", duration: 0, timestamp: Date.now() }; },
      async validate() { return { valid: true, issues: [] }; },
      async cleanup() {},
    };
    registry.register(delayedGen);
    manager.generate(defaultOptions);
    await new Promise((r) => setTimeout(r, 10));
    await manager.cancel();
    expect(manager.getStatus()).toBe("done");
  });

  it("cancel emits CANCELLED event", async () => {
    const delayedGen: CodeGenerator = {
      id: "delayed-gen-2",
      name: "Delayed 2",
      version: "1.0.0",
      supportedLanguages: ["arduino-cpp"],
      supportedFrameworks: ["arduino"],
      supports() { return true; },
      async prepare() { await new Promise((r) => setTimeout(r, 100)); },
      async generate() { return { status: "success", stage: "done", message: "ok", duration: 0, timestamp: Date.now() }; },
      async validate() { return { valid: true, issues: [] }; },
      async cleanup() {},
    };
    registry.register(delayedGen);
    const cancelled = vi.fn();
    EventBus.on(CODEGEN_EVENTS.GENERATION_CANCELLED, cancelled);
    manager.generate(defaultOptions);
    await new Promise((r) => setTimeout(r, 10));
    await manager.cancel();
    expect(cancelled).toHaveBeenCalledOnce();
  });

  it("getCurrentProgress returns copy of messages and errors", () => {
    const progress = manager.getCurrentProgress();
    progress.messages.push("mutated");
    progress.errors.push("mutated-error");
    const progress2 = manager.getCurrentProgress();
    expect(progress2.messages).not.toContain("mutated");
    expect(progress2.errors).not.toContain("mutated-error");
  });

  it("handles processQueue with failing validate", async () => {
    const gen = createMockGenerator("arduino-gen", ["arduino-cpp"], ["arduino"], true);
    registry.register(gen);
    manager.enqueue(defaultOptions);
    await manager.processQueue();
    expect(manager.hasQueuedGenerations()).toBe(false);
  });
});
