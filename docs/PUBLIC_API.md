# Public API Reference

## ExtensionContext (for extension developers)

### Block Registration

```typescript
context.registerBlock(block: ExtensionBlock): void
context.registerBlocks(blocks: ExtensionBlock[]): void
```

**Block type:**
```typescript
interface ExtensionBlock {
  type: string;       // e.g. "ext_led_on"
  category: string;   // category id for toolbox
  init: (block: any) => void;
  generator: (block: any, generator: any) => [string, number] | string;
}
```

### Category Registration

```typescript
context.registerCategory(category: ToolboxCategoryConfig): void
context.registerCategories(categories: ToolboxCategoryConfig[]): void
```

Categories with the same `id` are merged (block types appended).

### Component Registration

```typescript
context.registerComponent(component: ExtensionComponentDefinition): void
context.registerComponents(components: ExtensionComponentDefinition[]): void
```

Components are merged with built-in components.

### Validation Registration

```typescript
context.registerValidator(componentId: string, rule: ValidationRule): void
context.registerValidators(componentId: string, rules: ValidationRule[]): void
```

**Validation rule:**
```typescript
interface ValidationRule {
  ruleId: string;
  errorMessage: string;
  validate: (context: ValidationContext) => boolean | Promise<boolean>;
}
```

### Library Registration

```typescript
context.registerLibrary(library: LibraryDefinition): void
context.registerLibraries(libraries: LibraryDefinition[]): void
```

**Library definition:**
```typescript
interface LibraryDefinition {
  name: string;
  version?: string;
  url?: string;
  headers: string[];      // e.g. ["<Servo.h>"]
  provides: string[];      // e.g. ["Servo"]
  boards?: string[];       // optional board restriction
}
```

### Example Registration

```typescript
context.registerExample(example: ExtensionExample): void
context.registerExamples(examples: ExtensionExample[]): void
```

**Example:**
```typescript
interface ExtensionExample {
  id: string;
  title: string;
  description: string;
  code: string;           // generated Arduino code
  blocks?: string;        // Blockly XML
  difficulty: "beginner" | "intermediate" | "advanced";
  board?: string;
  tags?: string[];
  category?: string;
  thumbnail?: string;
}
```

### Asset Registration

```typescript
context.registerAsset(asset: AssetDefinition): void
context.registerAssets(assets: AssetDefinition[]): void
```

**Asset:**
```typescript
interface AssetDefinition {
  path: string;           // e.g. "icons/led.svg"
  type: "icon" | "image" | "svg" | "animation" | "preview";
  content: string;        // raw content
}
```

Assets are served as data URIs — no file path coupling.

### Command Registration

```typescript
context.registerCommand(command: CommandDefinition): void
context.registerCommands(commands: CommandDefinition[]): void
```

**Command:**
```typescript
interface CommandDefinition {
  id: string;             // e.g. "my-ext.do-something"
  title: string;
  category: string;
  icon?: string;
  shortcut?: string;
  execute: (...args: any[]) => void | Promise<void>;
}
```

### Event Subscription

```typescript
context.on(event: string, handler: (...args: any[]) => void): void
context.once(event: string, handler: (...args: any[]) => void): void
context.emit(event: string, ...args: any[]): void
```

Subscriptions are automatically disposed when extension deactivates.

## Extension Module Format

```typescript
// src/extensions/my-ext/index.ts
import type { ExtensionContext, ExtensionModule } from "../../core/types/extension";
import manifest from "./extension.json";

function activate(context: ExtensionContext): void {
  context.registerBlock({ ... });
  context.registerCategory({ ... });
}

const extension: ExtensionModule = { manifest, activate };
export default extension;
```

## Extension Manifest (extension.json)

```json
{
  "id": "my-extension",
  "name": "My Extension",
  "version": "1.0.0",
  "author": "Author Name",
  "description": "Description",
  "apiVersion": "1.0",
  "minimumAppVersion": "1.0.0",
  "dependencies": {
    "extensions": [],
    "libraries": [],
    "boards": ["uno", "nano"]
  },
  "supportedBoards": ["uno", "nano", "mega"]
}
```

## ServiceContainer (for application code)

```typescript
import { container } from "../core/di/ServiceContainer";

// Get a service
const usb = container.get("usbService");
const extensionManager = container.get("extensionManager");

// Register a test double
container.registerInstance("usbService", mockUsbService);
```

## Available Events

Suggested event names for inter-module communication:

| Event | Payload | Description |
|-------|---------|-------------|
| `boardChanged` | boardId | Board selection changed |
| `workspaceChanged` | — | Blockly workspace modified |
| `projectOpened` | project | Project loaded |
| `projectSaved` | project | Project saved |
| `compileStarted` | request | Compilation beginning |
| `compileFinished` | result | Compilation complete |
| `uploadStarted` | request | Upload beginning |
| `uploadFinished` | result | Upload complete |
| `deviceConnected` | deviceInfo | USB device connected |
| `deviceDisconnected` | — | USB device disconnected |
| `themeChanged` | mode | Theme toggled (light/dark) |
