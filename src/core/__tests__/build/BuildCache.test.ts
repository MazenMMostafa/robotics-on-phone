import { describe, it, expect, beforeEach } from "vitest";
import { BuildCache } from "../../services/build/BuildCache";
import { createBuildArtifact } from "../../types/build/artifact";

function makeArtifact(boardId: string, framework = "arduino", checksum = "abc123") {
  return createBuildArtifact({
    boardId,
    framework,
    firmwarePath: `/tmp/${boardId}/firmware.hex`,
    size: 1024,
    checksum,
  });
}

describe("BuildCache", () => {
  let cache: BuildCache;

  beforeEach(() => {
    cache = new BuildCache(3);
  });

  it("starts empty", () => {
    expect(cache.size()).toBe(0);
    expect(cache.entries()).toEqual([]);
  });

  it("stores and retrieves an artifact", () => {
    const artifact = makeArtifact("uno");
    cache.set(artifact);
    expect(cache.has("uno", "arduino")).toBe(true);
    const retrieved = cache.get("uno", "arduino");
    expect(retrieved).toBeDefined();
    expect(retrieved!.boardId).toBe("uno");
    expect(retrieved!.checksum).toBe("abc123");
  });

  it("returns a copy of the artifact", () => {
    const artifact = makeArtifact("uno");
    cache.set(artifact);
    const retrieved = cache.get("uno", "arduino")!;
    (retrieved as { firmwarePath: string }).firmwarePath = "/modified/path";
    const retrieved2 = cache.get("uno", "arduino")!;
    expect(retrieved2.firmwarePath).toBe("/tmp/uno/firmware.hex");
  });

  it("returns undefined for missing key", () => {
    expect(cache.get("nonexistent", "arduino")).toBeUndefined();
  });

  it("has returns false for missing key", () => {
    expect(cache.has("nonexistent", "arduino")).toBe(false);
  });

  it("removes an artifact", () => {
    const artifact = makeArtifact("uno");
    cache.set(artifact);
    expect(cache.remove("uno", "arduino")).toBe(true);
    expect(cache.has("uno", "arduino")).toBe(false);
  });

  it("remove returns false for missing key", () => {
    expect(cache.remove("nonexistent", "arduino")).toBe(false);
  });

  it("clears all artifacts", () => {
    cache.set(makeArtifact("uno"));
    cache.set(makeArtifact("nano"));
    expect(cache.size()).toBe(2);
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it("evicts LRU when exceeding max size", () => {
    for (let i = 0; i < 10; i++) {
      cache.set(makeArtifact(`board${i}`, "arduino", `chk${i}`));
    }
    expect(cache.size()).toBe(3);
    expect(cache.has("board0", "arduino")).toBe(false);
    expect(cache.has("board7", "arduino")).toBe(true);
  });

  it("handles multiple frameworks for same board", () => {
    const arduino = makeArtifact("uno", "arduino", "ard-checksum");
    const espIdf = makeArtifact("uno", "esp-idf", "esp-checksum");
    cache.set(arduino);
    cache.set(espIdf);
    expect(cache.size()).toBe(2);
    expect(cache.get("uno", "arduino")!.checksum).toBe("ard-checksum");
    expect(cache.get("uno", "esp-idf")!.checksum).toBe("esp-checksum");
  });

  it("defaults to maxSize 50", () => {
    const defaultCache = new BuildCache();
    expect(defaultCache["maxSize"]).toBe(50);
  });

  it("lists entries", () => {
    cache.set(makeArtifact("uno"));
    cache.set(makeArtifact("nano"));
    const entries = cache.entries();
    expect(entries).toHaveLength(2);
  });
});
