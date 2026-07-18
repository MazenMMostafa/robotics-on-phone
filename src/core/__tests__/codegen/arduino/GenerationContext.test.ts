import { describe, it, expect } from "vitest";
import { GenerationContext } from "../../../services/codegen/arduino/GenerationContext";

describe("GenerationContext", () => {
  it("should start with default state", () => {
    const ctx = new GenerationContext();
    expect(ctx.indentLevel).toBe(0);
    expect(ctx.indent).toBe("");
    expect(ctx.variables.size).toBe(0);
    expect(ctx.includes.size).toBe(0);
    expect(ctx.usedPins.size).toBe(0);
  });

  it("should manage indentation", () => {
    const ctx = new GenerationContext();
    expect(ctx.indent).toBe("");
    ctx.pushIndent();
    expect(ctx.indentLevel).toBe(1);
    expect(ctx.indent).toBe("  ");
    ctx.pushIndent();
    expect(ctx.indent).toBe("    ");
    ctx.popIndent();
    expect(ctx.indent).toBe("  ");
    ctx.popIndent();
    expect(ctx.indent).toBe("");
    ctx.popIndent();
    expect(ctx.indent).toBe("");
  });

  it("should add and check variables", () => {
    const ctx = new GenerationContext();
    expect(ctx.hasVariable("ledPin")).toBe(false);
    ctx.addVariable("ledPin");
    expect(ctx.hasVariable("ledPin")).toBe(true);
    ctx.addVariable("ledPin");
    expect(ctx.hasVariable("ledPin")).toBe(true);
  });

  it("should set variable value for existing variable", () => {
    const ctx = new GenerationContext();
    ctx.addVariable("counter");
    ctx.setVariableValue("counter", "42");
    const globals = ctx.getGlobalVariables();
    expect(globals).toContain("int counter = 42;");
  });

  it("should set variable value for non-existent variable", () => {
    const ctx = new GenerationContext();
    ctx.setVariableValue("autoVar", "5");
    expect(ctx.hasVariable("autoVar")).toBe(false);
    const globals = ctx.getGlobalVariables();
    expect(globals).not.toContain("autoVar");
  });

  it("should manage includes", () => {
    const ctx = new GenerationContext();
    ctx.addInclude("Arduino.h");
    ctx.addInclude("SoftwareSerial.h");
    expect(ctx.includes.size).toBe(2);
  });

  it("should deduplicate includes", () => {
    const ctx = new GenerationContext();
    ctx.addInclude("Arduino.h");
    ctx.addInclude("Arduino.h");
    expect(ctx.includes.size).toBe(1);
  });

  it("should track used pins", () => {
    const ctx = new GenerationContext();
    ctx.addUsedPin(13);
    ctx.addUsedPin(9);
    ctx.addUsedPin(13);
    expect(ctx.usedPins.size).toBe(2);
    expect(ctx.usedPins.has(13)).toBe(true);
    expect(ctx.usedPins.has(9)).toBe(true);
  });

  it("should generate includes code for plain headers", () => {
    const ctx = new GenerationContext();
    ctx.addInclude("Arduino.h");
    const code = ctx.getIncludesCode();
    expect(code).toBe("#include <Arduino.h>");
  });

  it("should generate includes code for angled headers", () => {
    const ctx = new GenerationContext();
    ctx.addInclude("<Arduino.h>");
    const code = ctx.getIncludesCode();
    expect(code).toBe("#include <Arduino.h>");
  });

  it("should generate includes code for headers with angle bracket suffix", () => {
    const ctx = new GenerationContext();
    ctx.addInclude("Arduino.h>");
    const code = ctx.getIncludesCode();
    expect(code).toBe("#include Arduino.h>");
  });

  it("should generate empty includes code when no includes", () => {
    const ctx = new GenerationContext();
    expect(ctx.getIncludesCode()).toBe("");
  });

  it("should generate global variables code", () => {
    const ctx = new GenerationContext();
    ctx.addVariable("ledPin");
    ctx.addVariable("sensorValue", "int");
    const globals = ctx.getGlobalVariables();
    expect(globals).toContain("int ledPin = 0;");
    expect(globals).toContain("int sensorValue = 0;");
  });

  it("should generate empty globals when no variables", () => {
    const ctx = new GenerationContext();
    expect(ctx.getGlobalVariables()).toBe("");
  });

  it("should reset state", () => {
    const ctx = new GenerationContext();
    ctx.addVariable("ledPin");
    ctx.addInclude("Arduino.h");
    ctx.addUsedPin(13);
    ctx.pushIndent();
    ctx.reset();
    expect(ctx.variables.size).toBe(0);
    expect(ctx.includes.size).toBe(0);
    expect(ctx.usedPins.size).toBe(0);
    expect(ctx.indentLevel).toBe(0);
  });
});
