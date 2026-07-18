import { describe, it, expect, afterAll } from "vitest";
import { ArduinoCliAdapter } from "../../services/build/arduino/ArduinoCliAdapter";
import { ArduinoCliBuildEngine } from "../../services/build/arduino/ArduinoCliBuildEngine";
import { ArduinoCppGenerator } from "../../services/codegen/arduino/ArduinoCppGenerator";
import type { GenerationOptions } from "../../types/codegen/generator";
import type { BuildOptions } from "../../types/build/engine";
import { existsSync, statSync, rmSync } from "fs";

import "../../services/codegen/arduino/BlockGenerators";

const adapter = new ArduinoCliAdapter();
const tool = adapter.detectTool();
const CLI_AVAILABLE = tool !== null;

const arduinoCliVersion = CLI_AVAILABLE ? tool!.version : "n/a";
const detectedCores = CLI_AVAILABLE ? adapter.discoverCores() : [];
const detectedLibraries = CLI_AVAILABLE ? adapter.discoverLibraries() : [];

const describeOrSkip = CLI_AVAILABLE ? describe : describe.skip;

function blinkBlocks(): Record<string, unknown>[] {
  return [
    { type: "controls_start", id: "s1", next: { type: "pin_mode", id: "b1", fields: { PIN: "13", MODE: "OUTPUT" } } },
    {
      type: "controls_forever", id: "f1",
      next: {
        type: "pin_write", id: "b2", fields: { PIN: "13", STATE: "HIGH" },
        next: {
          type: "delay", id: "b3", fields: { MS: "1000" },
          next: {
            type: "pin_write", id: "b4", fields: { PIN: "13", STATE: "LOW" },
            next: { type: "delay", id: "b5", fields: { MS: "1000" } },
          },
        },
      },
    },
  ];
}

function trafficLightBlocks(): Record<string, unknown>[] {
  return [
    {
      type: "controls_start", id: "s1",
      next: {
        type: "pin_mode", id: "b1", fields: { PIN: "10", MODE: "OUTPUT" },
        next: {
          type: "pin_mode", id: "b2", fields: { PIN: "9", MODE: "OUTPUT" },
          next: { type: "pin_mode", id: "b3", fields: { PIN: "8", MODE: "OUTPUT" } },
        },
      },
    },
    {
      type: "controls_forever", id: "f1",
      next: {
        type: "pin_write", id: "b4", fields: { PIN: "10", STATE: "HIGH" },
        next: {
          type: "delay", id: "b5", fields: { MS: "3000" },
          next: {
            type: "pin_write", id: "b6", fields: { PIN: "10", STATE: "LOW" },
            next: {
              type: "pin_write", id: "b7", fields: { PIN: "9", STATE: "HIGH" },
              next: {
                type: "delay", id: "b8", fields: { MS: "2000" },
                next: {
                  type: "pin_write", id: "b9", fields: { PIN: "9", STATE: "LOW" },
                  next: {
                    type: "pin_write", id: "b10", fields: { PIN: "8", STATE: "HIGH" },
                    next: {
                      type: "delay", id: "b11", fields: { MS: "1000" },
                      next: { type: "pin_write", id: "b12", fields: { PIN: "8", STATE: "LOW" } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  ];
}

function buttonBlocks(): Record<string, unknown>[] {
  return [
    {
      type: "controls_start", id: "s1",
      next: {
        type: "pin_mode", id: "b1", fields: { PIN: "2", MODE: "INPUT" },
        next: { type: "pin_mode", id: "b2", fields: { PIN: "13", MODE: "OUTPUT" } },
      },
    },
    {
      type: "controls_forever", id: "f1",
      next: {
        type: "controls_if", id: "if1",
        inputs: {
          IF0: {
            block: {
              type: "logic_compare", fields: { OP: "EQ" },
              inputs: {
                A: { block: { type: "pin_read", fields: { PIN: "2" } } },
                B: { block: { type: "math_number", fields: { NUM: "HIGH" } } },
              },
            },
          },
          DO0: { block: { type: "pin_write", fields: { PIN: "13", STATE: "HIGH" } } },
        },
        next: { type: "pin_write", id: "b3", fields: { PIN: "13", STATE: "LOW" } },
      },
    },
  ];
}

function pwmBlocks(): Record<string, unknown>[] {
  return [
    { type: "controls_start", id: "s1", next: { type: "pin_mode", id: "b1", fields: { PIN: "9", MODE: "OUTPUT" } } },
    {
      type: "controls_forever", id: "f1",
      next: {
        type: "controls_repeat", id: "r1",
        inputs: {
          TIMES: { block: { type: "math_number", fields: { NUM: "255" } } },
          DO: {
            block: {
              type: "analog_write", id: "aw1", fields: { PIN: "9" },
              inputs: { VALUE: { block: { type: "get_variable", fields: { VAR_NAME: "brightness" } } } },
            },
          },
        },
      },
    },
  ];
}

function potentiometerBlocks(): Record<string, unknown>[] {
  return [
    { type: "controls_start", id: "s1", next: { type: "pin_mode", id: "b1", fields: { PIN: "13", MODE: "OUTPUT" } } },
    {
      type: "controls_forever", id: "f1",
      next: {
        type: "analog_write", id: "aw1", fields: { PIN: "9" },
        inputs: {
          VALUE: {
            block: {
              type: "math_arithmetic", fields: { OP: "DIVIDE" },
              inputs: {
                A: { block: { type: "analog_read", fields: { PIN: "A0" } } },
                B: { block: { type: "math_number", fields: { NUM: "4" } } },
              },
            },
          },
        },
      },
    },
  ];
}

function counterBlocks(): Record<string, unknown>[] {
  return [
    { type: "create_variable", id: "v1", fields: { VAR_NAME: "counter" } },
    {
      type: "controls_forever", id: "f1",
      next: {
        type: "change_variable", id: "cv1", fields: { VAR_NAME: "counter" },
        inputs: { VALUE: { block: { type: "math_number", fields: { NUM: "1" } } } },
        next: { type: "delay", id: "d1", fields: { MS: "1000" } },
      },
    },
  ];
}

const EXAMPLES: { name: string; blocks: Record<string, unknown>[] }[] = [
  { name: "Blink", blocks: blinkBlocks() },
  { name: "Traffic Light", blocks: trafficLightBlocks() },
  { name: "Button", blocks: buttonBlocks() },
  { name: "PWM", blocks: pwmBlocks() },
  { name: "Potentiometer", blocks: potentiometerBlocks() },
  { name: "Counter", blocks: counterBlocks() },
];

describeOrSkip("Phase 14.5 — Real Arduino CLI Integration (Blockly → Generator → Build → HEX)", () => {
  const generator = new ArduinoCppGenerator();
  const engine = new ArduinoCliBuildEngine(adapter);

  console.log(`[Phase 14.5] arduino-cli version: ${arduinoCliVersion}`);
  console.log(`[Phase 14.5] detected cores: ${detectedCores.join(", ") || "(none)"}`);
  console.log(`[Phase 14.5] detected libraries (${detectedLibraries.length}): ${detectedLibraries.slice(0, 8).join(", ")}...`);

  const buildDirs: string[] = [];

  afterAll(() => {
    for (const dir of buildDirs) {
      try {
        if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  for (const example of EXAMPLES) {
    it(`produces a valid HEX for "${example.name}"`, async () => {
      const genOptions: GenerationOptions = {
        language: "arduino-cpp",
        framework: "arduino",
        board: "uno",
        blocks: example.blocks,
      };
      const genResult = await generator.generate(genOptions);
      expect(genResult.status).toBe("success");
      const source = genResult.artifact!.sourceFiles[0].content;
      expect(source).toContain("void setup()");
      expect(source).toContain("void loop()");

      const buildOptions: BuildOptions = {
        boardId: "uno",
        framework: "arduino",
        additionalArgs: { sourceContent: source },
      };

      const result = await engine.build(buildOptions);
      if (result.status !== "success") {
        console.log(`[Phase 14.5] ${example.name} BUILD FAILURE: ${result.message}`);
      }
      expect(result.status).toBe("success");
      expect(result.artifact).toBeDefined();

      const artifact = result.artifact!;
      expect(artifact.firmwarePath).toBeTruthy();
      expect(existsSync(artifact.firmwarePath)).toBe(true);

      if (artifact.hexPath) {
        expect(existsSync(artifact.hexPath)).toBe(true);
        const hexSize = statSync(artifact.hexPath).size;
        expect(hexSize).toBeGreaterThan(0);
        console.log(`[Phase 14.5] ${example.name}: HEX ${artifact.hexPath} (${hexSize} bytes), checksum ${artifact.checksum.slice(0, 12)}...`);
      }
      if (artifact.elfPath) {
        expect(existsSync(artifact.elfPath)).toBe(true);
      }
      expect(artifact.checksum).toMatch(/^[0-9a-f]{64}$/);
      expect(artifact.size).toBeGreaterThan(0);

      const verified = await engine.verify(artifact);
      expect(verified).toBe(true);
    }, 180_000);
  }

  it("validates the Arduino CLI installation (arduino:avr core present)", () => {
    const validation = adapter.validateInstallation(["arduino:avr"]);
    expect(validation.valid).toBe(true);
    expect(validation.missingCores).toEqual([]);
  });
});
