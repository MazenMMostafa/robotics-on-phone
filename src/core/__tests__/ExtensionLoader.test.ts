import { describe, it, expect } from "vitest";
import { ExtensionLoader } from "../services/extension/ExtensionLoader";
import type { ExtensionManifest, ExtensionRegistryEntry } from "../types/extension";

const makeManifest = (overrides: Partial<ExtensionManifest> = {}): ExtensionManifest => ({
  id: "test-ext",
  name: "Test",
  version: "1.0.0",
  author: "Test",
  description: "",
  dependencies: { extensions: [], libraries: [], boards: [] },
  supportedBoards: ["uno"],
  ...overrides,
});

describe("ExtensionLoader", () => {
  it("checkDependencies returns empty for no deps", () => {
    const entry: ExtensionRegistryEntry = {
      manifest: makeManifest(),
      module: { manifest: makeManifest() },
      loaded: true,
    };
    const issues = ExtensionLoader.checkDependencies(entry, [entry]);
    expect(issues).toEqual([]);
  });

  it("checkDependencies detects missing deps", () => {
    const entry: ExtensionRegistryEntry = {
      manifest: makeManifest({
        dependencies: { extensions: ["missing-dep"], libraries: [], boards: [] },
      }),
      module: { manifest: makeManifest() },
      loaded: true,
    };
    const issues = ExtensionLoader.checkDependencies(entry, [entry]);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain("missing-dep");
  });

  it("checkDependencies passes when dep exists", () => {
    const depEntry: ExtensionRegistryEntry = {
      manifest: makeManifest({ id: "base" }),
      module: { manifest: makeManifest({ id: "base" }) },
      loaded: true,
    };
    const entry: ExtensionRegistryEntry = {
      manifest: makeManifest({
        id: "dependent",
        dependencies: { extensions: ["base"], libraries: [], boards: [] },
      }),
      module: { manifest: makeManifest({ id: "dependent" }) },
      loaded: true,
    };
    const issues = ExtensionLoader.checkDependencies(entry, [entry, depEntry]);
    expect(issues).toEqual([]);
  });

  it("checkApiVersion returns empty for matching version", () => {
    const manifest = makeManifest({ apiVersion: "1.0" });
    const issues = ExtensionLoader.checkApiVersion(manifest);
    expect(issues).toEqual([]);
  });

  it("checkApiVersion reports mismatched apiVersion", () => {
    const manifest = makeManifest({ apiVersion: "99.0" });
    const issues = ExtensionLoader.checkApiVersion(manifest);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain("API");
  });

  it("checkApiVersion reports insufficient minimumAppVersion", () => {
    const manifest = makeManifest({ minimumAppVersion: "99.0.0" });
    const issues = ExtensionLoader.checkApiVersion(manifest);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain("app");
  });

  it("checkApiVersion passes for compatible minimumAppVersion", () => {
    const manifest = makeManifest({ minimumAppVersion: "0.0.1" });
    const issues = ExtensionLoader.checkApiVersion(manifest);
    expect(issues).toEqual([]);
  });

  it("checkApiVersion handles missing versions gracefully", () => {
    const manifest = makeManifest({});
    const issues = ExtensionLoader.checkApiVersion(manifest);
    expect(issues).toEqual([]);
  });
});
