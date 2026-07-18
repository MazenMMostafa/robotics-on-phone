import { describe, it, expect } from "vitest";
import { createSourceArtifact } from "../../types/codegen/artifact";

describe("createSourceArtifact", () => {
  it("creates artifact with required fields", () => {
    const artifact = createSourceArtifact({
      language: "arduino-cpp",
      framework: "arduino",
      board: "uno",
      checksum: "abc123",
    });
    expect(artifact.language).toBe("arduino-cpp");
    expect(artifact.framework).toBe("arduino");
    expect(artifact.board).toBe("uno");
    expect(artifact.checksum).toBe("abc123");
    expect(artifact.timestamp).toBeGreaterThan(0);
    expect(artifact.sourceFiles).toEqual([]);
    expect(artifact.headers).toEqual([]);
    expect(artifact.assets).toEqual([]);
    expect(artifact.metadata).toEqual({});
  });

  it("includes optional fields", () => {
    const artifact = createSourceArtifact({
      language: "micropython",
      framework: "micropython",
      board: "pico",
      sourceFiles: [{ path: "main.py", content: "print('hello')" }],
      headers: [{ path: "config.py", content: "# config" }],
      assets: [{ path: "boot.py", content: "# boot" }],
      metadata: { version: "1.0" },
      checksum: "def456",
    });
    expect(artifact.sourceFiles).toHaveLength(1);
    expect(artifact.headers).toHaveLength(1);
    expect(artifact.assets).toHaveLength(1);
    expect(artifact.metadata.version).toBe("1.0");
  });

  it("sets timestamp to current time", () => {
    const before = Date.now() - 100;
    const artifact = createSourceArtifact({
      language: "arduino-cpp", framework: "arduino", board: "nano", checksum: "ghi789",
    });
    expect(artifact.timestamp).toBeGreaterThanOrEqual(before);
    expect(artifact.timestamp).toBeLessThanOrEqual(Date.now() + 100);
  });
});
