import { describe, it, expect, beforeEach } from "vitest";
import { UploadEngineRegistry } from "../../services/upload/UploadEngineRegistry";
import type { UploadEngine, UploadOptions } from "../../services/upload/UploadEngine";
import type { UploadProgress } from "../../types/upload";
import type { UploadResult } from "../../types/upload/result";

function createMockEngine(id: string, name: string, supportedBoards: string[]): UploadEngine {
  return {
    id,
    name,
    version: "1.0.0",
    supports(boardId: string) {
      return supportedBoards.includes(boardId);
    },
    async prepare(_options: UploadOptions) {},
    async upload(
      _options: UploadOptions,
      _onProgress?: (progress: UploadProgress) => void,
    ): Promise<UploadResult> {
      return { status: "success", stage: "done", message: "ok", duration: 100, timestamp: Date.now() };
    },
    async verify(_options: UploadOptions): Promise<boolean> {
      return true;
    },
    async cancel() {},
    async cleanup(_options: UploadOptions) {},
  };
}

describe("UploadEngineRegistry", () => {
  let registry: UploadEngineRegistry;

  beforeEach(() => {
    registry = new UploadEngineRegistry();
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
    const e1 = createMockEngine("avr", "AVR Uploader", ["uno", "nano", "mega"]);
    const e2 = createMockEngine("esp", "ESP Uploader", ["esp32"]);
    registry.registerMany([e1, e2]);

    const found = registry.findForBoard("uno");
    expect(found).toBe(e1);
  });

  it("returns undefined if no engine supports board", () => {
    const engine = createMockEngine("avr", "AVR", ["uno"]);
    registry.register(engine);
    expect(registry.findForBoard("unknown-board")).toBeUndefined();
  });

  it("returns all engines for a board", () => {
    const e1 = createMockEngine("avr", "AVR", ["uno"]);
    const e2 = createMockEngine("cli", "CLI", ["uno", "nano"]);
    registry.registerMany([e1, e2]);
    const all = registry.findAllForBoard("uno");
    expect(all).toHaveLength(2);
  });

  it("prioritizes by engine id pattern", () => {
    const low = createMockEngine("custom-uploader", "Custom", ["uno"]);
    const high = createMockEngine("arduino-avr-v1", "AVR", ["uno"]);
    registry.registerMany([low, high]);
    const found = registry.findForBoard("uno");
    expect(found?.id).toBe("arduino-avr-v1");
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
    const e1 = createMockEngine("rp2040-v1", "RP2040", ["pico"]);
    const e2 = createMockEngine("arduino-avr-v1", "AVR", ["pico"]);
    registry.registerMany([e1, e2]);
    const all = registry.findAllForBoard("pico");
    expect(all[0]?.id).toBe("arduino-avr-v1");
    expect(all[1]?.id).toBe("rp2040-v1");
  });

  it("covers all priority levels", () => {
    const e1 = createMockEngine("arduino-cli-v2", "CLI", ["board"]);
    const e2 = createMockEngine("esp32-v3", "ESP32", ["board"]);
    const e3 = createMockEngine("esp8266-v1", "ESP8266", ["board"]);
    const e4 = createMockEngine("stm32-v1", "STM32", ["board"]);
    const e5 = createMockEngine("unknown-v1", "Unknown", ["board"]);
    registry.registerMany([e1, e2, e3, e4, e5]);
    const all = registry.findAllForBoard("board");
    expect(all[0]?.id).toBe("arduino-cli-v2");
    expect(all[1]?.id).toBe("esp32-v3");
    expect(all[2]?.id).toBe("esp8266-v1");
    expect(all[3]?.id).toBe("stm32-v1");
    expect(all[4]?.id).toBe("unknown-v1");
  });
});
