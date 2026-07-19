import { describe, it, expect, beforeEach } from "vitest";
import { ArduinoCppGenerator } from "../../services/codegen/arduino/ArduinoCppGenerator";
import { CodeGeneratorRegistry, CodeGenerationManager } from "../../services/codegen";
import { BuildEngineRegistry, BuildManager, MockBuildEngine } from "../../services/build";
import { UploadEngineRegistry, UploadManager } from "../../services/upload";
import { PipelineService } from "../../services/pipeline/PipelineService";
import { MockBackend } from "../../services/upload/backends/MockBackend";
import type { UploadEngine, UploadOptions } from "../../services/upload/UploadEngine";
import type { UploadProgress } from "../../types/upload/progress";
import type { UploadResult } from "../../types/upload/result";
import type { LoggerService } from "../../services/logging/LoggerService";
import {
  GenerationFailedError,
  BuildFailedError,
  UploadFailedError,
  isPipelineError,
} from "../../types/pipeline";
import "../../services/codegen/arduino/BlockGenerators";

const SILENT_LOGGER: LoggerService = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  nbLog: () => {},
  setLevel: () => {},
  getLevel: () => "error",
} as unknown as LoggerService;

class MockUploadEngine implements UploadEngine {
  readonly id = "mock-upload-v1";
  readonly name = "Mock Upload Engine";
  readonly version = "1.0.0";
  private backend: MockBackend;

  constructor(backend: MockBackend) {
    this.backend = backend;
  }

  supports(boardId: string): boolean {
    return ["uno", "nano", "mega"].includes(boardId);
  }
  async prepare(_options: UploadOptions): Promise<void> {}
  async upload(options: UploadOptions, onProgress?: (p: UploadProgress) => Promise<UploadResult> | void): Promise<UploadResult> {
    if (typeof onProgress === "function") {
      const r = onProgress({
        stage: "uploading",
        percent: 50,
        estimatedRemaining: 0,
        speed: 0,
        messages: ["Mock uploading"],
        errors: [],
        timestamp: Date.now(),
      });
      if (r instanceof Promise) await r;
    }
    return this.backend.execute(options);
  }
  async verify(_options: UploadOptions): Promise<boolean> {
    return this.backend.verify(_options);
  }
  async cancel(): Promise<void> {
    await this.backend.cancel();
  }
  async cleanup(_options: UploadOptions): Promise<void> {}
}

function blinkBlocks(): Record<string, unknown>[] {
  return [
    { type: "controls_start", id: "s1", next: { type: "pin_mode", id: "b1", fields: { PIN: "13", MODE: "OUTPUT" } } },
    {
      type: "controls_forever", id: "f1",
      next: {
        type: "pin_write", id: "b2", fields: { PIN: "13", STATE: "HIGH" },
        next: {
          type: "delay", id: "b3", fields: { MS: "1000" },
          next: {
            type: "pin_write", id: "b4", fields: { PIN: "13", STATE: "LOW" },
            next: { type: "delay", id: "b5", fields: { MS: "1000" } },
          },
        },
      },
    },
  ];
}

function makePipeline(opts: { buildFail?: boolean; uploadFail?: boolean; genFail?: boolean } = {}) {
  const codeGenRegistry = new CodeGeneratorRegistry();
  const arduinoCppGenerator = new ArduinoCppGenerator();
  if (opts.genFail) {
    // Force generation failure by feeding an empty/invalid workspace that yields a failed validation.
    (arduinoCppGenerator as unknown as { validator: { validate: () => Promise<{ valid: boolean; issues: { message: string }[] }> } }).validator = {
      validate: async () => ({ valid: false, issues: [{ message: "Forced generation failure" }] }),
    };
  }
  codeGenRegistry.register(arduinoCppGenerator);
  const codeGenManager = new CodeGenerationManager(codeGenRegistry, SILENT_LOGGER);

  const buildEngineRegistry = new BuildEngineRegistry();
  const mockBuild = new MockBuildEngine(["uno", "nano", "mega"], ["arduino"]);
  if (opts.buildFail) mockBuild.setSimulateFailure(true);
  buildEngineRegistry.register(mockBuild);
  const buildManager = new BuildManager(buildEngineRegistry, SILENT_LOGGER);

  const uploadEngineRegistry = new UploadEngineRegistry();
  const backend = new MockBackend(["uno", "nano", "mega"]);
  if (opts.uploadFail) backend.setSimulateFailure(true);
  uploadEngineRegistry.register(new MockUploadEngine(backend));
  const uploadManager = new UploadManager(uploadEngineRegistry, SILENT_LOGGER);

  const pipeline = new PipelineService(codeGenManager, buildManager, uploadManager, SILENT_LOGGER);
  return { pipeline, codeGenManager, buildManager, uploadManager };
}

describe("PipelineService end-to-end (mock upload engine)", () => {
  beforeEach(() => {
    // ensure fresh registries each test
  });

  it("runs generate -> build -> upload and returns success with durations", async () => {
    const { pipeline } = makePipeline();
    const result = await pipeline.run({
      boardId: "uno",
      framework: "arduino",
      language: "arduino-cpp",
      blocks: blinkBlocks(),
      portId: "MOCK_PORT",
      additionalArgs: {},
    });

    expect(result.status).toBe("success");
    expect(result.stage).toBe("completed");
    expect(result.buildArtifactChecksum).toBe("mock-checksum-12345");
    expect(result.sourceArtifactChecksum).toBeDefined();
    expect(result.generationDuration).toBeGreaterThanOrEqual(0);
    expect(result.buildDuration).toBeGreaterThanOrEqual(0);
    expect(result.uploadDuration).toBeGreaterThanOrEqual(0);
    expect(result.duration).toBeGreaterThanOrEqual(result.generationDuration + result.buildDuration + result.uploadDuration - 5);
  });

  it("reports stage transitions via progress handler", async () => {
    const { pipeline } = makePipeline();
    const stages: string[] = [];
    await pipeline.run(
      {
        boardId: "nano",
        framework: "arduino",
        language: "arduino-cpp",
        blocks: blinkBlocks(),
        portId: "MOCK_PORT",
        additionalArgs: {},
      },
      (p) => { stages.push(p.stage); },
    );
    expect(stages).toContain("generating");
    expect(stages).toContain("building");
    expect(stages).toContain("uploading");
    expect(stages).toContain("verifying");
    expect(stages[stages.length - 1]).toBe("completed");
  });

  it("maps generation failure to GenerationFailedError", async () => {
    const { pipeline } = makePipeline({ genFail: true });
    let thrown: unknown;
    try {
      await pipeline.run({
        boardId: "uno",
        framework: "arduino",
        language: "arduino-cpp",
        blocks: blinkBlocks(),
        portId: "MOCK_PORT",
        additionalArgs: {},
      });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(GenerationFailedError);
    expect(isPipelineError(thrown)).toBe(true);
    if (isPipelineError(thrown)) expect(thrown.code).toBe("GENERATION_FAILED");
  });

  it("maps build failure to BuildFailedError", async () => {
    const { pipeline } = makePipeline({ buildFail: true });
    let thrown: unknown;
    try {
      await pipeline.run({
        boardId: "uno",
        framework: "arduino",
        language: "arduino-cpp",
        blocks: blinkBlocks(),
        portId: "MOCK_PORT",
        additionalArgs: {},
      });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(BuildFailedError);
    expect(isPipelineError(thrown)).toBe(true);
  });

  it("maps upload failure to UploadFailedError", async () => {
    const { pipeline } = makePipeline({ uploadFail: true });
    let thrown: unknown;
    try {
      await pipeline.run({
        boardId: "uno",
        framework: "arduino",
        language: "arduino-cpp",
        blocks: blinkBlocks(),
        portId: "MOCK_PORT",
        additionalArgs: {},
      });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(UploadFailedError);
    expect(isPipelineError(thrown)).toBe(true);
  });

  it("supports retry after a transient upload failure", async () => {
    const { pipeline } = makePipeline({ uploadFail: true });
    await expect(
      pipeline.run({
        boardId: "uno",
        framework: "arduino",
        language: "arduino-cpp",
        blocks: blinkBlocks(),
        portId: "MOCK_PORT",
        additionalArgs: {},
      }),
    ).rejects.toBeInstanceOf(UploadFailedError);

    // Recreate pipeline with healthy upload for retry.
    const healthy = makePipeline();
    const result = await healthy.pipeline.retry({
      boardId: "uno",
      framework: "arduino",
      language: "arduino-cpp",
      blocks: blinkBlocks(),
      portId: "MOCK_PORT",
      additionalArgs: {},
    });
    expect(result.status).toBe("success");
  });
});
