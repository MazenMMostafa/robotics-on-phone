/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ExtensionRegistryEntry, ExtensionComponentDefinition, ExtensionExample, ToolboxCategoryConfig } from "../../types/extension";
import { ExtensionLoader } from "./ExtensionLoader";
import { BlockRegistry } from "./BlockRegistry";
import { GeneratorRegistry } from "./GeneratorRegistry";
import { CategoryRegistry } from "./CategoryRegistry";

class ExtensionManagerClass {
  private entries: ExtensionRegistryEntry[] = [];
  private components = new Map<string, ExtensionComponentDefinition>();
  private examples: ExtensionExample[] = [];
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.entries = ExtensionLoader.discoverAll();

    for (const entry of this.entries) {
      const issues = ExtensionLoader.checkDependencies(entry, this.entries);
      if (issues.length > 0) {
        console.warn("[ExtensionManager] Dependency issues:", issues);
        entry.loaded = false;
        entry.error = issues.join("; ");
        continue;
      }
      this.registerExtension(entry);
    }
  }

  private registerExtension(entry: ExtensionRegistryEntry): void {
    const blocks = entry.module.blocks?.() ?? [];
    const categories = entry.module.categories?.() ?? [];
    const comps = entry.module.components?.() ?? [];
    const exs = entry.module.examples?.() ?? [];

    BlockRegistry.register(blocks);
    GeneratorRegistry.register(blocks);
    CategoryRegistry.register(categories);

    for (const comp of comps) {
      this.components.set(comp.id, comp);
    }

    for (const ex of exs) {
      ex.extensionId = entry.manifest.id;
      this.examples.push(ex);
    }
  }

  registerBlocksWithBlockly(Blockly: any): void {
    BlockRegistry.registerWithBlockly(Blockly);
  }

  registerGenerators(javascriptGenerator: any): void {
    GeneratorRegistry.registerWithGenerator(javascriptGenerator);
  }

  getToolboxCategories(): ToolboxCategoryConfig[] {
    return CategoryRegistry.getCategories();
  }

  getComponents(): ExtensionComponentDefinition[] {
    return Array.from(this.components.values());
  }

  getComponent(id: string): ExtensionComponentDefinition | undefined {
    return this.components.get(id);
  }

  getExamples(): ExtensionExample[] {
    return this.examples;
  }

  getExamplesForExtension(extensionId: string): ExtensionExample[] {
    return this.examples.filter((e) => e.extensionId === extensionId);
  }

  getExtensions(): ExtensionRegistryEntry[] {
    return this.entries;
  }

  getExtension(id: string): ExtensionRegistryEntry | undefined {
    return this.entries.find((e) => e.manifest.id === id);
  }
}

export const ExtensionManager = new ExtensionManagerClass();
