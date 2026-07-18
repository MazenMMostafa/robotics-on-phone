import { describe, it, expect, beforeEach, vi } from "vitest";
import { ToolchainManager } from "../../services/upload/ToolchainManager";
import { MockBackend } from "../../services/upload/backends/MockBackend";

describe("ToolchainManager", () => {
  let manager: ToolchainManager;
  let backend: MockBackend;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ToolchainManager();
    backend = new MockBackend();
  });

  it("detects a backend toolchain", async () => {
    const info = await manager.detect(backend);
    expect(info.status).toBe("installed");
    expect(info.id).toBe("mock-v1");
  });

  it("returns cached result within TTL", async () => {
    const spy = vi.spyOn(backend, "detect");
    await manager.detect(backend);
    await manager.detect(backend);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("refreshes after TTL expires", async () => {
    manager.setTtl(0);
    const spy = vi.spyOn(backend, "detect");
    await manager.detect(backend);
    await manager.detect(backend);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("detects all backends", async () => {
    const b2 = new MockBackend(["other"], "other-v1", "Other Backend");
    const results = await manager.detectAll([backend, b2]);
    expect(results.size).toBe(2);
    expect(results.get("mock-v1")?.status).toBe("installed");
    expect(results.get("other-v1")?.status).toBe("installed");
  });

  it("returns cached info", () => {
    expect(manager.getCached("mock-v1")).toBeUndefined();
  });

  it("checks availability", () => {
    expect(manager.isAvailable({ id: "test", name: "Test", version: "1", status: "installed", supportedBoards: [] })).toBe(true);
    expect(manager.isAvailable({ id: "test", name: "Test", version: "1", status: "outdated", supportedBoards: [] })).toBe(true);
    expect(manager.isAvailable({ id: "test", name: "Test", version: "1", status: "missing", supportedBoards: [] })).toBe(false);
    expect(manager.isAvailable({ id: "test", name: "Test", version: "1", status: "broken", supportedBoards: [] })).toBe(false);
  });

  it("invalidates cache for specific id", async () => {
    await manager.detect(backend);
    expect(manager.getCached("mock-v1")).toBeDefined();
    manager.invalidate("mock-v1");
    expect(manager.getCached("mock-v1")).toBeUndefined();
  });

  it("clears entire cache", async () => {
    await manager.detect(backend);
    manager.clearCache();
    expect(manager.getCached("mock-v1")).toBeUndefined();
  });
});
