# Event System

## Overview

The `EventBus` is a lightweight publish-subscribe system that decouples modules. No module imports another directly to communicate — they emit and listen to events.

## Architecture

```
┌──────────┐     ┌───────────┐     ┌──────────┐
│ Module A │────▶│  EventBus │◀────│ Module B │
│ (emits)  │     │           │     │ (listens)│
└──────────┘     │  on/emit  │     └──────────┘
                 │  once/off │
┌──────────┐     │           │     ┌──────────┐
│ Module C │────▶│           │◀────│ Module D │
│ (emits)  │     └───────────┘     │ (listens)│
└──────────┘                       └──────────┘
```

## API

```typescript
// Subscribe to an event
EventBus.on("boardChanged", handler);

// Subscribe once
EventBus.once("compileFinished", handler);

// Unsubscribe
EventBus.off("eventName", handler);

// Emit
EventBus.emit("uploadStarted", { boardId: "uno" });

// Remove all listeners for an event
EventBus.removeAll("eventName");

// Remove all listeners entirely
EventBus.removeAll();
```

## Suggested Events

### Lifecycle
| Event | Payload | Description |
|-------|---------|-------------|
| `lifecycle:init` | — | Extension system initializing |
| `lifecycle:discover` | — | Scanning for extensions |
| `lifecycle:load` | — | Loading extension modules |
| `lifecycle:activate` | — | Activating extensions |
| `lifecycle:ready` | — | All extensions activated |

### Extension
| Event | Payload | Description |
|-------|---------|-------------|
| `extension:loaded` | ExtensionRegistryEntry | Extension loaded |
| `extension:loaded:{id}` | ExtensionRegistryEntry | Specific extension loaded |
| `extension:activated` | ExtensionRegistryEntry | Extension activated |
| `extension:activated:{id}` | ExtensionRegistryEntry | Specific extension activated |
| `extension:deactivated` | ExtensionRegistryEntry | Extension deactivated |
| `extension:deactivated:{id}` | ExtensionRegistryEntry | Specific extension deactivated |

### Workspace
| Event | Payload | Description |
|-------|---------|-------------|
| `workspaceLoaded` | WorkspaceSvg | Blockly workspace loaded |
| `workspaceChanged` | — | Workspace content changed |
| `boardChanged` | BoardType | Selected board changed |
| `projectOpened` | Project | Project opened |
| `projectSaved` | Project | Project saved |

### Device
| Event | Payload | Description |
|-------|---------|-------------|
| `deviceConnected` | DeviceInfo | USB device connected |
| `deviceDisconnected` | — | USB device disconnected |

### Compile/Upload
| Event | Payload | Description |
|-------|---------|-------------|
| `compileStarted` | CompileRequest | Compilation started |
| `compileFinished` | CompileResult | Compilation finished |
| `uploadStarted` | UploadRequest | Upload started |
| `uploadFinished` | UploadResult | Upload finished |

### UI
| Event | Payload | Description |
|-------|---------|-------------|
| `themeChanged` | "light" \| "dark" | Theme toggled |
| `settingsChanged` | Partial<Settings> | Settings updated |

## Error Handling

Event handlers that throw are caught by EventBus and logged — one failing handler does not crash the system.

## Extension Context

Extensions access events through the context:

```typescript
function activate(context) {
  context.on("boardChanged", (board) => { ... });
  context.emit("customEvent", data);
}
```

Context subscriptions are auto-disposed when the extension deactivates.
