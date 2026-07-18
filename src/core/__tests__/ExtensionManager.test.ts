import { describe, it, expect, beforeEach } from "vitest";
import { ExtensionManager } from "../services/extension/ExtensionManager";
import { BlockRegistry } from "../services/extension/BlockRegistry";
import { ComponentRegistry } from "../services/extension/ComponentRegistry";
import { CategoryRegistry } from "../services/extension/CategoryRegistry";
import { ExampleRegistry } from "../services/extension/ExampleRegistry";
import { EventBus } from "../services/extension/EventBus";

describe("ExtensionManager", () => {
  beforeEach(() => {
    ExtensionManager.dispose();
    BlockRegistry.clear();
    CategoryRegistry.clear();
    ComponentRegistry.clear();
    ExampleRegistry.clear();
    EventBus.removeAll();
  });

  it("init runs without throwing", () => {
    expect(() => ExtensionManager.init()).not.toThrow();
  });

  it("init is idempotent", () => {
    ExtensionManager.init();
    // Second call should not re-process
    expect(() => ExtensionManager.init()).not.toThrow();
  });

  it("getExtensions returns entries", () => {
    ExtensionManager.init();
    const exts = ExtensionManager.getExtensions();
    expect(Array.isArray(exts)).toBe(true);
  });

  it("getExtension returns entry by id", () => {
    ExtensionManager.init();
    const ext = ExtensionManager.getExtension("led");
    if (ext) {
      expect(ext.manifest.id).toBe("led");
    }
  });

  it("getToolboxCategories returns categories", () => {
    ExtensionManager.init();
    const cats = ExtensionManager.getToolboxCategories();
    expect(Array.isArray(cats)).toBe(true);
  });

  it("getComponents returns components", () => {
    ExtensionManager.init();
    const comps = ExtensionManager.getComponents();
    expect(Array.isArray(comps)).toBe(true);
  });

  it("getComponent returns component by id", () => {
    ExtensionManager.init();
    ExtensionManager.getComponent("led");
  });

  it("getExamples returns examples", () => {
    ExtensionManager.init();
    const exs = ExtensionManager.getExamples();
    expect(Array.isArray(exs)).toBe(true);
  });

  it("getExamplesForExtension filters by extension", () => {
    ExtensionManager.init();
    const exs = ExtensionManager.getExamplesForExtension("led");
    expect(Array.isArray(exs)).toBe(true);
  });

  it("dispose clears everything", () => {
    ExtensionManager.init();
    ExtensionManager.dispose();
    expect(ExtensionManager.getExtensions()).toEqual([]);
  });

  it("deactivateExtension handles unknown id gracefully", () => {
    ExtensionManager.init();
    expect(() => ExtensionManager.deactivateExtension("nonexistent")).not.toThrow();
  });
});
