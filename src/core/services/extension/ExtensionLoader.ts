/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ExtensionManifest, ExtensionRegistryEntry } from "../../types/extension";

const CURRENT_API_VERSION = "1.0";
const CURRENT_APP_VERSION = "1.0.0";

type ManifestModule = { default: ExtensionManifest };

const mainIndexGlob = import.meta.glob("/src/extensions/*/index.ts", { eager: true });
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

      const entry: ExtensionRegistryEntry = {
        manifest,
        module: { manifest },
        loaded: true,
        lifecycleState: "discovered",
      };

      const mainPath = Object.keys(mainIndexGlob).find((p) => extractDir(p) === extDir);
      const blockPath = Object.keys(blockIndexGlob).find((p) => extractDir(p) === extDir);
      const componentPath = Object.keys(componentIndexGlob).find((p) => extractDir(p) === extDir);
      const examplePath = Object.keys(exampleIndexGlob).find((p) => extractDir(p) === extDir);

      if (mainPath) {
        const mainMod = mainIndexGlob[mainPath] as any;
        entry.module = mainMod.default || mainMod;
        if (!entry.module.manifest) {
          entry.module.manifest = manifest;
        }
        if (!entry.module.blocks && !entry.module.activate) {
          entry.module.blocks = mainMod.blocks || (() => []);
          entry.module.categories = mainMod.categories || (() => []);
          entry.module.components = mainMod.components || (() => []);
          entry.module.examples = mainMod.examples || (() => []);
        }
      } else {
        if (blockPath) {
          const blockMod = blockIndexGlob[blockPath] as any;
          entry.module.blocks = blockMod.blocks || blockMod.default?.blocks || (() => []);
          entry.module.categories = blockMod.categories || blockMod.default?.categories || (() => []);
        }

        if (componentPath) {
          const compMod = componentIndexGlob[componentPath] as any;
          entry.module.components = compMod.components || compMod.default?.components || (() => []);
        }

        if (examplePath) {
          const exMod = exampleIndexGlob[examplePath] as any;
          entry.module.examples = exMod.examples || exMod.default?.examples || (() => []);
        }
      }

      entries.push(entry);
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

  checkApiVersion(manifest: ExtensionManifest): string[] {
    const issues: string[] = [];

    if (manifest.apiVersion && manifest.apiVersion !== CURRENT_API_VERSION) {
      issues.push(
        `Extension "${manifest.id}": requires API ${manifest.apiVersion}, current is ${CURRENT_API_VERSION}`,
      );
    }

    if (manifest.minimumAppVersion) {
      const minParts = manifest.minimumAppVersion.split(".").map(Number);
      const curParts = CURRENT_APP_VERSION.split(".").map(Number);
      for (let i = 0; i < Math.max(minParts.length, curParts.length); i++) {
        const min = minParts[i] ?? 0;
        const cur = curParts[i] ?? 0;
        if (cur < min) {
          issues.push(
            `Extension "${manifest.id}": requires app v${manifest.minimumAppVersion}, current is ${CURRENT_APP_VERSION}`,
          );
          break;
        }
        if (cur > min) break;
      }
    }

    return issues;
  },
};
