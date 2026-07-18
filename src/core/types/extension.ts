export interface ExtensionDependencies {
  extensions: string[];
  libraries: string[];
  boards: string[];
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  dependencies: ExtensionDependencies;
  supportedBoards: string[];
  icon?: string;
  apiVersion?: string;
  minimumAppVersion?: string;
}

export interface ToolboxCategoryConfig {
  id: string;
  name: string;
  colour: string;
  blockTypes: string[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ExtensionBlock {
  type: string;
  category: string;
  init: (block: any) => void;
  generator: (block: any, javascriptGenerator: any) => [string, number] | string;
}

export interface ExtensionComponentDefinition {
  id: string;
  displayName: string;
  description: string;
  category: string;
  supportedBoards: string[];
  requiredPins: { key: string; label: string; type: string }[];
  optionalPins: { key: string; label: string; type: string; default?: string }[];
  libraries: string[];
  icon?: string;
}

export interface ExtensionExample {
  id: string;
  title: string;
  description: string;
  code: string;
  blocks?: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  extensionId: string;
  board?: string;
  tags?: string[];
  category?: string;
  thumbnail?: string;
}

export interface LibraryDefinition {
  name: string;
  version?: string;
  url?: string;
  headers: string[];
  provides: string[];
  boards?: string[];
}

export interface CommandDefinition {
  id: string;
  title: string;
  category: string;
  icon?: string;
  shortcut?: string;
  execute: (...args: any[]) => void | Promise<void>;
}

export interface AssetDefinition {
  path: string;
  type: "icon" | "image" | "svg" | "animation" | "preview";
  content: string;
  extensionId: string;
}

export type ExtensionLifecycleState =
  | "discovered"
  | "loaded"
  | "activating"
  | "active"
  | "deactivating"
  | "inactive"
  | "error";

export interface ExtensionRegistryEntry {
  manifest: ExtensionManifest;
  module: ExtensionModule;
  loaded: boolean;
  error?: string;
  lifecycleState?: ExtensionLifecycleState;
}

export interface Disposable {
  dispose(): void;
}

export interface ExtensionModule {
  manifest: ExtensionManifest;
  activate?: (context: any) => void | Promise<void>;
  deactivate?: () => void | Promise<void>;
  categories?: () => ToolboxCategoryConfig[];
  blocks?: () => ExtensionBlock[];
  components?: () => ExtensionComponentDefinition[];
  examples?: () => ExtensionExample[];
}
