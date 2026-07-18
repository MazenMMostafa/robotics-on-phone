import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ArduinoCliAdapter } from "../../services/build/arduino/ArduinoCliAdapter";

vi.mock("child_process", () => ({
  execSync: vi.fn(),
  execFileSync: vi.fn(),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
  statSync: vi.fn().mockReturnValue({ size: 1234, isDirectory: () => false }),
  readdirSync: vi.fn().mockReturnValue(["sketch_output.ino.hex", "sketch_output.ino.elf"]),
  readFileSync: vi.fn(),
}));

import { execSync, execFileSync } from "child_process";
import { existsSync, statSync, readdirSync } from "fs";

describe("ArduinoCliAdapter", () => {
  let adapter: ArduinoCliAdapter;

  beforeEach(() => {
    adapter = new ArduinoCliAdapter();
    vi.clearAllMocks();
    vi.mocked(execSync).mockImplementation(() => "arduino-cli  Version: 1.2.3" as never);
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(statSync).mockReturnValue({ size: 1234, isDirectory: () => false } as never);
    vi.mocked(readdirSync).mockReturnValue(["sketch_output.ino.hex", "sketch_output.ino.elf"] as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("detectTool", () => {
    it("detects arduino-cli on PATH and returns tool info", () => {
      const info = adapter.detectTool();
      expect(info).not.toBeNull();
      expect(info!.version).toBe("1.2.3");
      expect(info!.path).toContain("arduino-cli");
    });

    it("returns null when arduino-cli is not found", () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("command not found");
      });
      const info = adapter.detectTool();
      expect(info).toBeNull();
    });

    it("caches the detected tool info", () => {
      const first = adapter.detectTool();
      const second = adapter.detectTool();
      expect(first).toEqual(second);
      expect(execSync).toHaveBeenCalledTimes(1);
    });
  });

  describe("getVersion / getPath", () => {
    it("returns detected version", () => {
      expect(adapter.getVersion()).toBe("1.2.3");
    });

    it("returns 0.0.0 when not detected", () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("command not found");
      });
      expect(adapter.getVersion()).toBe("0.0.0");
    });

    it("returns detected path", () => {
      expect(adapter.getPath()).toContain("arduino-cli");
    });
  });

  describe("compile", () => {
    it("returns failure when arduino-cli is missing", () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("command not found");
      });
      const result = adapter.compile({
        fqbn: "arduino:avr:uno",
        sketchPath: "/tmp/sketch",
        buildPath: "/tmp/build",
      });
      expect(result.success).toBe(false);
      expect(result.errors).toContain("arduino-cli not found");
    });

    it("returns success and locates build output on successful compile", () => {
      vi.mocked(execFileSync).mockReturnValue("Compile complete" as never);
      vi.mocked(existsSync).mockImplementation((p) => String(p) === "/tmp/build" || String(p).endsWith(".ino.hex") || String(p).endsWith(".ino.elf"));
      vi.mocked(statSync).mockReturnValue({ size: 1234, isDirectory: () => false } as never);

      const result = adapter.compile({
        fqbn: "arduino:avr:uno",
        sketchPath: "/tmp/sketch",
        buildPath: "/tmp/build",
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.hexPath).toContain(".ino.hex");
      expect(result.size).toBe(1234);
    });

    it("parses warnings from stdout", () => {
      vi.mocked(execFileSync).mockReturnValue("something warning: deprecated API" as never);
      vi.mocked(existsSync).mockImplementation((p) => String(p) === "/tmp/build" || String(p).endsWith(".ino.hex") || String(p).endsWith(".ino.elf"));
      vi.mocked(statSync).mockReturnValue({ size: 100, isDirectory: () => false } as never);

      const result = adapter.compile({
        fqbn: "arduino:avr:uno",
        sketchPath: "/tmp/sketch",
        buildPath: "/tmp/build",
      });

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("returns failure with parsed errors on compile error", () => {
      const err = new Error("compile failed") as Error & { status?: number; stderr?: string };
      err.status = 1;
      err.stderr = "sketch.ino:10:5: error: 'foo' was not declared";
      vi.mocked(execFileSync).mockImplementation(() => {
        throw err;
      });

      const result = adapter.compile({
        fqbn: "arduino:avr:uno",
        sketchPath: "/tmp/sketch",
        buildPath: "/tmp/build",
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("argument building", () => {
    it("builds compile args with fqbn and sketch path", () => {
      vi.mocked(execFileSync).mockReturnValue("" as never);
      vi.mocked(existsSync).mockImplementation((p) => String(p).endsWith("sketch.ino.hex"));
      vi.mocked(statSync).mockReturnValue({ size: 1 } as never);

      adapter.compile({
        fqbn: "arduino:avr:uno",
        sketchPath: "/tmp/sketch",
        buildPath: "/tmp/build",
        verbose: true,
        libraries: ["/libs"],
        additionalFlags: ["--export-binaries"],
      });

      const args = vi.mocked(execFileSync).mock.calls[0][1] as string[];
      expect(args).toContain("--fqbn");
      expect(args).toContain("arduino:avr:uno");
      expect(args).toContain("--verbose");
      expect(args).toContain("--libraries");
      expect(args).toContain("/libs");
      expect(args).toContain("--export-binaries");
      expect(args).toContain("/tmp/sketch");
    });
  });
});
