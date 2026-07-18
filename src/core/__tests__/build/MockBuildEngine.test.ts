import { describe, it, expect, beforeEach, vi } from "vitest";
import { MockBuildEngine } from "../../services/build/MockBuildEngine";
import type { BuildOptions, BuildProgress } from "../../types/build/engine";

describe("MockBuildEngine", () => {
  let engine: MockBuildEngine;
  const defaultOptions: BuildOptions = {
    boardId: "mock-board",
    framework: "arduino",
  };

  beforeEach(() => {
    engine = new MockBuildEngine();
  });

  it("has correct identity", () => {
    expect(engine.id).toBe("mock-build-v1");
    expect(engine.name).toBe("Mock Build Engine");
    expect(engine.version).toBe("1.0.0");
  });

  it("supports default mock board", () => {
    expect(engine.supports("mock-board", "arduino")).toBe(true);
  });

  it("does not support unknown board", () => {
    expect(engine.supports("unknown-board", "arduino")).toBe(false);
  });

  it("supports configured boards", () => {
    const custom = new MockBuildEngine(["uno", "nano"], ["arduino"], "custom-mock");
    expect(custom.supports("uno", "arduino")).toBe(true);
    expect(custom.supports("nano", "arduino")).toBe(true);
    expect(custom.supports("esp32", "arduino")).toBe(false);
  });

  it("prepare resolves successfully", async () => {
    await expect(engine.prepare(defaultOptions)).resolves.toBeUndefined();
  });

  it("prepare rejects on simulated failure", async () => {
    engine.setSimulateFailure(true);
    await expect(engine.prepare(defaultOptions)).rejects.toThrow("Simulated prepare failure");
  });

  it("build returns success result", async () => {
    const result = await engine.build(defaultOptions);
    expect(result.status).toBe("success");
    expect(result.artifact).toBeDefined();
    expect(result.artifact!.boardId).toBe("mock-board");
    expect(result.artifact!.checksum).toBe("mock-checksum-12345");
  });

  it("build returns failure when simulateFailure is true", async () => {
    engine.setSimulateFailure(true);
    const result = await engine.build(defaultOptions);
    expect(result.status).toBe("failure");
    expect(result.message).toBe("Simulated build failure");
  });

  it("build calls onProgress callback", async () => {
    const onProgress = vi.fn();
    await engine.build(defaultOptions, onProgress);
    expect(onProgress).toHaveBeenCalled();
    const stages = onProgress.mock.calls.map((c: BuildProgress[]) => c[0].stage);
    expect(stages).toContain("compiling");
    expect(stages).toContain("linking");
    expect(stages).toContain("finishing");
  });

  it("build respects simulateDelay", async () => {
    engine.setSimulateDelay(50);
    const start = Date.now();
    await engine.build(defaultOptions);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45);
  });

  it("build returns cancelled when cancelled flag set", async () => {
    engine["cancelled"] = true;
    const result = await engine.build(defaultOptions);
    expect(result.status).toBe("cancelled");
  });

  it("verify returns true for valid artifact", async () => {
    const artifact = (await engine.build(defaultOptions)).artifact!;
    const verified = await engine.verify(artifact);
    expect(verified).toBe(true);
  });

  it("verify returns false when simulateFailure is true", async () => {
    engine.setSimulateFailure(true);
    const artifact = (await engine.build(defaultOptions)).artifact!;
    const verified = await engine.verify(artifact);
    expect(verified).toBe(false);
  });

  it("verify returns false for invalid artifact", async () => {
    const artifact = (await engine.build(defaultOptions)).artifact!;
    (artifact as { checksum: string }).checksum = "wrong-checksum";
    const verified = await engine.verify(artifact);
    expect(verified).toBe(false);
  });

  it("cleanup resolves silently", async () => {
    await expect(engine.cleanup(defaultOptions)).resolves.toBeUndefined();
  });

  it("supports default frameworks", () => {
    expect(engine.supportedFrameworks).toEqual(["arduino", "esp-idf"]);
  });

  it("supports custom frameworks", () => {
    const custom = new MockBuildEngine(["board"], ["custom-fw"], "custom", "Custom");
    expect(custom.supportedFrameworks).toEqual(["custom-fw"]);
  });
});
