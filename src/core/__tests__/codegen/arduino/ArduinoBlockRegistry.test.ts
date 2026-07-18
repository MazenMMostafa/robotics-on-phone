import { describe, it, expect, beforeEach } from "vitest";
import { registerGenerator, getGenerator, hasGenerator, getAllRegisteredTypes, clearRegistry } from "../../../services/codegen/arduino/ArduinoBlockRegistry";
import type { BlockGeneratorFn } from "../../../services/codegen/arduino/ArduinoBlockRegistry";
import { GenerationContext } from "../../../services/codegen/arduino/GenerationContext";
import type { ArduinoBlock } from "../../../services/codegen/arduino/types";

describe("ArduinoBlockRegistry", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("should register and retrieve a generator", () => {
    const fn: BlockGeneratorFn = () => "test";
    registerGenerator("test_block", fn);
    expect(getGenerator("test_block")).toBe(fn);
    expect(hasGenerator("test_block")).toBe(true);
  });

  it("should return undefined for unknown block type", () => {
    expect(getGenerator("nonexistent")).toBeUndefined();
    expect(hasGenerator("nonexistent")).toBe(false);
  });

  it("should overwrite existing generator on re-register", () => {
    const fn1: BlockGeneratorFn = () => "first";
    const fn2: BlockGeneratorFn = () => "second";
    registerGenerator("test_block", fn1);
    registerGenerator("test_block", fn2);
    expect(getGenerator("test_block")).toBe(fn2);
  });

  it("should list all registered types", () => {
    registerGenerator("block_a", () => "");
    registerGenerator("block_b", () => "");
    registerGenerator("block_c", () => "");
    const types = getAllRegisteredTypes();
    expect(types).toContain("block_a");
    expect(types).toContain("block_b");
    expect(types).toContain("block_c");
    expect(types.length).toBeGreaterThanOrEqual(3);
  });

  it("should clear all registrations", () => {
    registerGenerator("block_a", () => "");
    registerGenerator("block_b", () => "");
    clearRegistry();
    expect(getAllRegisteredTypes().length).toBe(0);
    expect(hasGenerator("block_a")).toBe(false);
  });

  it("should invoke generator with correct arguments", () => {
    let capturedBlock: ArduinoBlock | undefined;
    let capturedCtx: GenerationContext | undefined;

    registerGenerator("capture_block", (block, ctx) => {
      capturedBlock = block;
      capturedCtx = ctx;
      return "captured";
    });

    const mockBlock: ArduinoBlock = { type: "capture_block", fields: { PIN: "13" } };
    const ctx = new GenerationContext();
    const genFn = getGenerator("capture_block")!;
    const generateSubBlocks = () => "";

    const result = genFn(mockBlock, ctx, generateSubBlocks);
    expect(capturedBlock).toBe(mockBlock);
    expect(capturedCtx).toBe(ctx);
    expect(result).toBe("captured");
  });
});
