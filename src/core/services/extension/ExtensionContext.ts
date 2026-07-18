/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ExtensionManifest,
  ExtensionBlock,
  ToolboxCategoryConfig,
  ExtensionComponentDefinition,
  ExtensionExample,
  LibraryDefinition,
  CommandDefinition,
  AssetDefinition,
  Disposable,
} from "../../types/extension";

import { EventBus } from "./EventBus";
import { BlockRegistry } from "./BlockRegistry";
import { GeneratorRegistry } from "./GeneratorRegistry";
import { CategoryRegistry } from "./CategoryRegistry";
import { ComponentRegistry } from "./ComponentRegistry";
import { ValidationRegistry } from "./ValidationRegistry";
import type { ValidationRule } from "./ValidationRegistry";
import { LibraryRegistry } from "./LibraryRegistry";
import { ExampleRegistry } from "./ExampleRegistry";
import { AssetRegistry } from "./AssetRegistry";
import { CommandRegistry } from "./CommandRegistry";
import { container } from "../../di/ServiceContainer";

export class ExtensionContext {
  readonly id: string;
  readonly manifest: ExtensionManifest;
  readonly subscriptions: Disposable[] = [];

  constructor(manifest: ExtensionManifest) {
    this.id = manifest.id;
    this.manifest = manifest;
  }

  // ── Blocks ──────────────────────────────────────────────
  registerBlock(block: ExtensionBlock): void {
    BlockRegistry.register([block]);
    GeneratorRegistry.register([block]);
  }

  registerBlocks(blocks: ExtensionBlock[]): void {
    BlockRegistry.register(blocks);
    GeneratorRegistry.register(blocks);
  }

  // ── Toolbox Categories ──────────────────────────────────
  registerCategory(category: ToolboxCategoryConfig): void {
    CategoryRegistry.register([category]);
  }

  registerCategories(categories: ToolboxCategoryConfig[]): void {
    CategoryRegistry.register(categories);
  }

  // ── Components ──────────────────────────────────────────
  registerComponent(component: ExtensionComponentDefinition): void {
    ComponentRegistry.register(component);
  }

  registerComponents(components: ExtensionComponentDefinition[]): void {
    ComponentRegistry.registerMany(components);
  }

  // ── Validation ──────────────────────────────────────────
  registerValidator(componentId: string, rule: ValidationRule): void {
    ValidationRegistry.register(componentId, [rule]);
  }

  registerValidators(componentId: string, rules: ValidationRule[]): void {
    ValidationRegistry.register(componentId, rules);
  }

  // ── Libraries ───────────────────────────────────────────
  registerLibrary(library: LibraryDefinition): void {
    LibraryRegistry.register(library);
  }

  registerLibraries(libraries: LibraryDefinition[]): void {
    LibraryRegistry.registerMany(libraries);
  }

  // ── Examples ────────────────────────────────────────────
  registerExample(example: ExtensionExample): void {
    example.extensionId = this.id;
    ExampleRegistry.register(example);
  }

  registerExamples(examples: ExtensionExample[]): void {
    for (const ex of examples) {
      ex.extensionId = this.id;
    }
    ExampleRegistry.registerMany(examples);
  }

  // ── Assets ──────────────────────────────────────────────
  registerAsset(asset: Omit<AssetDefinition, "extensionId">): void {
    AssetRegistry.register({ ...asset, extensionId: this.id });
  }

  registerAssets(assets: Omit<AssetDefinition, "extensionId">[]): void {
    for (const asset of assets) {
      AssetRegistry.register({ ...asset, extensionId: this.id });
    }
  }

  // ── Commands ────────────────────────────────────────────
  registerCommand(command: CommandDefinition): void {
    CommandRegistry.register(command);
  }

  registerCommands(commands: CommandDefinition[]): void {
    CommandRegistry.registerMany(commands);
  }

  // ── EventBus ────────────────────────────────────────────
  on(event: string, handler: (...args: any[]) => void): void {
    const dispose = EventBus.on(event, handler);
    this.subscriptions.push({ dispose });
  }

  once(event: string, handler: (...args: any[]) => void): void {
    const dispose = EventBus.once(event, handler);
    this.subscriptions.push({ dispose });
  }

  emit(event: string, ...args: any[]): void {
    EventBus.emit(event, ...args);
  }

  // ── Hardware Queries ────────────────────────────────────
  getCurrentBoardId(): string | null {
    try {
      const hm = container.get<any>("hardwareManager");
      return hm.getSelectedBoardId();
    } catch {
      return null;
    }
  }

  getBoardCapabilities(): string[] {
    try {
      const hm = container.get<any>("hardwareManager");
      const boardId = hm.getSelectedBoardId();
      if (!boardId) return [];
      return hm.getBoardCapabilities(boardId);
    } catch {
      return [];
    }
  }

  isDeviceConnected(): boolean {
    try {
      const hm = container.get<any>("hardwareManager");
      return hm.isConnected();
    } catch {
      return false;
    }
  }

  // ── Upload Status (Read-only) ───────────────────────────
  getUploadStatus(): string {
    try {
      const um = container.get<any>("uploadManager");
      return um.getStatus();
    } catch {
      return "idle";
    }
  }

  getUploadProgress(): { stage: string; percent: number; messages: string[] } | null {
    try {
      const um = container.get<any>("uploadManager");
      const progress = um.getCurrentProgress();
      return {
        stage: progress.stage,
        percent: progress.percent,
        messages: progress.messages,
      };
    } catch {
      return null;
    }
  }

  hasQueuedUploads(): boolean {
    try {
      const um = container.get<any>("uploadManager");
      return um.hasQueuedUploads();
    } catch {
      return false;
    }
  }

  // ── Lifecycle ───────────────────────────────────────────
  dispose(): void {
    for (const sub of this.subscriptions) {
      try { sub.dispose(); } catch { /* noop */ }
    }
    this.subscriptions.length = 0;
  }
}
