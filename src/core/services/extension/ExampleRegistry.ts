import type { ExtensionExample } from "../../types/extension";

class ExampleRegistryClass {
  private examples: ExtensionExample[] = [];

  register(example: ExtensionExample): void {
    this.examples.push(example);
  }

  registerMany(examples: ExtensionExample[]): void {
    for (const ex of examples) {
      this.examples.push(ex);
    }
  }

  unregister(id: string): void {
    this.examples = this.examples.filter((e) => e.id !== id);
  }

  getExamples(): ExtensionExample[] {
    return this.examples;
  }

  getExample(id: string): ExtensionExample | undefined {
    return this.examples.find((e) => e.id === id);
  }

  getExamplesByDifficulty(difficulty: "beginner" | "intermediate" | "advanced"): ExtensionExample[] {
    return this.examples.filter((e) => e.difficulty === difficulty);
  }

  getExamplesByBoard(boardId: string): ExtensionExample[] {
    return this.examples.filter((e) => !e.board || e.board === boardId);
  }

  getExamplesByTag(tag: string): ExtensionExample[] {
    return this.examples.filter((e) => e.tags?.includes(tag));
  }

  getExamplesByExtension(extensionId: string): ExtensionExample[] {
    return this.examples.filter((e) => e.extensionId === extensionId);
  }

  clear(): void {
    this.examples = [];
  }
}

export const ExampleRegistry = new ExampleRegistryClass();
