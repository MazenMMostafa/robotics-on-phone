# Registries

## Overview

Registries are the data stores of the extension system. Each registry manages a specific domain (blocks, generators, categories, components, etc.). Extensions **never access registries directly** — they go through `ExtensionContext`.

## Registry Architecture

```
ExtensionContext
  │
  ├── registerBlock() ──────────▶  BlockRegistry + GeneratorRegistry
  ├── registerCategory() ───────▶  CategoryRegistry
  ├── registerComponent() ──────▶  ComponentRegistry (write)
  ├── registerValidator() ──────▶  ValidationRegistry
  ├── registerLibrary() ────────▶  LibraryRegistry
  ├── registerExample() ────────▶  ExampleRegistry
  ├── registerAsset() ──────────▶  AssetRegistry
  └── registerCommand() ────────▶  CommandRegistry
                                          │
                                          ▼
                                  ComponentService (read-only)
                                  ValidationService (delegates)
```

## Registry Details

### BlockRegistry
- Stores `ExtensionBlock` definitions
- `registerWithBlockly(Blockly)` injects blocks into Blockly
- `getBlock(type)`, `getAllBlocks()`

### GeneratorRegistry
- Stores generator functions separated from block definitions
- `registerWithGenerator(javascriptGenerator)` registers generators
- `getGenerator(type)`

### CategoryRegistry
- Stores `ToolboxCategoryConfig` maps
- Merges categories with same `id` by appending block types
- `getCategories()`, `getCategory(id)`

### ComponentRegistry (Write)
- Stores extension-registered components
- `register()`, `unregister()`, `getComponent()`, `getAllComponents()`
- ComponentService reads from both built-in JSON and ComponentRegistry

### ValidationRegistry
- Stores `ValidationRule` lists per component ID
- `validate()` runs built-in checks (board compat, pins, PWM, analog, voltage, libraries) + extension rules
- `validateAll()` for batch validation
- ValidationService delegates to this

### LibraryRegistry
- Single source of truth for Arduino libraries
- `getHeaders(names)` resolves library names to `#include` statements
- Generators should request libraries from here, not hardcode includes

### ExampleRegistry
- Stores `ExtensionExample` objects
- Filterable by difficulty, board, tags, extension
- Examples include generated code, Blockly XML, metadata

### AssetRegistry
- Stores assets (icons, images, SVGs) keyed by `extensionId:path`
- `getAssetUrl()` returns data URIs — no file path coupling
- `unregisterAllForExtension()` cleans up on deactivation

### CommandRegistry
- Every action is a command
- `execute(id)` runs a command by ID
- Supports future keyboard shortcuts, menus, automation

## Query Layers (Read-Only)

### ComponentService
- Merges built-in JSON components + ComponentRegistry entries
- Read-only query methods only: `getComponents()`, `getComponent()`, etc.

### ValidationService
- Thin delegate to ValidationRegistry
- Backward-compatible interface
