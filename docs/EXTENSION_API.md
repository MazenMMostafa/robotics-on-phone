# Extension API

## Overview

Extensions receive an `ExtensionContext` object in their `activate()` function. This context provides all APIs for registering blocks, components, libraries, commands, and more. Extensions **never** access registries directly — all interaction flows through the context.

## Context Methods

### Blocks & Generators

```typescript
context.registerBlock(block: ExtensionBlock): void
context.registerBlocks(blocks: ExtensionBlock[]): void
```

Each `ExtensionBlock` has an `init` function (for Blockly) and a `generator` function (for code generation). The context automatically registers both the block definition and its generator.

### Toolbox Categories

```typescript
context.registerCategory(category: ToolboxCategoryConfig): void
context.registerCategories(categories: ToolboxCategoryConfig[]): void
```

Categories from multiple extensions with the same `id` are merged — block types are appended.

### Components

```typescript
context.registerComponent(component: ExtensionComponentDefinition): void
context.registerComponents(components: ExtensionComponentDefinition[]): void
```

Components are merged with built-in components in `ComponentService`.

### Validation

```typescript
context.registerValidator(componentId: string, rule: ValidationRule): void
context.registerValidators(componentId: string, rules: ValidationRule[]): void
```

Rules are run before compile, upload, and code generation.

### Libraries

```typescript
context.registerLibrary(library: LibraryDefinition): void
context.registerLibraries(libraries: LibraryDefinition[]): void
```

`LibraryRegistry` is the single source of truth for `#include` headers.

### Examples

```typescript
context.registerExample(example: ExtensionExample): void
context.registerExamples(examples: ExtensionExample[]): void
```

Examples are filterable by difficulty, board, tags, and category.

### Assets

```typescript
context.registerAsset(asset: Omit<AssetDefinition, "extensionId">): void
context.registerAssets(assets: Omit<AssetDefinition, "extensionId">[]): void
```

Assets are keyed by `extensionId:path` — no core code references them directly.

### Commands

```typescript
context.registerCommand(command: CommandDefinition): void
context.registerCommands(commands: CommandDefinition[]): void
```

Commands are executable by ID and can be bound to keyboard shortcuts.

### Events

```typescript
context.on(event: string, handler: (...args) => void): void
context.once(event: string, handler: (...args) => void): void
context.emit(event: string, ...args): void
```

Subscriptions are automatically cleaned up when the extension is deactivated.

## Extension Module Format

```typescript
// src/extensions/my-ext/index.ts
import type { ExtensionContext, ExtensionModule } from "../../core/types/extension";
import manifest from "./extension.json";

function activate(context: ExtensionContext): void {
  context.registerBlock({ ... });
  context.registerCategory({ ... });
  context.registerComponent({ ... });
}

const extension: ExtensionModule = { manifest, activate };
export default extension;
```
