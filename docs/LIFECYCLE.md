# Extension Lifecycle

## States

```
discovered ──▶ loaded ──▶ activating ──▶ active
                              │               │
                              ▼               ▼
                            error          deactivating
                                               │
                                               ▼
                                            inactive
```

| State | Description |
|-------|-------------|
| `discovered` | Extension found by `ExtensionLoader` |
| `loaded` | Module loaded, version/dependency checks passed |
| `activating` | `activate(context)` is running |
| `active` | Extension fully active and registered |
| `deactivating` | `deactivate()` is running |
| `inactive` | Extension cleaned up, all resources released |
| `error` | Loading or activation failed |

## Lifecycle Flow

```
ExtensionManager.init()
  │
  ├── discover()
  │     ExtensionLoader.scanDirectories()
  │     Read extension.json from each extension
  │
  ├── load()
  │     Check apiVersion vs CURRENT_API_VERSION
  │     Check minimumAppVersion vs app version
  │     Check dependency resolution
  │     If legacy format (blocks()/categories() functions):
  │       Register everything immediately
  │       Set state → active
  │     If new format (activate() function):
  │       Set state → loaded (wait for activation)
  │
  └── activate()
        For each loaded extension with activate():
          Create ExtensionContext
          Call activate(context)
          Set state → active
          Emit extension:activated event
```

## Deactivation

```typescript
ExtensionManager.deactivateExtension(id)
  │
  ├── Set state → deactivating
  ├── Call extension.deactivate() if exists
  ├── context.dispose() — clean up all subscriptions
  ├── AssetRegistry.unregisterAllForExtension(id)
  ├── Set state → inactive
  └── Emit extension:deactivated event
```

## Full Disposal

```typescript
ExtensionManager.dispose()
  │
  ├── Deactivate all active extensions
  ├── Clear all registries
  ├── Remove all EventBus listeners
  └── Reset initialized flag
```

## API Versioning

`extension.json` fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiVersion` | string | No | Required API version (e.g., "1.0") |
| `minimumAppVersion` | string | No | Minimum app version (e.g., "1.0.0") |
| `version` | string | Yes | Extension version (semver) |

The loader compares `apiVersion` against `CURRENT_API_VERSION` and `minimumAppVersion` against the app version. Mismatches prevent the extension from loading.

## Subscriptions

Extensions register event handlers through `context.on()`. Each subscription is stored in `context.subscriptions` as a `Disposable`. When the extension is deactivated, all disposables are called.

This ensures no stale listeners remain after extension unload.

## Future: Unloading

The architecture supports future dynamic unload:
1. `ExtensionManager.deactivateExtension(id)` stops the extension
2. Cleanup can be extended: unregister blocks, generators, categories, components
3. Blockly does not support block removal at runtime, but new workspace loads will not include deactivated extensions
