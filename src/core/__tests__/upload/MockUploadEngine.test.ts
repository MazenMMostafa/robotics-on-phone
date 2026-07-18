import { describe, it, expect } from "vitest";
import type { UploadEngine, UploadOptions } from "../../services/upload/UploadEngine";
import type { UploadProgress } from "../../types/upload";
import type { UploadResult } from "../../types/upload/result";

function createMockEngine(id: string, supportedBoards: string[]): UploadEngine {
  return {
    id,
    name: `Mock ${id}`,
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

describe("MockUploadEngine", () => {
  it("implements UploadEngine interface", () => {
    const engine = createMockEngine("mock-1", ["uno", "nano"]);
    expect(engine.id).toBe("mock-1");
    expect(engine.name).toBe("Mock mock-1");
    expect(engine.version).toBe("1.0.0");
  });

  it("supports declared boards", () => {
    const engine = createMockEngine("mock-1", ["uno", "nano"]);
    expect(engine.supports("uno")).toBe(true);
    expect(engine.supports("nano")).toBe(true);
    expect(engine.supports("esp32")).toBe(false);
  });

  it("returns a successful result from upload", async () => {
    const engine = createMockEngine("mock-1", ["uno"]);
    const options: UploadOptions = {
      boardId: "uno",
      portId: "COM3",
      artifactPath: "/tmp/sketch.hex",
    };
    const result = await engine.upload(options);
    expect(result.status).toBe("success");
    expect(typeof result.duration).toBe("number");
    expect(typeof result.timestamp).toBe("number");
  });

  it("prepare, verify, cancel, cleanup resolve without error", async () => {
    const engine = createMockEngine("mock-1", ["uno"]);
    const options: UploadOptions = {
      boardId: "uno",
      portId: "COM3",
      artifactPath: "/tmp/sketch.hex",
    };
    await expect(engine.prepare(options)).resolves.toBeUndefined();
    await expect(engine.verify(options)).resolves.toBe(true);
    await expect(engine.cancel()).resolves.toBeUndefined();
    await expect(engine.cleanup(options)).resolves.toBeUndefined();
  });

  it("accepts optional onProgress callback", async () => {
    const engine = createMockEngine("mock-1", ["uno"]);
    const options: UploadOptions = {
      boardId: "uno",
      portId: "COM3",
      artifactPath: "/tmp/sketch.hex",
    };
    let called = false;
    await engine.upload(options, (_p) => {
      called = true;
    });
    expect(called).toBe(false); // mock doesn't call it
  });
});
