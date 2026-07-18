/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ExtensionRegistryEntry, ExtensionComponentDefinition, ExtensionExample, ToolboxCategoryConfig } from "../../types/extension";
import { ExtensionLoader } from "./ExtensionLoader";
import { EventBus } from "./EventBus";
import { BlockRegistry } from "./BlockRegistry";
import { GeneratorRegistry } from "./GeneratorRegistry";
import { CategoryRegistry } from "./CategoryRegistry";
import { ComponentRegistry } from "./ComponentRegistry";
import { LibraryRegistry } from "./LibraryRegistry";
import { ExampleRegistry } from "./ExampleRegistry";
import { AssetRegistry } from "./AssetRegistry";
import { CommandRegistry } from "./CommandRegistry";
import { ExtensionContext } from "./ExtensionContext";

class ExtensionManagerClass {
  private entries: ExtensionRegistryEntry[] = [];
  private contexts = new Map<string, ExtensionContext>();
  private initialized = false;

  // ── Lifecycle ───────────────────────────────────────────

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    EventBus.emit("lifecycle:init");
    this.discover();
    this.load();
    this.activate();
    EventBus.emit("lifecycle:ready");
  }

  private discover(): void {
    EventBus.emit("lifecycle:discover");
    this.entries = ExtensionLoader.discoverAll();
    for (const entry of this.entries) {
      entry.lifecycleState = "discovered";
    }
  }

  private load(): void {
    EventBus.emit("lifecycle:load");

    for (const entry of this.entries) {
      entry.lifecycleState = "loaded";

      // Check API version compatibility
      const versionIssues = ExtensionLoader.checkApiVersion(entry.manifest);
      if (versionIssues.length > 0) {
        console.warn("[ExtensionManager] Version issues:", versionIssues);
        entry.loaded = false;
        entry.error = versionIssues.join("; ");
        entry.lifecycleState = "error";
        continue;
      }

      // Check dependencies
      const depIssues = ExtensionLoader.checkDependencies(entry, this.entries);
      if (depIssues.length > 0) {
        console.warn("[ExtensionManager] Dependency issues:", depIssues);
        entry.loaded = false;
        entry.error = depIssues.join("; ");
        entry.lifecycleState = "error";
        continue;
      }

      // If extension uses old format (blocks()/categories() functions),
      // register them immediately during load phase
      if (entry.module.blocks || entry.module.categories || entry.module.components || entry.module.examples) {
        this.registerLegacy(entry);
        entry.lifecycleState = "active";
      }
    }
  }

  private activate(): void {
    EventBus.emit("lifecycle:activate");

    for (const entry of this.entries) {
      if (!entry.loaded) continue;
      if (!entry.module.activate) continue;
      if (entry.lifecycleState === "active") continue; // legacy already handled

      entry.lifecycleState = "activating";

      try {
        const context = new ExtensionContext(entry.manifest);
        const result = entry.module.activate(context);
        if (result instanceof Promise) {
          result.catch((err) => {
            console.error(`[ExtensionManager] Extension "${entry.manifest.id}" activation failed:`, err);
            entry.loaded = false;
            entry.error = String(err);
            entry.lifecycleState = "error";
          });
        }
        this.contexts.set(entry.manifest.id, context);
        entry.lifecycleState = "active";
        EventBus.emit(`extension:activated:${entry.manifest.id}`, entry);
        EventBus.emit("extension:activated", entry);
      } catch (err) {
        console.error(`[ExtensionManager] Extension "${entry.manifest.id}" activation failed:`, err);
        entry.loaded = false;
        entry.error = String(err);
        entry.lifecycleState = "error";
      }
    }
  }

  private registerLegacy(entry: ExtensionRegistryEntry): void {
    const blocks = entry.module.blocks?.() ?? [];
    const categories = entry.module.categories?.() ?? [];
    const comps = entry.module.components?.() ?? [];
    const exs = entry.module.examples?.() ?? [];

    BlockRegistry.register(blocks);
    GeneratorRegistry.register(blocks);
    CategoryRegistry.register(categories);

    for (const comp of comps) {
      ComponentRegistry.register(comp);
    }

    for (const ex of exs) {
      ex.extensionId = entry.manifest.id;
      ExampleRegistry.register(ex);
    }

    EventBus.emit(`extension:loaded:${entry.manifest.id}`, entry);
    EventBus.emit("extension:loaded", entry);
  }

  // ── Public API (backward compatible) ────────────────────

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
    return ComponentRegistry.getAllComponents();
  }

  getComponent(id: string): ExtensionComponentDefinition | undefined {
    return ComponentRegistry.getComponent(id);
  }

  getExamples(): ExtensionExample[] {
    return ExampleRegistry.getExamples();
  }

  getExamplesForExtension(extensionId: string): ExtensionExample[] {
    return ExampleRegistry.getExamplesByExtension(extensionId);
  }

  getExtensions(): ExtensionRegistryEntry[] {
    return this.entries;
  }

  getExtension(id: string): ExtensionRegistryEntry | undefined {
    return this.entries.find((e) => e.manifest.id === id);
  }

  // ── Lifecycle control (future use) ──────────────────────

  deactivateExtension(id: string): void {
    const entry = this.entries.find((e) => e.manifest.id === id);
    if (!entry || entry.lifecycleState !== "active") return;

    entry.lifecycleState = "deactivating";

    if (entry.module.deactivate) {
      try {
        entry.module.deactivate();
      } catch (err) {
        console.warn(`[ExtensionManager] Extension "${id}" deactivation error:`, err);
      }
    }

    const context = this.contexts.get(id);
    if (context) {
      context.dispose();
      this.contexts.delete(id);
    }

    // Unregister components, libraries, examples, assets from this extension
    AssetRegistry.unregisterAllForExtension(id);

    entry.lifecycleState = "inactive";
    EventBus.emit(`extension:deactivated:${id}`, entry);
    EventBus.emit("extension:deactivated", entry);
  }

  dispose(): void {
    for (const entry of this.entries) {
      this.deactivateExtension(entry.manifest.id);
    }

    BlockRegistry.clear();
    GeneratorRegistry.clear();
    CategoryRegistry.clear();
    ComponentRegistry.clear();
    LibraryRegistry.clear();
    ExampleRegistry.clear();
    AssetRegistry.clear();
    CommandRegistry.clear();
    EventBus.removeAll();

    this.entries = [];
    this.contexts.clear();
    this.initialized = false;
  }
}

export const ExtensionManager = new ExtensionManagerClass();
