import { describe, it, expect } from "vitest";
import { createBuildArtifact } from "../../types/build/artifact";

describe("createBuildArtifact", () => {
  it("creates artifact with required fields", () => {
    const artifact = createBuildArtifact({
      boardId: "uno",
      framework: "arduino",
      firmwarePath: "/tmp/build/firmware.hex",
      size: 32256,
      checksum: "abc123",
    });
    expect(artifact.boardId).toBe("uno");
    expect(artifact.framework).toBe("arduino");
    expect(artifact.firmwarePath).toBe("/tmp/build/firmware.hex");
    expect(artifact.size).toBe(32256);
    expect(artifact.checksum).toBe("abc123");
    expect(artifact.timestamp).toBeGreaterThan(0);
  });

  it("sets timestamp to current time", () => {
    const before = Date.now() - 100;
    const artifact = createBuildArtifact({
      boardId: "nano",
      framework: "arduino",
      firmwarePath: "/tmp/nano.hex",
      size: 1024,
      checksum: "def456",
    });
    const after = Date.now() + 100;
    expect(artifact.timestamp).toBeGreaterThanOrEqual(before);
    expect(artifact.timestamp).toBeLessThanOrEqual(after);
  });

  it("optional fields are undefined", () => {
    const artifact = createBuildArtifact({
      boardId: "esp32",
      framework: "esp-idf",
      firmwarePath: "/tmp/esp32/firmware.bin",
      size: 512000,
      checksum: "ghi789",
    });
    expect(artifact.hexPath).toBeUndefined();
    expect(artifact.binPath).toBeUndefined();
    expect(artifact.elfPath).toBeUndefined();
    expect(artifact.mapPath).toBeUndefined();
  });
});
