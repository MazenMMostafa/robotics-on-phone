import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
  statSync: vi.fn().mockReturnValue({ size: 2048 } as never),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue(Buffer.from("hex-content")),
  rmSync: vi.fn(),
}));

import { existsSync, writeFileSync, readFileSync } from "fs";
import { ArduinoCliBuildEngine } from "../../services/build/arduino/ArduinoCliBuildEngine";
import type { ArduinoCliAdapter } from "../../services/build/arduino/ArduinoCliAdapter";
import type { BuildOptions, BuildProgress } from "../../types/build/engine";
import { CompilerMissing, InvalidBoard } from "../../types/build/error";

function makeMockAdapter(): ArduinoCliAdapter {
  return {
    detectTool: vi.fn().mockReturnValue({ path: "/usr/bin/arduino-cli", version: "1.0.0" }),
    getPath: vi.fn().mockReturnValue("/usr/bin/arduino-cli"),
    getVersion: vi.fn().mockReturnValue("1.0.0"),
    compile: vi.fn().mockReturnValue({
      success: true,
      exitCode: 0,
      stdout: "",
      stderr: "",
      hexPath: "/tmp/build/arduino.avr.uno/sketch.ino.hex",
      elfPath: "/tmp/build/arduino.avr.uno/sketch.ino.elf",
      mapPath: "/tmp/build/arduino.avr.uno/sketch.ino.map",
      size: 2048,
      warnings: [],
      errors: [],
    }),
    parseErrors: vi.fn().mockReturnValue([]),
    parseWarnings: vi.fn().mockReturnValue([]),
  } as unknown as ArduinoCliAdapter;
}

function makeOptions(): BuildOptions {
  return {
    boardId: "uno",
    framework: "arduino",
    additionalArgs: { sourceContent: "void setup() {}\nvoid loop() {}\n" },
  };
}

describe("ArduinoCliBuildEngine", () => {
  let engine: ArduinoCliBuildEngine;
  let mockAdapter: ReturnType<typeof makeMockAdapter>;

  beforeEach(() => {
    mockAdapter = makeMockAdapter();
    engine = new ArduinoCliBuildEngine(mockAdapter as ArduinoCliAdapter);
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(writeFileSync).mockClear();
    vi.mocked(readFileSync).mockReturnValue(Buffer.from("hex-content"));
  });

  describe("identity", () => {
    it("exposes correct metadata", () => {
      expect(engine.id).toBe("arduino-cli-v1");
      expect(engine.name).toBe("Arduino CLI Build Engine");
      expect(engine.version).toBe("1.0.0");
      expect(engine.supportedFrameworks).toEqual(["arduino"]);
    });
  });

  describe("supports", () => {
    it("supports uno/nano/mega with arduino framework", () => {
      expect(engine.supports("uno", "arduino")).toBe(true);
      expect(engine.supports("nano", "arduino")).toBe(true);
      expect(engine.supports("mega", "arduino")).toBe(true);
    });

    it("does not support other frameworks", () => {
      expect(engine.supports("uno", "esp-idf")).toBe(false);
    });

    it("does not support unsupported boards", () => {
      expect(engine.supports("esp32", "arduino")).toBe(false);
    });
  });

  describe("prepare", () => {
    it("resolves when tool is present", async () => {
      await expect(engine.prepare(makeOptions())).resolves.toBeUndefined();
    });

    it("throws CompilerMissing when tool is absent", async () => {
      mockAdapter.detectTool = vi.fn().mockReturnValue(null);
      engine.setAdapter(mockAdapter as ArduinoCliAdapter);
      await expect(engine.prepare(makeOptions())).rejects.toBeInstanceOf(CompilerMissing);
    });

    it("throws InvalidBoard for unsupported board", async () => {
      await expect(engine.prepare({ boardId: "esp32", framework: "arduino" })).rejects.toBeInstanceOf(InvalidBoard);
    });
  });

  describe("build", () => {
    it("returns success with a build artifact", async () => {
      const result = await engine.build(makeOptions());
      expect(result.status).toBe("success");
      expect(result.artifact).toBeDefined();
      expect(result.artifact!.boardId).toBe("uno");
      expect(result.artifact!.firmwarePath).toContain(".hex");
      expect(result.artifact!.checksum).toMatch(/^[0-9a-f]{64}$/);
    });

    it("reports progress through onProgress callback", async () => {
      const onProgress = vi.fn();
      await engine.build(makeOptions(), onProgress);
      const stages = onProgress.mock.calls.map((c: BuildProgress[]) => c[0].stage);
      expect(stages).toContain("compiling");
      expect(stages).toContain("linking");
      expect(stages).toContain("finishing");
      expect(stages).toContain("done");
    });

    it("writes the sketch source to a temp directory", async () => {
      await engine.build(makeOptions());
      expect(writeFileSync).toHaveBeenCalled();
      const writtenPath = vi.mocked(writeFileSync).mock.calls[0][0] as string;
      expect(writtenPath).toContain("sketch.ino");
      const writtenContent = vi.mocked(writeFileSync).mock.calls[0][1] as string;
      expect(writtenContent).toContain("void setup");
    });

    it("returns failure when compile fails", async () => {
      mockAdapter.compile = vi.fn().mockReturnValue({
        success: false,
        exitCode: 1,
        stdout: "",
        stderr: "error: boom",
        size: 0,
        warnings: [],
        errors: ["error: boom"],
      }) as unknown as ArduinoCliAdapter["compile"];
      engine.setAdapter(mockAdapter as ArduinoCliAdapter);
      const result = await engine.build(makeOptions());
      expect(result.status).toBe("failure");
      expect(result.message).toContain("boom");
    });

    it("throws CompilerMissing when tool is absent during build", async () => {
      mockAdapter.detectTool = vi.fn().mockReturnValue(null);
      engine.setAdapter(mockAdapter as ArduinoCliAdapter);
      await expect(engine.build(makeOptions())).rejects.toBeInstanceOf(CompilerMissing);
    });

    it("returns failure when no hex is produced", async () => {
      mockAdapter.compile = vi.fn().mockReturnValue({
        success: true,
        exitCode: 0,
        stdout: "",
        stderr: "",
        size: 0,
        warnings: [],
        errors: [],
      }) as unknown as ArduinoCliAdapter["compile"];
      engine.setAdapter(mockAdapter as ArduinoCliAdapter);
      const result = await engine.build(makeOptions());
      expect(result.status).toBe("failure");
      expect(result.message).toContain("no .hex file");
    });

    it("returns failure when source content is missing", async () => {
      const result = await engine.build({ boardId: "uno", framework: "arduino" });
      expect(result.status).toBe("failure");
    });
  });

  describe("verify", () => {
    it("returns true for an existing artifact with matching checksum", async () => {
      const result = await engine.build(makeOptions());
      const artifact = result.artifact!;
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(Buffer.from("hex-content"));
      const verified = await engine.verify(artifact);
      expect(verified).toBe(true);
    });

    it("returns false when artifact path does not exist", async () => {
      const result = await engine.build(makeOptions());
      vi.mocked(existsSync).mockReturnValue(false);
      const verified = await engine.verify(result.artifact!);
      expect(verified).toBe(false);
    });
  });

  describe("cleanup", () => {
    it("resolves without error", async () => {
      await expect(engine.cleanup(makeOptions())).resolves.toBeUndefined();
    });
  });
});
