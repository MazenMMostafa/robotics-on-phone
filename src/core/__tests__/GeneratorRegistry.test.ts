import { describe, it, expect, beforeEach } from "vitest";
import { GeneratorRegistry } from "../services/extension/GeneratorRegistry";
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ExtensionBlock } from "../types/extension";

const mockGen: ExtensionBlock["generator"] = () => ["result;\n", 0];

const blockWithGen: ExtensionBlock = {
  type: "test_gen",
  category: "test",
  init: () => {},
  generator: mockGen,
};

describe("GeneratorRegistry", () => {
  beforeEach(() => {
    GeneratorRegistry.clear();
  });

  it("registers generators from blocks", () => {
    GeneratorRegistry.register([blockWithGen]);
    const gen = GeneratorRegistry.getGenerator("test_gen");
    expect(gen).toBe(mockGen);
  });

  it("getGenerator returns undefined for unknown type", () => {
    expect(GeneratorRegistry.getGenerator("nonexistent")).toBeUndefined();
  });

  it("registerWithGenerator sets forBlock on the target", () => {
    const mockGenObj = { forBlock: {} } as any;
    GeneratorRegistry.register([blockWithGen]);
    GeneratorRegistry.registerWithGenerator(mockGenObj);
    expect(mockGenObj.forBlock.test_gen).toBe(mockGen);
  });

  it("clear removes all generators", () => {
    GeneratorRegistry.register([blockWithGen]);
    GeneratorRegistry.clear();
    expect(GeneratorRegistry.getGenerator("test_gen")).toBeUndefined();
  });
});
