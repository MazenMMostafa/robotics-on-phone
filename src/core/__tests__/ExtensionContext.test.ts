import { describe, it, expect, beforeEach } from "vitest";
import { ExtensionContext } from "../services/extension/ExtensionContext";
import { BlockRegistry } from "../services/extension/BlockRegistry";
import { CategoryRegistry } from "../services/extension/CategoryRegistry";
import { ComponentRegistry } from "../services/extension/ComponentRegistry";
import { LibraryRegistry } from "../services/extension/LibraryRegistry";
import { ExampleRegistry } from "../services/extension/ExampleRegistry";
import { AssetRegistry } from "../services/extension/AssetRegistry";
import { CommandRegistry } from "../services/extension/CommandRegistry";
import { EventBus } from "../services/extension/EventBus";
import type { ExtensionManifest, ExtensionBlock, ToolboxCategoryConfig, ExtensionComponentDefinition, LibraryDefinition, ExtensionExample, CommandDefinition } from "../types/extension";

const testManifest: ExtensionManifest = {
  id: "test-ext",
  name: "Test",
  version: "1.0.0",
  author: "Test",
  description: "Test extension",
  dependencies: { extensions: [], libraries: [], boards: [] },
  supportedBoards: ["uno"],
};

describe("ExtensionContext", () => {
  let ctx: ExtensionContext;

  beforeEach(() => {
    ctx = new ExtensionContext(testManifest);
    BlockRegistry.clear();
    CategoryRegistry.clear();
    ComponentRegistry.clear();
    LibraryRegistry.clear();
    ExampleRegistry.clear();
    AssetRegistry.clear();
    CommandRegistry.clear();
    EventBus.removeAll();
  });

  it("stores manifest and id", () => {
    expect(ctx.id).toBe("test-ext");
    expect(ctx.manifest.id).toBe("test-ext");
  });

  it("registerBlock proxies to BlockRegistry", () => {
    const block: ExtensionBlock = { type: "ext_test", category: "test", init: () => {}, generator: () => ["", 0] };
    ctx.registerBlock(block);
    expect(BlockRegistry.getBlock("ext_test")).toBeDefined();
  });

  it("registerBlocks proxies to BlockRegistry", () => {
    const block: ExtensionBlock = { type: "ext_test", category: "test", init: () => {}, generator: () => ["", 0] };
    ctx.registerBlocks([block]);
    expect(BlockRegistry.getAllBlocks()).toHaveLength(1);
  });

  it("registerCategory proxies to CategoryRegistry", () => {
    const cat: ToolboxCategoryConfig = { id: "test-cat", name: "Test", colour: "#000", blockTypes: ["ext_test"] };
    ctx.registerCategory(cat);
    expect(CategoryRegistry.getCategory("test-cat")).toBeDefined();
  });

  it("registerComponent proxies to ComponentRegistry", () => {
    const comp: ExtensionComponentDefinition = {
      id: "test-comp", displayName: "Test", description: "", category: "test",
      supportedBoards: ["uno"], requiredPins: [], optionalPins: [], libraries: [],
    };
    ctx.registerComponent(comp);
    expect(ComponentRegistry.getComponent("test-comp")).toBeDefined();
  });

  it("registerLibrary proxies to LibraryRegistry", () => {
    const lib: LibraryDefinition = { name: "TestLib", headers: ["<Test.h>"], provides: ["Test"] };
    ctx.registerLibrary(lib);
    expect(LibraryRegistry.hasLibrary("TestLib")).toBe(true);
  });

  it("registerExample sets extensionId", () => {
    const ex: ExtensionExample = {
      id: "ex1", title: "Ex", description: "", code: "", difficulty: "beginner", extensionId: "",
    };
    ctx.registerExample(ex);
    expect(ExampleRegistry.getExamples()).toHaveLength(1);
    expect(ExampleRegistry.getExamples()[0].extensionId).toBe("test-ext");
  });

  it("registerCommand proxies to CommandRegistry", () => {
    const cmd: CommandDefinition = { id: "test.cmd", title: "Cmd", category: "test", execute: () => {} };
    ctx.registerCommand(cmd);
    expect(CommandRegistry.hasCommand("test.cmd")).toBe(true);
  });

  it("registerAsset adds extensionId", () => {
    ctx.registerAsset({ path: "icon.svg", type: "icon", content: "<svg/>" });
    const assets = AssetRegistry.getAssetsForExtension("test-ext");
    expect(assets).toHaveLength(1);
  });

  it("on subscribes to EventBus and disposes on dispose()", () => {
    let called = false;
    ctx.on("test-event", () => { called = true; });
    EventBus.emit("test-event");
    expect(called).toBe(true);
    ctx.dispose();
    called = false;
    EventBus.emit("test-event");
    expect(called).toBe(false);
  });

  it("once subscribes once", () => {
    let count = 0;
    ctx.once("single", () => { count++; });
    EventBus.emit("single");
    EventBus.emit("single");
    expect(count).toBe(1);
  });

  it("emit sends events", () => {
    let received: unknown[] = [];
    EventBus.on("custom", (...args: unknown[]) => { received = args; });
    ctx.emit("custom", "data", 42);
    expect(received).toEqual(["data", 42]);
  });

  it("dispose cleans up all subscriptions", () => {
    let count = 0;
    ctx.on("evt", () => count++);
    ctx.on("evt2", () => count++);
    expect(ctx.subscriptions).toHaveLength(2);
    ctx.dispose();
    expect(ctx.subscriptions).toHaveLength(0);
  });

  it("getUploadStatus returns idle when no container", () => {
    expect(ctx.getUploadStatus()).toBe("idle");
  });

  it("getUploadProgress returns null when no container", () => {
    expect(ctx.getUploadProgress()).toBeNull();
  });

  it("hasQueuedUploads returns false when no container", () => {
    expect(ctx.hasQueuedUploads()).toBe(false);
  });

  it("getBuildStatus returns idle when no container", () => {
    expect(ctx.getBuildStatus()).toBe("idle");
  });

  it("getBuildProgress returns null when no container", () => {
    expect(ctx.getBuildProgress()).toBeNull();
  });

  it("hasQueuedBuilds returns false when no container", () => {
    expect(ctx.hasQueuedBuilds()).toBe(false);
  });

  it("getCurrentBoardId returns null when no container", () => {
    expect(ctx.getCurrentBoardId()).toBeNull();
  });

  it("getBoardCapabilities returns empty when no container", () => {
    expect(ctx.getBoardCapabilities()).toEqual([]);
  });

  it("isDeviceConnected returns false when no container", () => {
    expect(ctx.isDeviceConnected()).toBe(false);
  });

  it("getGenerationStatus returns idle when no container", () => {
    expect(ctx.getGenerationStatus()).toBe("idle");
  });

  it("getGenerationProgress returns null when no container", () => {
    expect(ctx.getGenerationProgress()).toBeNull();
  });

  it("hasQueuedGenerations returns false when no container", () => {
    expect(ctx.hasQueuedGenerations()).toBe(false);
  });
});
