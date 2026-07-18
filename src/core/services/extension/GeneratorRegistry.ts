/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ExtensionBlock } from "../../types/extension";

class GeneratorRegistryClass {
  private generators = new Map<string, (block: any, javascriptGenerator: any) => [string, number] | string>();

  register(blocks: ExtensionBlock[]): void {
    for (const block of blocks) {
      this.generators.set(block.type, block.generator);
    }
  }

  registerWithGenerator(javascriptGenerator: any): void {
    for (const [type, gen] of this.generators) {
      javascriptGenerator.forBlock[type] = gen;
    }
  }

  getGenerator(type: string): ((block: any, javascriptGenerator: any) => [string, number] | string) | undefined {
    return this.generators.get(type);
  }

  clear(): void {
    this.generators.clear();
  }
}

export const GeneratorRegistry = new GeneratorRegistryClass();
