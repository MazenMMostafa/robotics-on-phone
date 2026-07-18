import { describe, it, expect, beforeEach } from "vitest";
import { ArduinoCppGenerator } from "../../../services/codegen/arduino/ArduinoCppGenerator";
import type { GenerationOptions } from "../../../types/codegen/generator";

import "../../../services/codegen/arduino/BlockGenerators";

describe("Generator Fixtures", () => {
  let generator: ArduinoCppGenerator;

  beforeEach(() => {
    generator = new ArduinoCppGenerator();
  });

  async function genSketch(blocks: unknown[]): Promise<string> {
    const options: GenerationOptions = {
      language: "arduino-cpp",
      framework: "arduino",
      board: "uno",
      blocks: blocks as Record<string, unknown>[],
    };
    const result = await generator.generate(options);
    expect(result.status).toBe("success");
    return result.artifact!.sourceFiles[0].content;
  }

  describe("Blink (LED on pin 13)", () => {
    it("should generate a correct Blink sketch", async () => {
      const content = await genSketch([
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
      ]);

      expect(content).toContain("#include <Arduino.h>");
      expect(content).toContain("void setup()");
      expect(content).toContain("pinMode(13, OUTPUT);");
      expect(content).toContain("void loop()");
      expect(content).toContain("digitalWrite(13, HIGH);");
      expect(content).toContain("delay(1000);");
      expect(content).toContain("digitalWrite(13, LOW);");
      expect(content).toContain("delay(1000);");

      const setupMatch = content.match(/void setup\(\) \{[\s\S]*?^\}/m);
      expect(setupMatch).toBeTruthy();
      expect(setupMatch![0]).toContain("pinMode(13, OUTPUT);");

      const loopMatch = content.match(/void loop\(\) \{[\s\S]*?^\}/m);
      expect(loopMatch).toBeTruthy();
      expect(loopMatch![0]).toContain("digitalWrite(13, HIGH);");
    });
  });

  describe("Traffic Light (3 LEDs)", () => {
    it("should generate a correct Traffic Light sketch", async () => {
      const content = await genSketch([
        {
          type: "controls_start", id: "s1",
          next: {
            type: "pin_mode", id: "b1", fields: { PIN: "10", MODE: "OUTPUT" },
            next: {
              type: "pin_mode", id: "b2", fields: { PIN: "9", MODE: "OUTPUT" },
              next: {
                type: "pin_mode", id: "b3", fields: { PIN: "8", MODE: "OUTPUT" },
              },
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
                          next: {
                            type: "pin_write", id: "b12", fields: { PIN: "8", STATE: "LOW" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ]);

      expect(content).toContain("pinMode(10, OUTPUT);");
      expect(content).toContain("pinMode(9, OUTPUT);");
      expect(content).toContain("pinMode(8, OUTPUT);");
      expect(content).toContain("digitalWrite(10, HIGH);");
      expect(content).toContain("delay(3000);");
      expect(content).toContain("digitalWrite(9, HIGH);");
      expect(content).toContain("delay(2000);");
      expect(content).toContain("digitalWrite(8, HIGH);");
      expect(content).toContain("delay(1000);");
    });
  });

  describe("Button (digital read)", () => {
    it("should generate a correct Button sketch", async () => {
      const content = await genSketch([
        {
          type: "controls_start", id: "s1",
          next: {
            type: "pin_mode", id: "b1", fields: { PIN: "2", MODE: "INPUT" },
            next: {
              type: "pin_mode", id: "b2", fields: { PIN: "13", MODE: "OUTPUT" },
            },
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
            next: {
              type: "pin_write", id: "b3", fields: { PIN: "13", STATE: "LOW" },
            },
          },
        },
      ]);

      expect(content).toContain("pinMode(2, INPUT);");
      expect(content).toContain("pinMode(13, OUTPUT);");
      expect(content).toContain("((digitalRead(2) == HIGH)) {");
      expect(content).toContain("digitalWrite(13, HIGH);");
    });
  });

  describe("Potentiometer (analog read)", () => {
    it("should generate a correct Potentiometer sketch", async () => {
      const content = await genSketch([
        {
          type: "controls_start", id: "s1",
          next: {
            type: "pin_mode", id: "b1", fields: { PIN: "13", MODE: "OUTPUT" },
          },
        },
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
      ]);

      expect(content).toContain("pinMode(13, OUTPUT);");
      expect(content).toContain("analogWrite(9, (analogRead(A0) / 4));");
    });
  });

  describe("PWM LED (analogWrite + fade)", () => {
    it("should generate a correct PWM LED sketch", async () => {
      const content = await genSketch([
        {
          type: "controls_start", id: "s1",
          next: {
            type: "pin_mode", id: "b1", fields: { PIN: "9", MODE: "OUTPUT" },
          },
        },
        {
          type: "controls_forever", id: "f1",
          next: {
            type: "controls_repeat", id: "r1",
            inputs: {
              TIMES: { block: { type: "math_number", fields: { NUM: "255" } } },
              DO: {
                block: {
                  type: "analog_write", id: "aw1", fields: { PIN: "9" },
                  inputs: {
                    VALUE: { block: { type: "get_variable", fields: { VAR_NAME: "brightness" } } },
                  },
                },
              },
            },
          },
        },
      ]);

      expect(content).toContain("pinMode(9, OUTPUT);");
      expect(content).toContain("for (int _count = 0; _count < 255; _count++) {");
      expect(content).toContain("analogWrite(9, brightness);");
    });
  });

  describe("Simple Counter (variables + loops)", () => {
    it("should generate a correct Simple Counter sketch", async () => {
      const content = await genSketch([
        { type: "create_variable", id: "v1", fields: { VAR_NAME: "counter" } },
        {
          type: "controls_forever", id: "f1",
          next: {
            type: "change_variable", id: "cv1", fields: { VAR_NAME: "counter" },
            inputs: {
              VALUE: { block: { type: "math_number", fields: { NUM: "1" } } },
            },
            next: {
              type: "delay", id: "d1", fields: { MS: "1000" },
            },
          },
        },
      ]);

      expect(content).toContain("int counter = 0;");
      expect(content).toContain("counter += 1;");
      expect(content).toContain("delay(1000);");
      expect(content).toContain("void loop()");
    });
  });
});
