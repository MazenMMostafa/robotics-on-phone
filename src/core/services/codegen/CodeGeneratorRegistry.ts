import type { CodeGenerator } from "../../types/codegen/generator";

export class CodeGeneratorRegistry {
  private generators: CodeGenerator[] = [];

  register(generator: CodeGenerator): void {
    const existing = this.generators.findIndex((g) => g.id === generator.id);
    if (existing >= 0) {
      this.generators[existing] = generator;
    } else {
      this.generators.push(generator);
    }
  }

  registerMany(generators: CodeGenerator[]): void {
    for (const g of generators) {
      this.register(g);
    }
  }

  findForLanguage(language: string, framework?: string): CodeGenerator | undefined {
    const matching = this.generators.filter((g) => {
      if (!g.supportedLanguages.includes(language)) return false;
      if (framework && !g.supportedFrameworks.includes(framework)) return false;
      return true;
    });
    if (matching.length === 0) return undefined;
    matching.sort((a, b) => this.getPriority(b.id) - this.getPriority(a.id));
    return matching[0];
  }

  findAllForLanguage(language: string): CodeGenerator[] {
    return this.generators
      .filter((g) => g.supportedLanguages.includes(language))
      .sort((a, b) => this.getPriority(b.id) - this.getPriority(a.id));
  }

  getById(generatorId: string): CodeGenerator | undefined {
    return this.generators.find((g) => g.id === generatorId);
  }

  getAll(): ReadonlyArray<CodeGenerator> {
    return this.generators;
  }

  remove(generatorId: string): void {
    this.generators = this.generators.filter((g) => g.id !== generatorId);
  }

  clear(): void {
    this.generators = [];
  }

  count(): number {
    return this.generators.length;
  }

  private getPriority(generatorId: string): number {
    if (generatorId.startsWith("arduino-cpp")) return 100;
    if (generatorId.startsWith("esp-idf-cpp")) return 90;
    if (generatorId.startsWith("micropython")) return 80;
    if (generatorId.startsWith("circuitpython")) return 70;
    if (generatorId.startsWith("python")) return 60;
    if (generatorId.startsWith("javascript")) return 50;
    if (generatorId.startsWith("custom")) return 40;
    return 0;
  }
}
