# Extension Architecture

## Overview

The extension system allows third-party hardware support to be added to NewBegin Makes without modifying the core application. Extensions are auto-discovered at build time via Vite's `import.meta.glob`.

## Design Rules

1. **Core never knows about specific extensions.** The core only imports `ExtensionRegistry` and `ExtensionLoader`. No `import` of `extensions/led/` or any extension by name in core code.
2. **Extensions are self-contained.** Each extension lives in its own folder under `src/extensions/<name>/` and provides its own blocks, generators, components, examples, and validators.
3. **Auto-discovery.** `ExtensionLoader` uses `import.meta.glob("/src/extensions/*/extension.json")` to find all extensions at build time.

## Directory Structure

```
src/extensions/<name>/
  extension.json          # Manifest (id, version, dependencies, supportedBoards)
  blocks/index.ts         # Block definitions + generators + toolbox category
  components/index.ts     # Component definitions for pin validation
  examples/index.ts       # Example projects
  validators/index.ts     # Validation rules
  README.md               # Documentation
```

## Core Types

Defined in `src/core/types/extension.ts`:

- `ExtensionManifest` — extension metadata (id, name, version, supportedBoards, dependencies)
- `ExtensionBlock` — block type, init function, generator function, toolbox category
- `ToolboxCategoryConfig` — dynamic toolbox category name, colour, block types
- `ExtensionComponentDefinition` — component definition for pin validation
- `ExtensionExample` — example project XML + description
- `ExtensionModule` — shape of a loaded extension's exports
- `ExtensionRegistryEntry` — combined manifest + module
- `ExtensionRegistry` — singleton registry with lifecycle methods

## Lifecycle

1. **Initialization** — `ExtensionRegistry.init()` scans `ExtensionLoader` for all extensions, validates dependencies and board support.
2. **Block Registration** — `ExtensionRegistry.registerBlocksWithBlockly(Blockly)` calls each extension's block init function.
3. **Generator Registration** — `ExtensionRegistry.registerGenerators(javascriptGenerator)` registers code generators for each block.
4. **Toolbox Building** — `ExtensionRegistry.getToolboxCategories()` returns category configs to append to the toolbox.
5. **Component Integration** — `ExtensionRegistry.getComponents()` returns component definitions merged into `ComponentService`.
6. **Examples** — `ExtensionRegistry.getExamples()` returns example projects.

## Integration Points

| File | What it does |
|------|-------------|
| `useWorkspace.ts` | Calls `init()`, `registerBlocksWithBlockly()`, `registerGenerators()` |
| `toolbox.ts` | Calls `init()`, appends `getToolboxCategories()` to toolbox |
| `ComponentService.ts` | Calls `init()`, merges `getComponents()` into component list |

## Dependency Resolution

If extension A declares a dependency on extension B, `ExtensionLoader` checks that B is installed. If missing, A is skipped with a console warning. Circular dependencies are not supported.
