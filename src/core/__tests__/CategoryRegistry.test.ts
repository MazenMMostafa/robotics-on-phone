import { describe, it, expect, beforeEach } from "vitest";
import { CategoryRegistry } from "../services/extension/CategoryRegistry";
import type { ToolboxCategoryConfig } from "../types/extension";

const catA: ToolboxCategoryConfig = {
  id: "output",
  name: "Output",
  colour: "#FF0000",
  blockTypes: ["ext_block_a"],
};

const catB: ToolboxCategoryConfig = {
  id: "sensors",
  name: "Sensors",
  colour: "#00FF00",
  blockTypes: ["ext_sensor"],
};

const catAMerge: ToolboxCategoryConfig = {
  id: "output",
  name: "Output",
  colour: "#FF0000",
  blockTypes: ["ext_block_b"],
};

describe("CategoryRegistry", () => {
  beforeEach(() => {
    CategoryRegistry.clear();
  });

  it("registers a category", () => {
    CategoryRegistry.register([catA]);
    const cats = CategoryRegistry.getCategories();
    expect(cats).toHaveLength(1);
    expect(cats[0].id).toBe("output");
  });

  it("merges categories with same id", () => {
    CategoryRegistry.register([catA]);
    CategoryRegistry.register([catAMerge]);
    const cats = CategoryRegistry.getCategories();
    expect(cats).toHaveLength(1);
    expect(cats[0].blockTypes).toContain("ext_block_a");
    expect(cats[0].blockTypes).toContain("ext_block_b");
    expect(cats[0].blockTypes).toHaveLength(2);
  });

  it("does not duplicate block types on merge", () => {
    CategoryRegistry.register([catA]);
    CategoryRegistry.register([catA]);
    const cats = CategoryRegistry.getCategories();
    expect(cats[0].blockTypes).toHaveLength(1);
  });

  it("getCategory returns category by id", () => {
    CategoryRegistry.register([catA]);
    const found = CategoryRegistry.getCategory("output");
    expect(found).toBeDefined();
    expect(found!.name).toBe("Output");
  });

  it("getCategory returns undefined for unknown id", () => {
    expect(CategoryRegistry.getCategory("nonexistent")).toBeUndefined();
  });

  it("clear removes all categories", () => {
    CategoryRegistry.register([catA, catB]);
    CategoryRegistry.clear();
    expect(CategoryRegistry.getCategories()).toEqual([]);
  });
});
