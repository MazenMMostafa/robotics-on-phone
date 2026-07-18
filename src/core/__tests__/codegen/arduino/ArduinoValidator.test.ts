import { describe, it, expect, beforeEach } from "vitest";
import { ArduinoValidator } from "../../../services/codegen/arduino/ArduinoValidator";
import { clearRegistry, registerGenerator } from "../../../services/codegen/arduino/ArduinoBlockRegistry";
import type { ArduinoBlock } from "../../../services/codegen/arduino/types";

describe("ArduinoValidator", () => {
  let validator: ArduinoValidator;

  beforeEach(() => {
    clearRegistry();
    validator = new ArduinoValidator();
  });

  it("should return valid for empty blocks with warning", () => {
    const result = validator.validateBlocks([], "uno");
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.code === "NO_BLOCKS")).toBe(true);
  });

  it("should return error for no board", () => {
    const result = validator.validateBlocks([{ type: "pin_mode", fields: { PIN: "13", MODE: "OUTPUT" } }], "");
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "NO_BOARD")).toBe(true);
  });

  it("should warn for unsupported board", () => {
    const result = validator.validateBlocks([{ type: "pin_mode", fields: { PIN: "13", MODE: "OUTPUT" } }], "unknown_board");
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.code === "UNSUPPORTED_BOARD")).toBe(true);
  });

  it("should error for unsupported block type", () => {
    const result = validator.validateBlocks([{ type: "invalid_block_type", id: "b1" }], "uno");
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "UNSUPPORTED_BLOCK")).toBe(true);
  });

  it("should accept registered block types", () => {
    registerGenerator("custom_block", () => "custom");
    const result = validator.validateBlocks([{ type: "custom_block", id: "b1" }], "uno");
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.code === "UNSUPPORTED_BLOCK").length).toBe(0);
  });

  it("should error for missing block type field", () => {
    const result = validator.validateBlocks([{} as ArduinoBlock], "uno");
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "INVALID_BLOCK")).toBe(true);
  });

  it("should error for invalid pin number", () => {
    const result = validator.validateBlocks([{ type: "pin_mode", id: "b1", fields: { PIN: "99", MODE: "OUTPUT" } }], "uno");
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "INVALID_PIN")).toBe(true);
  });

  it("should warn for invalid pin format", () => {
    const result = validator.validateBlocks([{ type: "pin_mode", id: "b1", fields: { PIN: "ABC", MODE: "OUTPUT" } }], "uno");
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.code === "INVALID_PIN_FORMAT")).toBe(true);
  });

  it("should warn for non-PWM pin with analogWrite", () => {
    const result = validator.validateBlocks([{ type: "analog_write", id: "b1", fields: { PIN: "0" } }], "uno");
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.code === "NON_PWM_PIN")).toBe(true);
  });

  it("should warn for duplicate variable declaration", () => {
    const result = validator.validateBlocks([
      { type: "create_variable", id: "b1", fields: { VAR_NAME: "ledPin" } },
      { type: "create_variable", id: "b2", fields: { VAR_NAME: "ledPin" } },
    ], "uno");
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.code === "DUPLICATE_VARIABLE")).toBe(true);
  });

  it("should warn for undeclared variable usage", () => {
    const result = validator.validateBlocks([
      { type: "set_variable", id: "b1", fields: { VAR_NAME: "myVar" } },
    ], "uno");
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.code === "UNDECLARED_VARIABLE")).toBe(true);
  });

  it("should warn for invalid number in math_number", () => {
    const result = validator.validateBlocks([
      { type: "math_number", id: "b1", fields: { NUM: "abc" } },
    ], "uno");
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.code === "INVALID_NUMBER")).toBe(true);
  });

  it("should warn for invalid delay value", () => {
    const result = validator.validateBlocks([
      { type: "delay", id: "b1", fields: { MS: "not-a-number" } },
    ], "uno");
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.code === "INVALID_DELAY")).toBe(true);
  });

  it("should warn for invalid mutation JSON", () => {
    const result = validator.validateBlocks([
      { type: "controls_if", id: "b1", mutation: "not-json" },
    ], "uno");
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.code === "INVALID_MUTATION")).toBe(true);
  });

  it("should error for nested lifecycle blocks", () => {
    const result = validator.validateBlocks([
      {
        type: "controls_start",
        id: "b1",
        next: { type: "controls_forever", id: "b2" },
      },
    ], "uno");
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "NESTED_LIFECYCLE")).toBe(true);
  });

  it("should validate nested input blocks recursively", () => {
    const result = validator.validateBlocks([
      {
        type: "controls_if",
        id: "b1",
        inputs: {
          IF0: {
            block: { type: "unsupported_nested", id: "b2" },
          },
        },
      },
    ], "uno");
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "UNSUPPORTED_BLOCK")).toBe(true);
  });

  it("should validate next chain recursively", () => {
    const result = validator.validateBlocks([
      {
        type: "pin_mode",
        id: "b1",
        fields: { PIN: "13", MODE: "OUTPUT" },
        next: { type: "unsupported_chain", id: "b2" },
      },
    ], "uno");
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "UNSUPPORTED_BLOCK")).toBe(true);
  });

  it("should return valid for a correct Blink sketch", () => {
    const blocks: ArduinoBlock[] = [
      {
        type: "controls_start", id: "s1",
        next: {
          type: "pin_mode", id: "b1", fields: { PIN: "13", MODE: "OUTPUT" },
        },
      },
      {
        type: "controls_forever", id: "f1",
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
    ];
    const result = validator.validateBlocks(blocks, "uno");
    expect(result.valid).toBe(true);
    expect(result.issues.length).toBe(0);
  });
});
