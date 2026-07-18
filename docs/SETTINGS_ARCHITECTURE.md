# Settings Architecture

## Overview

The settings system provides a strongly typed, persistent, and extensible configuration
framework for the application. It follows the same architectural principles as the core
platform: services as the source of truth, EventBus for change notifications, and
zustand stores bridging to the React UI.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   UI Components                       │
│  (React hooks: useSettingsStore, useThemeStore, etc.) │
└──────────────────┬──────────────────────────────────┘
                   │ subscribe via EventBus
┌──────────────────▼──────────────────────────────────┐
│              SettingsManager                          │
│  - get/set/update/reset                               │
│  - import/export                                      │
│  - validators                                         │
│  - migrations                                         │
│  - change events via EventBus                          │
└──────────────────┬──────────────────────────────────┘
                   │ persistence
┌──────────────────▼──────────────────────────────────┐
│              StorageAdapter (Platform Layer)           │
│  - CapacitorStorageAdapter (localStorage)              │
│  - MockStorageAdapter (testing)                        │
└─────────────────────────────────────────────────────┘
```

## Key Components

### Settings Types (`src/core/types/settings/`)

- **`settings.ts`**: `AppSettings` interface, `DEFAULT_SETTINGS`, `SETTINGS_VERSION`,
  `SettingsValidator`, `SettingsChangeEvent`, `SettingsExport`, `SettingsMigration`
- **`categories.ts`**: `SettingsCategory` type union

### Settings Categories

| Category       | Key Settings                                         |
|----------------|------------------------------------------------------|
| General        | serverUrl, language, autoSave, autoSaveDelay         |
| Editor         | terminalMaxLines, logMaxLines, showGeneratedCode     |
| Blockly        | snapRadius, trashCan, sounds, gridVisible            |
| Compiler       | uploadSpeed, compilerTimeout, verboseCompile         |
| Upload         | autoDetectBoard, uploadRetries                       |
| Appearance     | theme, animations, compactMode, reducedMotion        |
| Developer      | developerMode, verboseLogs, showDiagnostics, devTools|
| Experimental   | experimentalFeatures, enableCloudSync                |

### SettingsManager (`src/core/services/settings/SettingsManager.ts`)

- **init()**: Loads from storage, applies migrations
- **get(key)**: Returns single setting value
- **getAll()**: Returns copy of all settings
- **set(key, value)**: Validates, persists, emits change event
- **update(partial)**: Batch update, atomic validation
- **reset()**: Restores all defaults
- **export()**: Serializes with version for backup
- **import(data)**: Validates and restores exported settings
- **addValidator(fn)**: Registers a validation function
- **addMigration(migration)**: Registers a version migration

### Change Notifications

Settings changes are broadcast via EventBus events:

- `settings:changed` — individual setting changed
- `settings:reset` — all settings reset to defaults
- `settings:imported` — settings imported from export

## Persistence

Settings use the platform `StorageAdapter` interface, never `localStorage` directly.
The `CapacitorStorageAdapter` implementation uses `localStorage` under the hood but
could be swapped for cloud storage without changing any application code.

## Versioning & Migrations

Settings are stored with a version number. When the application loads settings
saved by an older version, registered migrations are applied in order to transform
the data to the current format.

## UI Integration

The `useSettingsStore` zustand store subscribes to EventBus events and provides
settings state to React components. Components call `sm.set(key, value)` through
the SettingsManager (obtained via DI container) rather than modifying zustand state
directly.
