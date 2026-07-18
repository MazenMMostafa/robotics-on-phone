import type { AssetDefinition } from "../../types/extension";

class AssetRegistryClass {
  private assets = new Map<string, AssetDefinition>();

  register(asset: AssetDefinition): void {
    this.assets.set(`${asset.extensionId}:${asset.path}`, asset);
  }

  registerMany(assets: AssetDefinition[]): void {
    for (const asset of assets) {
      this.assets.set(`${asset.extensionId}:${asset.path}`, asset);
    }
  }

  unregister(extensionId: string, path: string): void {
    this.assets.delete(`${extensionId}:${path}`);
  }

  unregisterAllForExtension(extensionId: string): void {
    for (const [key] of this.assets) {
      if (key.startsWith(`${extensionId}:`)) {
        this.assets.delete(key);
      }
    }
  }

  getAsset(extensionId: string, path: string): AssetDefinition | undefined {
    return this.assets.get(`${extensionId}:${path}`);
  }

  getAssetsByType(type: AssetDefinition["type"]): AssetDefinition[] {
    return Array.from(this.assets.values()).filter((a) => a.type === type);
  }

  getAssetsForExtension(extensionId: string): AssetDefinition[] {
    return Array.from(this.assets.values()).filter((a) => a.extensionId === extensionId);
  }

  getAssetUrl(extensionId: string, path: string): string | undefined {
    const asset = this.assets.get(`${extensionId}:${path}`);
    return asset ? `data:${this.mimeType(asset.type)},${encodeURIComponent(asset.content)}` : undefined;
  }

  private mimeType(type: AssetDefinition["type"]): string {
    switch (type) {
      case "svg": return "image/svg+xml";
      case "icon": return "image/svg+xml";
      case "image": return "image/png";
      case "animation": return "image/gif";
      case "preview": return "image/png";
    }
  }

  clear(): void {
    this.assets.clear();
  }
}

export const AssetRegistry = new AssetRegistryClass();
