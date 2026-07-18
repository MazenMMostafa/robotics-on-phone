import { describe, it, expect, beforeEach } from "vitest";
import { AssetRegistry } from "../services/extension/AssetRegistry";
import type { AssetDefinition } from "../types/extension";

const iconAsset: AssetDefinition = {
  path: "icons/led.svg",
  type: "icon",
  content: "<svg></svg>",
  extensionId: "led",
};

const previewAsset: AssetDefinition = {
  path: "previews/led.png",
  type: "preview",
  content: "base64data",
  extensionId: "led",
};

describe("AssetRegistry", () => {
  beforeEach(() => {
    AssetRegistry.clear();
  });

  it("registers a single asset", () => {
    AssetRegistry.register(iconAsset);
    const found = AssetRegistry.getAsset("led", "icons/led.svg");
    expect(found).toBeDefined();
    expect(found!.type).toBe("icon");
  });

  it("registers multiple assets", () => {
    AssetRegistry.registerMany([iconAsset, previewAsset]);
    expect(AssetRegistry.getAssetsForExtension("led")).toHaveLength(2);
  });

  it("getAssetsByType filters correctly", () => {
    AssetRegistry.registerMany([iconAsset, previewAsset]);
    const icons = AssetRegistry.getAssetsByType("icon");
    expect(icons).toHaveLength(1);
  });

  it("unregister removes specific asset", () => {
    AssetRegistry.register(iconAsset);
    AssetRegistry.unregister("led", "icons/led.svg");
    expect(AssetRegistry.getAsset("led", "icons/led.svg")).toBeUndefined();
  });

  it("unregisterAllForExtension removes all for extension", () => {
    AssetRegistry.registerMany([iconAsset, previewAsset]);
    AssetRegistry.unregisterAllForExtension("led");
    expect(AssetRegistry.getAssetsForExtension("led")).toEqual([]);
  });

  it("unregisterAllForExtension does not affect other extensions", () => {
    const otherAsset: AssetDefinition = { ...iconAsset, extensionId: "other", path: "other.svg" };
    AssetRegistry.registerMany([iconAsset, otherAsset]);
    AssetRegistry.unregisterAllForExtension("led");
    expect(AssetRegistry.getAssetsForExtension("other")).toHaveLength(1);
  });

  it("getAssetUrl returns a data URI", () => {
    AssetRegistry.register(iconAsset);
    const url = AssetRegistry.getAssetUrl("led", "icons/led.svg");
    expect(url).toContain("data:image/svg+xml");
  });

  it("getAssetUrl returns undefined for missing asset", () => {
    expect(AssetRegistry.getAssetUrl("missing", "file.svg")).toBeUndefined();
  });

  it("clear removes all assets", () => {
    AssetRegistry.registerMany([iconAsset, previewAsset]);
    AssetRegistry.clear();
    expect(AssetRegistry.getAssetsForExtension("led")).toEqual([]);
  });
});
