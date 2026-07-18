import { describe, it, expect, beforeEach, vi } from "vitest";
import { ArduinoCppGenerator } from "../../../services/codegen/arduino/ArduinoCppGenerator";
import type { GenerationOptions } from "../../../types/codegen/generator";

import "../../../services/codegen/arduino/BlockGenerators";

describe("ArduinoCppGenerator", () => {
  let generator: ArduinoCppGenerator;

  beforeEach(() => {
    generator = new ArduinoCppGenerator();
  });

  describe("interface properties", () => {
    it("should have correct id", () => {
      expect(generator.id).toBe("arduino-cpp-generator-v1");
    });

    it("should have correct name", () => {
      expect(generator.name).toBe("Arduino C++ Generator");
    });

    it("should have version", () => {
      expect(generator.version).toBe("1.0.0");
    });

    it("should support arduino-cpp language", () => {
      expect(generator.supportedLanguages).toContain("arduino-cpp");
    });

    it("should support arduino framework", () => {
      expect(generator.supportedFrameworks).toContain("arduino");
    });
  });

  describe("supports()", () => {
    it("should return true for supported language and framework", () => {
      expect(generator.supports("arduino-cpp", "arduino")).toBe(true);
    });

    it("should return false for unsupported language", () => {
      expect(generator.supports("micropython", "arduino")).toBe(false);
    });

    it("should return false for unsupported framework", () => {
      expect(generator.supports("arduino-cpp", "esp-idf")).toBe(false);
    });
  });

  describe("prepare()", () => {
    it("should complete without error", async () => {
      await expect(generator.prepare({ language: "arduino-cpp", framework: "arduino", board: "uno" })).resolves.toBeUndefined();
    });
  });

  describe("cleanup()", () => {
    it("should complete without error", async () => {
      await expect(generator.cleanup({ language: "arduino-cpp", framework: "arduino", board: "uno" })).resolves.toBeUndefined();
    });
  });

  describe("validate()", () => {
    it("should return valid for correct options", async () => {
      const result = await generator.validate({
        language: "arduino-cpp",
        framework: "arduino",
        board: "uno",
        blocks: [{ type: "pin_mode", id: "b1", fields: { PIN: "13", MODE: "OUTPUT" } }],
      });
      expect(result.valid).toBe(true);
    });

    it("should return error for missing language", async () => {
      const result = await generator.validate({
        language: "",
        framework: "arduino",
        board: "uno",
      });
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "NO_LANGUAGE")).toBe(true);
    });

    it("should return error for unsupported language", async () => {
      const result = await generator.validate({
        language: "micropython",
        framework: "arduino",
        board: "uno",
      });
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "UNSUPPORTED_LANG")).toBe(true);
    });

    it("should return error for missing framework", async () => {
      const result = await generator.validate({
        language: "arduino-cpp",
        framework: "",
        board: "uno",
      });
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "NO_FRAMEWORK")).toBe(true);
    });

    it("should return error for unsupported framework", async () => {
      const result = await generator.validate({
        language: "arduino-cpp",
        framework: "esp-idf",
        board: "uno",
      });
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "UNSUPPORTED_FRAMEWORK")).toBe(true);
    });
  });

  describe("generate()", () => {
    it("should generate a Blink sketch with lifecycle blocks", async () => {
      const options: GenerationOptions = {
        language: "arduino-cpp",
        framework: "arduino",
        board: "uno",
        blocks: [
          {
            type: "controls_start",
            id: "s1",
            next: { type: "pin_mode", id: "b1", fields: { PIN: "13", MODE: "OUTPUT" } },
          },
          {
            type: "controls_forever",
            id: "f1",
            next: {
              type: "pin_write", id: "b2", fields: { PIN: "13", STATE: "HIGH" },
              next: {
                type: "delay", id: "b3", fields: { MS: "1000" },
                next: {
                  type: "pin_write", id: "b4", fields: { PIN: "13", STATE: "LOW" },
                  next: {
                    type: "delay", id: "b5", fields: { MS: "1000" },
                  },
                },
              },
            },
          },
        ],
      };

      const result = await generator.generate(options);
      expect(result.status).toBe("success");
      expect(result.artifact).toBeDefined();
      expect(result.artifact!.sourceFiles.length).toBe(1);
      const content = result.artifact!.sourceFiles[0].content;

      expect(content).toContain("#include <Arduino.h>");
      expect(content).toContain("void setup()");
      expect(content).toContain("pinMode(13, OUTPUT);");
      expect(content).toContain("void loop()");
      expect(content).toContain("digitalWrite(13, HIGH);");
      expect(content).toContain("delay(1000);");
      expect(content).toContain("digitalWrite(13, LOW);");
    });

    it("should generate an empty sketch when no blocks provided", async () => {
      const options: GenerationOptions = {
        language: "arduino-cpp",
        framework: "arduino",
        board: "uno",
        blocks: [],
      };

      const result = await generator.generate(options);
      expect(result.status).toBe("success");
      expect(result.artifact).toBeDefined();
      const content = result.artifact!.sourceFiles[0].content;
      expect(content).toContain("void setup()");
      expect(content).toContain("void loop()");
    });

    it("should generate sketch with lifecycle blocks", async () => {
      const options: GenerationOptions = {
        language: "arduino-cpp",
        framework: "arduino",
        board: "uno",
        blocks: [
          {
            type: "controls_start",
            id: "s1",
            next: { type: "delay", id: "b1", fields: { MS: "500" } },
          },
          {
            type: "controls_forever",
            id: "f1",
            next: { type: "pin_write", id: "b2", fields: { PIN: "13", STATE: "HIGH" } },
          },
        ],
      };

      const result = await generator.generate(options);
      expect(result.status).toBe("success");
      const content = result.artifact!.sourceFiles[0].content;
      expect(content).toContain("void setup()");
      expect(content).toContain("delay(500);");
      expect(content).toContain("void loop()");
      expect(content).toContain("digitalWrite(13, HIGH);");
    });

    it("should generate sketch without lifecycle blocks (default to setup)", async () => {
      const options: GenerationOptions = {
        language: "arduino-cpp",
        framework: "arduino",
        board: "uno",
        blocks: [
          { type: "pin_mode", id: "b1", fields: { PIN: "9", MODE: "OUTPUT" } },
          { type: "pin_write", id: "b2", fields: { PIN: "9", STATE: "HIGH" } },
        ],
      };

      const result = await generator.generate(options);
      expect(result.status).toBe("success");
      const content = result.artifact!.sourceFiles[0].content;
      expect(content).toContain("void setup()");
      expect(content).toContain("pinMode(9, OUTPUT);");
      expect(content).toContain("digitalWrite(9, HIGH);");
    });

    it("should handle variable declarations", async () => {
      const options: GenerationOptions = {
        language: "arduino-cpp",
        framework: "arduino",
        board: "uno",
        blocks: [
          { type: "create_variable", id: "v1", fields: { VAR_NAME: "ledPin" } },
          { type: "set_variable", id: "v2", fields: { VAR_NAME: "ledPin" }, inputs: { VALUE: { block: { type: "math_number", fields: { NUM: "13" } } } } },
        ],
      };

      const result = await generator.generate(options);
      expect(result.status).toBe("success");
      const content = result.artifact!.sourceFiles[0].content;
      expect(content).toContain("int ledPin = 0;");
      expect(content).toContain("ledPin = 13;");
    });

    it("should handle controls_if and controls_repeat", async () => {
      const options: GenerationOptions = {
        language: "arduino-cpp",
        framework: "arduino",
        board: "uno",
        blocks: [
          {
            type: "controls_if",
            id: "if1",
            inputs: {
              IF0: { block: { type: "logic_boolean", fields: { BOOL: "TRUE" } } },
              DO0: { block: { type: "pin_write", fields: { PIN: "13", STATE: "HIGH" } } },
            },
          },
          {
            type: "controls_repeat",
            id: "r1",
            inputs: {
              TIMES: { block: { type: "math_number", fields: { NUM: "3" } } },
              DO: { block: { type: "delay", fields: { MS: "100" } } },
            },
          },
        ],
      };

      const result = await generator.generate(options);
      expect(result.status).toBe("success");
      const content = result.artifact!.sourceFiles[0].content;
      expect(content).toContain("if (true) {");
      expect(content).toContain("for (int _count = 0; _count < 3; _count++) {");
    });

    it("should report progress callback", async () => {
      const options: GenerationOptions = {
        language: "arduino-cpp",
        framework: "arduino",
        board: "uno",
        blocks: [{ type: "pin_mode", fields: { PIN: "13", MODE: "OUTPUT" } }],
      };

      const onProgress = vi.fn();
      await generator.generate(options, onProgress);
      expect(onProgress).toHaveBeenCalled();
      const stages = onProgress.mock.calls.map((c: unknown[]) => (c[0] as { stage: string }).stage);
      expect(stages).toContain("validating");
      expect(stages).toContain("generating");
      expect(stages).toContain("done");
    });

    it("should return failure on validation error", async () => {
      const options: GenerationOptions = {
        language: "arduino-cpp",
        framework: "arduino",
        board: "uno",
        blocks: [{ type: "nonexistent_block", id: "bad" }],
      };

      const result = await generator.generate(options);
      expect(result.status).toBe("failure");
      expect(result.message).toContain("Validation failed");
    });

    it("should include metadata in artifact", async () => {
      const options: GenerationOptions = {
        language: "arduino-cpp",
        framework: "arduino",
        board: "uno",
        blocks: [{ type: "pin_mode", fields: { PIN: "13", MODE: "OUTPUT" } }],
      };

      const result = await generator.generate(options);
      expect(result.artifact?.metadata.generatorId).toBe("arduino-cpp-generator-v1");
      expect(result.artifact?.metadata.blockCount).toBe("1");
    });

    it("should use custom sketch name from additionalArgs", async () => {
      const options: GenerationOptions = {
        language: "arduino-cpp",
        framework: "arduino",
        board: "uno",
        blocks: [{ type: "pin_mode", fields: { PIN: "13", MODE: "OUTPUT" } }],
        additionalArgs: { sketchName: "MyBlink" },
      };

      const result = await generator.generate(options);
      expect(result.artifact!.sourceFiles[0].path).toBe("MyBlink.ino");
    });

    it("should handle include-style comment blocks", async () => {
      const options: GenerationOptions = {
        language: "arduino-cpp",
        framework: "arduino",
        board: "uno",
        blocks: [
          { type: "comment", id: "c1", fields: { TEXT: "#include <SoftwareSerial.h>" } },
          { type: "pin_mode", id: "b1", fields: { PIN: "13", MODE: "OUTPUT" } },
        ],
      };

      const result = await generator.generate(options);
      expect(result.status).toBe("success");
      const content = result.artifact!.sourceFiles[0].content;
      expect(content).toContain("#include <SoftwareSerial.h>");
    });

    it("should handle while loop in generation", async () => {
      const options: GenerationOptions = {
        language: "arduino-cpp",
        framework: "arduino",
        board: "uno",
        blocks: [
          {
            type: "controls_whileUntil", id: "w1",
            mutation: JSON.stringify({ mode: "WHILE" }),
            inputs: {
              WHILE: { block: { type: "logic_boolean", fields: { BOOL: "TRUE" } } },
              DO: { block: { type: "delay", fields: { MS: "100" } } },
            },
          },
        ],
      };

      const result = await generator.generate(options);
      expect(result.status).toBe("success");
      const content = result.artifact!.sourceFiles[0].content;
      expect(content).toContain("while (true) {");
    });

    it("should handle empty sketch name", async () => {
      const options: GenerationOptions = {
        language: "arduino-cpp",
        framework: "arduino",
        board: "uno",
        blocks: [],
        additionalArgs: { sketchName: "" },
      };

      const result = await generator.generate(options);
      expect(result.status).toBe("success");
      expect(result.artifact!.sourceFiles[0].path).toBe("sketch.ino");
    });

    it("should handle null blocks gracefully", async () => {
      const badOptions: GenerationOptions = {
        language: "arduino-cpp",
        framework: "arduino",
        board: "uno",
        blocks: null as unknown as Record<string, unknown>[],
      };

      const result = await generator.generate(badOptions);
      expect(result.status).toBe("success");
      expect(result.message).toContain("Empty sketch");
    });
  });
});
