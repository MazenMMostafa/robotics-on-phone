import { describe, it, expect, beforeEach } from "vitest";
import { ComponentRegistry } from "../services/extension/ComponentRegistry";
import type { ExtensionComponentDefinition } from "../types/extension";

const ledComp: ExtensionComponentDefinition = {
  id: "led",
  displayName: "LED",
  description: "Light emitting diode",
  category: "output",
  supportedBoards: ["uno", "nano"],
  requiredPins: [{ key: "PIN", label: "Anode pin", type: "digital" }],
  optionalPins: [],
  libraries: [],
};

const servoComp: ExtensionComponentDefinition = {
  id: "servo",
  displayName: "Servo",
  description: "Servo motor",
  category: "actuators",
  supportedBoards: ["uno"],
  requiredPins: [{ key: "signal", label: "Signal", type: "pwm" }],
  optionalPins: [],
  libraries: ["Servo.h"],
};

describe("ComponentRegistry", () => {
  beforeEach(() => {
    ComponentRegistry.clear();
  });

  it("registers a single component", () => {
    ComponentRegistry.register(ledComp);
    expect(ComponentRegistry.getComponent("led")).toBeDefined();
  });

  it("registers multiple components", () => {
    ComponentRegistry.registerMany([ledComp, servoComp]);
    expect(ComponentRegistry.getAllComponents()).toHaveLength(2);
  });

  it("overwrites duplicate id", () => {
    ComponentRegistry.register(ledComp);
    const updated = { ...ledComp, displayName: "LED v2" };
    ComponentRegistry.register(updated);
    expect(ComponentRegistry.getComponent("led")!.displayName).toBe("LED v2");
  });

  it("unregister removes component", () => {
    ComponentRegistry.register(ledComp);
    ComponentRegistry.unregister("led");
    expect(ComponentRegistry.getComponent("led")).toBeUndefined();
  });

  it("getComponentsByCategory filters correctly", () => {
    ComponentRegistry.registerMany([ledComp, servoComp]);
    const outputs = ComponentRegistry.getComponentsByCategory("output");
    expect(outputs).toHaveLength(1);
    expect(outputs[0].id).toBe("led");
  });

  it("getComponentsForBoard filters correctly", () => {
    ComponentRegistry.registerMany([ledComp, servoComp]);
    const uno = ComponentRegistry.getComponentsForBoard("uno");
    expect(uno).toHaveLength(2);
    const nano = ComponentRegistry.getComponentsForBoard("nano");
    expect(nano).toHaveLength(1);
  });

  it("getCategories returns unique categories", () => {
    ComponentRegistry.registerMany([ledComp, servoComp]);
    const cats = ComponentRegistry.getCategories();
    expect(cats).toContain("output");
    expect(cats).toContain("actuators");
    expect(cats).toHaveLength(2);
  });

  it("getAllComponents returns empty after clear", () => {
    ComponentRegistry.register(ledComp);
    ComponentRegistry.clear();
    expect(ComponentRegistry.getAllComponents()).toEqual([]);
  });
});
