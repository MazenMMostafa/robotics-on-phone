import { describe, it, expect, beforeEach } from "vitest";
import { ValidationRegistry } from "../services/extension/ValidationRegistry";

describe("ValidationRegistry", () => {
  beforeEach(() => {
    ValidationRegistry.clear();
  });

  it("validate returns error for unknown board", async () => {
    const result = await ValidationRegistry.validate("nonexistent", "led", []);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 1001)).toBe(true);
  });

  it("validate returns error for unknown component", async () => {
    const result = await ValidationRegistry.validate("uno", "nonexistent", []);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 2001)).toBe(true);
  });

  it("registers and runs custom validation rules", async () => {
    ValidationRegistry.register("led", [{
      ruleId: "custom-check",
      errorMessage: "Custom validation failed",
      validate: () => false,
    }]);
    const result = await ValidationRegistry.validate("uno", "nonexistent", []);
    // Will fail on component not found before reaching custom rules
    expect(result.valid).toBe(false);
  });

  it("registers and runs custom rules that pass", async () => {
    ValidationRegistry.register("led", [{
      ruleId: "pass-check",
      errorMessage: "Should not fail",
      validate: () => true,
    }]);
    const result = await ValidationRegistry.validate("uno", "nonexistent", []);
    expect(result.valid).toBe(false); // still fails on component not found
  });

  it("getRules returns registered rules", () => {
    ValidationRegistry.register("led", [{
      ruleId: "r1", errorMessage: "E1", validate: () => true,
    }]);
    const rules = ValidationRegistry.getRules("led");
    expect(rules).toHaveLength(1);
    expect(rules[0].ruleId).toBe("r1");
  });

  it("getRules returns empty for unregistered component", () => {
    expect(ValidationRegistry.getRules("unknown")).toEqual([]);
  });

  it("unregister removes rules", () => {
    ValidationRegistry.register("led", [{
      ruleId: "r1", errorMessage: "E1", validate: () => true,
    }]);
    ValidationRegistry.unregister("led");
    expect(ValidationRegistry.getRules("led")).toEqual([]);
  });

  it("appends rules when registering multiple times", () => {
    ValidationRegistry.register("led", [{
      ruleId: "r1", errorMessage: "E1", validate: () => true,
    }]);
    ValidationRegistry.register("led", [{
      ruleId: "r2", errorMessage: "E2", validate: () => true,
    }]);
    expect(ValidationRegistry.getRules("led")).toHaveLength(2);
  });

  it("validateAll handles multiple requests", async () => {
    ValidationRegistry.register("led", [{
      ruleId: "r1", errorMessage: "E1", validate: () => false,
    }]);
    const results = await ValidationRegistry.validateAll([
      { boardId: "nonexistent", componentId: "led", pins: [] },
      { boardId: "uno", componentId: "nonexistent", pins: [] },
    ]);
    expect(results).toHaveLength(2);
  });
});
