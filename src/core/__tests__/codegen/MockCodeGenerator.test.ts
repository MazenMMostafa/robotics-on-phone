import { describe, it, expect, beforeEach, vi } from "vitest";
import { MockCodeGenerator } from "../../services/codegen/MockCodeGenerator";
import type { GenerationOptions, GenerationProgress } from "../../types/codegen/generator";

describe("MockCodeGenerator", () => {
  let generator: MockCodeGenerator;
  const defaultOptions: GenerationOptions = {
    language: "arduino-cpp",
    framework: "arduino",
    board: "uno",
  };

  beforeEach(() => {
    generator = new MockCodeGenerator();
  });

  it("has correct identity", () => {
    expect(generator.id).toBe("mock-generator-v1");
    expect(generator.name).toBe("Mock Code Generator");
    expect(generator.version).toBe("1.0.0");
  });

  it("supports default languages", () => {
    expect(generator.supportedLanguages).toEqual(["arduino-cpp", "micropython"]);
  });

  it("supports matching language and framework", () => {
    expect(generator.supports("arduino-cpp", "arduino")).toBe(true);
    expect(generator.supports("micropython", "micropython")).toBe(true);
  });

  it("does not support unknown language", () => {
    expect(generator.supports("python", "arduino")).toBe(false);
  });

  it("supports custom languages and frameworks", () => {
    const custom = new MockCodeGenerator(["python"], ["custom-fw"], "custom-gen");
    expect(custom.supports("python", "custom-fw")).toBe(true);
    expect(custom.supports("arduino-cpp", "arduino")).toBe(false);
  });

  it("prepare resolves successfully", async () => {
    await expect(generator.prepare(defaultOptions)).resolves.toBeUndefined();
  });

  it("prepare rejects on simulated failure", async () => {
    generator.setSimulateFailure(true);
    await expect(generator.prepare(defaultOptions)).rejects.toThrow("Simulated prepare failure");
  });

  it("generate returns success result with artifact", async () => {
    const result = await generator.generate(defaultOptions);
    expect(result.status).toBe("success");
    expect(result.artifact).toBeDefined();
    expect(result.artifact!.language).toBe("arduino-cpp");
    expect(result.artifact!.checksum).toBe("mock-source-checksum-12345");
  });

  it("generate returns failure when simulateFailure is true", async () => {
    generator.setSimulateFailure(true);
    const result = await generator.generate(defaultOptions);
    expect(result.status).toBe("failure");
    expect(result.message).toBe("Simulated generation failure");
  });

  it("generate calls onProgress callback", async () => {
    const onProgress = vi.fn();
    await generator.generate(defaultOptions, onProgress);
    expect(onProgress).toHaveBeenCalled();
    const stages = onProgress.mock.calls.map((c: GenerationProgress[]) => c[0].stage);
    expect(stages).toContain("generating");
    expect(stages).toContain("optimizing");
    expect(stages).toContain("finishing");
  });

  it("generate returns cancelled when cancelled flag set", async () => {
    (generator as unknown as { cancelled: boolean }).cancelled = true;
    const result = await generator.generate(defaultOptions);
    expect(result.status).toBe("cancelled");
  });

  it("validate returns valid for supported language", async () => {
    const result = await generator.validate(defaultOptions);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("validate returns invalid when simulateFailure is true", async () => {
    generator.setSimulateFailure(true);
    const result = await generator.validate(defaultOptions);
    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(1);
  });

  it("validate returns invalid for missing language", async () => {
    const result = await generator.validate({ language: "", framework: "", board: "" });
    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe("NO_LANGUAGE");
  });

  it("validate returns invalid for unsupported language", async () => {
    const result = await generator.validate({ language: "python", framework: "arduino", board: "uno" });
    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe("UNSUPPORTED_LANG");
  });

  it("cleanup resolves silently", async () => {
    await expect(generator.cleanup(defaultOptions)).resolves.toBeUndefined();
  });

  it("respects simulateDelay", async () => {
    generator.setSimulateDelay(50);
    const start = Date.now();
    await generator.generate(defaultOptions);
    expect(Date.now() - start).toBeGreaterThanOrEqual(45);
  });
});
