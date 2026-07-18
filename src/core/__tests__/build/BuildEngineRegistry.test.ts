import { describe, it, expect, beforeEach } from "vitest";
import { BuildEngineRegistry } from "../../services/build/BuildEngineRegistry";
import type { BuildEngine, BuildOptions, BuildProgress, BuildResult } from "../../types/build/engine";
import type { BuildArtifact } from "../../types/build/artifact";

function createMockEngine(id: string, name: string, supportedBoards: string[], supportedFrameworks?: string[]): BuildEngine {
  return {
    id,
    name,
    version: "1.0.0",
    supportedFrameworks: supportedFrameworks ?? ["arduino"],
    supports(boardId: string, _framework: string) {
      return supportedBoards.includes(boardId);
    },
    async prepare(_options: BuildOptions) {},
    async build(_options: BuildOptions, _onProgress?: (progress: BuildProgress) => void): Promise<BuildResult> {
      return { status: "success", stage: "done", message: "ok", duration: 100, timestamp: Date.now() };
    },
    async verify(_artifact: BuildArtifact): Promise<boolean> {
      return true;
    },
    async cleanup(_options: BuildOptions) {},
  };
}

describe("BuildEngineRegistry", () => {
  let registry: BuildEngineRegistry;

  beforeEach(() => {
    registry = new BuildEngineRegistry();
  });

  it("starts empty", () => {
    expect(registry.count()).toBe(0);
    expect(registry.getAll()).toEqual([]);
  });

  it("registers a single engine", () => {
    const engine = createMockEngine("test-1", "Test Engine", ["uno"]);
    registry.register(engine);
    expect(registry.count()).toBe(1);
    expect(registry.getById("test-1")).toBe(engine);
  });

  it("registers multiple engines", () => {
    const e1 = createMockEngine("e1", "Engine 1", ["uno"]);
    const e2 = createMockEngine("e2", "Engine 2", ["esp32"]);
    registry.registerMany([e1, e2]);
    expect(registry.count()).toBe(2);
  });

  it("overwrites engine with same id", () => {
    const e1 = createMockEngine("same-id", "Original", ["uno"]);
    const e2 = createMockEngine("same-id", "Updated", ["uno"]);
    registry.register(e1);
    registry.register(e2);
    expect(registry.count()).toBe(1);
    expect(registry.getById("same-id")?.name).toBe("Updated");
  });

  it("finds engine for supported board", () => {
    const e1 = createMockEngine("avr-build", "AVR Build", ["uno", "nano"]);
    const e2 = createMockEngine("esp-build", "ESP Build", ["esp32"]);
    registry.registerMany([e1, e2]);
    const found = registry.findForBoard("uno");
    expect(found).toBe(e1);
  });

  it("finds engine for board and framework", () => {
    const e1 = createMockEngine("avr-build", "AVR Build", ["uno"], ["arduino"]);
    const e2 = createMockEngine("esp-build", "ESP Build", ["esp32"], ["esp-idf"]);
    registry.registerMany([e1, e2]);
    const found = registry.findForBoardAndFramework("uno", "arduino");
    expect(found).toBe(e1);
  });

  it("returns undefined if no engine supports board", () => {
    const engine = createMockEngine("avr-build", "AVR", ["uno"]);
    registry.register(engine);
    expect(registry.findForBoard("unknown-board")).toBeUndefined();
  });

  it("returns undefined if no engine supports framework", () => {
    const engine = createMockEngine("avr-build", "AVR", ["uno"], ["arduino"]);
    registry.register(engine);
    expect(registry.findForBoardAndFramework("uno", "esp-idf")).toBeUndefined();
  });

  it("returns all engines for a board", () => {
    const e1 = createMockEngine("avr-build", "AVR", ["uno"]);
    const e2 = createMockEngine("cli-build", "CLI", ["uno", "nano"]);
    registry.registerMany([e1, e2]);
    const all = registry.findAllForBoard("uno");
    expect(all).toHaveLength(2);
  });

  it("prioritizes by engine id pattern", () => {
    const low = createMockEngine("custom-build-v1", "Custom", ["uno"]);
    const high = createMockEngine("arduino-cli-v2", "Arduino CLI", ["uno"]);
    registry.registerMany([low, high]);
    const found = registry.findForBoard("uno");
    expect(found?.id).toBe("arduino-cli-v2");
  });

  it("removes an engine", () => {
    const engine = createMockEngine("test", "Test", ["uno"]);
    registry.register(engine);
    registry.remove("test");
    expect(registry.count()).toBe(0);
    expect(registry.getById("test")).toBeUndefined();
  });

  it("clears all engines", () => {
    registry.registerMany([
      createMockEngine("a", "A", ["uno"]),
      createMockEngine("b", "B", ["nano"]),
    ]);
    registry.clear();
    expect(registry.count()).toBe(0);
  });

  it("gets engine by id", () => {
    const engine = createMockEngine("find-me", "Findable", ["uno"]);
    registry.register(engine);
    expect(registry.getById("find-me")?.name).toBe("Findable");
  });

  it("returns sorted engines for board priority", () => {
    const e1 = createMockEngine("platformio-v1", "PlatformIO", ["pico"]);
    const e2 = createMockEngine("arduino-cli-v1", "CLI", ["pico"]);
    registry.registerMany([e1, e2]);
    const all = registry.findAllForBoard("pico");
    expect(all[0]?.id).toBe("arduino-cli-v1");
    expect(all[1]?.id).toBe("platformio-v1");
  });

  it("covers all priority levels", () => {
    const e1 = createMockEngine("arduino-cli-v2", "CLI", ["board"]);
    const e2 = createMockEngine("platformio-v3", "PIO", ["board"]);
    const e3 = createMockEngine("esp-idf-v1", "ESP-IDF", ["board"]);
    const e4 = createMockEngine("cloud-build", "Cloud", ["board"]);
    const e5 = createMockEngine("custom-build", "Custom", ["board"]);
    const e6 = createMockEngine("unknown-v1", "Unknown", ["board"]);
    registry.registerMany([e1, e2, e3, e4, e5, e6]);
    const all = registry.findAllForBoard("board");
    expect(all[0]?.id).toBe("arduino-cli-v2");
    expect(all[1]?.id).toBe("platformio-v3");
    expect(all[2]?.id).toBe("esp-idf-v1");
    expect(all[3]?.id).toBe("cloud-build");
    expect(all[4]?.id).toBe("custom-build");
    expect(all[5]?.id).toBe("unknown-v1");
  });
});
