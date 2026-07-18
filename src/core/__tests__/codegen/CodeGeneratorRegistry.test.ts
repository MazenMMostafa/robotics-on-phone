import { describe, it, expect, beforeEach } from "vitest";
import { CodeGeneratorRegistry } from "../../services/codegen/CodeGeneratorRegistry";
import type { CodeGenerator, GenerationOptions, GenerationProgress, GenerationResult, ValidationResult } from "../../types/codegen/generator";

function createMockGenerator(id: string, name: string, languages: string[], frameworks?: string[]): CodeGenerator {
  return {
    id,
    name,
    version: "1.0.0",
    supportedLanguages: languages,
    supportedFrameworks: frameworks ?? languages,
    supports(language: string, framework: string) {
      return languages.includes(language) && (frameworks ?? languages).includes(framework);
    },
    async prepare(_options: GenerationOptions) {},
    async generate(_options: GenerationOptions, _onProgress?: (p: GenerationProgress) => void): Promise<GenerationResult> {
      return { status: "success", stage: "done", message: "ok", duration: 100, timestamp: Date.now() };
    },
    async validate(_options: GenerationOptions): Promise<ValidationResult> {
      return { valid: true, issues: [] };
    },
    async cleanup(_options: GenerationOptions) {},
  };
}

describe("CodeGeneratorRegistry", () => {
  let registry: CodeGeneratorRegistry;

  beforeEach(() => {
    registry = new CodeGeneratorRegistry();
  });

  it("starts empty", () => {
    expect(registry.count()).toBe(0);
    expect(registry.getAll()).toEqual([]);
  });

  it("registers a single generator", () => {
    const g = createMockGenerator("test-1", "Test", ["arduino-cpp"]);
    registry.register(g);
    expect(registry.count()).toBe(1);
    expect(registry.getById("test-1")).toBe(g);
  });

  it("registers multiple generators", () => {
    const g1 = createMockGenerator("g1", "G1", ["arduino-cpp"]);
    const g2 = createMockGenerator("g2", "G2", ["micropython"]);
    registry.registerMany([g1, g2]);
    expect(registry.count()).toBe(2);
  });

  it("overwrites generator with same id", () => {
    const g1 = createMockGenerator("same-id", "Original", ["arduino-cpp"]);
    const g2 = createMockGenerator("same-id", "Updated", ["arduino-cpp"]);
    registry.register(g1);
    registry.register(g2);
    expect(registry.count()).toBe(1);
    expect(registry.getById("same-id")?.name).toBe("Updated");
  });

  it("finds generator for language", () => {
    const g1 = createMockGenerator("arduino-gen", "Arduino", ["arduino-cpp"]);
    const g2 = createMockGenerator("mp-gen", "MicroPython", ["micropython"]);
    registry.registerMany([g1, g2]);
    expect(registry.findForLanguage("arduino-cpp")).toBe(g1);
    expect(registry.findForLanguage("micropython")).toBe(g2);
  });

  it("finds generator for language and framework", () => {
    const g = createMockGenerator("arduino-gen", "Arduino", ["arduino-cpp"], ["arduino"]);
    registry.register(g);
    expect(registry.findForLanguage("arduino-cpp", "arduino")).toBe(g);
    expect(registry.findForLanguage("arduino-cpp", "esp-idf")).toBeUndefined();
  });

  it("returns undefined if no generator supports language", () => {
    const g = createMockGenerator("arduino-gen", "Arduino", ["arduino-cpp"]);
    registry.register(g);
    expect(registry.findForLanguage("micropython")).toBeUndefined();
  });

  it("returns all generators for a language", () => {
    const g1 = createMockGenerator("g1", "G1", ["arduino-cpp"]);
    const g2 = createMockGenerator("g2", "G2", ["arduino-cpp", "micropython"]);
    registry.registerMany([g1, g2]);
    const all = registry.findAllForLanguage("arduino-cpp");
    expect(all).toHaveLength(2);
  });

  it("prioritizes by generator id pattern", () => {
    const low = createMockGenerator("custom-gen", "Custom", ["arduino-cpp"]);
    const high = createMockGenerator("arduino-cpp-v1", "Arduino", ["arduino-cpp"]);
    registry.registerMany([low, high]);
    expect(registry.findForLanguage("arduino-cpp")?.id).toBe("arduino-cpp-v1");
  });

  it("removes a generator", () => {
    const g = createMockGenerator("test", "Test", ["arduino-cpp"]);
    registry.register(g);
    registry.remove("test");
    expect(registry.count()).toBe(0);
  });

  it("clears all generators", () => {
    registry.registerMany([
      createMockGenerator("a", "A", ["arduino-cpp"]),
      createMockGenerator("b", "B", ["micropython"]),
    ]);
    registry.clear();
    expect(registry.count()).toBe(0);
  });

  it("covers all priority levels", () => {
    const ids = ["arduino-cpp-v2", "esp-idf-cpp-v1", "micropython-v3", "circuitpython-v1", "python-v2", "javascript-v1", "custom-gen", "unknown-v1"];
    for (const id of ids) {
      registry.register(createMockGenerator(id, id, ["lang"]));
    }
    const all = registry.findAllForLanguage("lang");
    expect(all[0]?.id).toBe("arduino-cpp-v2");
    expect(all[1]?.id).toBe("esp-idf-cpp-v1");
    expect(all[2]?.id).toBe("micropython-v3");
    expect(all[3]?.id).toBe("circuitpython-v1");
    expect(all[4]?.id).toBe("python-v2");
    expect(all[5]?.id).toBe("javascript-v1");
    expect(all[6]?.id).toBe("custom-gen");
    expect(all[7]?.id).toBe("unknown-v1");
  });
});
