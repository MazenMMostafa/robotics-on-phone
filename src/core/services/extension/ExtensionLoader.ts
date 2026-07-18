/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ExtensionManifest, ExtensionModule, ExtensionRegistryEntry } from "../../types/extension";

type ManifestModule = { default: ExtensionManifest };

const manifestGlob = import.meta.glob<ManifestModule>("/src/extensions/*/extension.json", { eager: true });
const blockIndexGlob = import.meta.glob("/src/extensions/*/blocks/index.ts", { eager: true });
const componentIndexGlob = import.meta.glob("/src/extensions/*/components/index.ts", { eager: true });
const exampleIndexGlob = import.meta.glob("/src/extensions/*/examples/index.ts", { eager: true });

function extractDir(path: string): string {
  const match = path.match(/\/src\/extensions\/([^/]+)\//);
  return match ? match[1] : "";
}

export const ExtensionLoader = {
  discoverAll(): ExtensionRegistryEntry[] {
    const entries: ExtensionRegistryEntry[] = [];

    for (const [manifestPath, manifestMod] of Object.entries(manifestGlob)) {
      const extDir = extractDir(manifestPath);
      const manifest = manifestMod.default;

      const module: ExtensionModule = { manifest };

      const blockPath = Object.keys(blockIndexGlob).find((p) => extractDir(p) === extDir);
      const componentPath = Object.keys(componentIndexGlob).find((p) => extractDir(p) === extDir);
      const examplePath = Object.keys(exampleIndexGlob).find((p) => extractDir(p) === extDir);

      if (blockPath) {
        const blockMod = blockIndexGlob[blockPath] as any;
        module.blocks = blockMod.blocks || blockMod.default?.blocks || (() => []);
        module.categories = blockMod.categories || blockMod.default?.categories || (() => []);
      }

      if (componentPath) {
        const compMod = componentIndexGlob[componentPath] as any;
        module.components = compMod.components || compMod.default?.components || (() => []);
      }

      if (examplePath) {
        const exMod = exampleIndexGlob[examplePath] as any;
        module.examples = exMod.examples || exMod.default?.examples || (() => []);
      }

      entries.push({ manifest, module, loaded: true });
    }

    return entries;
  },

  checkDependencies(entry: ExtensionRegistryEntry, allEntries: ExtensionRegistryEntry[]): string[] {
    const missing: string[] = [];
    const deps = entry.manifest.dependencies;

    const loadedIds = new Set(allEntries.map((e) => e.manifest.id));
    for (const depId of deps.extensions) {
      if (!loadedIds.has(depId)) {
        missing.push(`Extension "${entry.manifest.id}": missing dependency "${depId}"`);
      }
    }

    return missing;
  },
};
