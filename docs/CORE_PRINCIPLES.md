# Core Principles

## 1. Core Must Never Know Individual Components

The core application must never import or reference specific component implementations (LED, servo, motor, sensor, display). Components are defined in JSON data files and loaded dynamically. Adding a new component requires only a JSON file, not a code change.

## 2. Core Must Never Know Extension Implementations

The core imports `ExtensionManager` and `ExtensionLoader` — never `extensions/led/` or any extension by name. Extensions are auto-discovered via `import.meta.glob`. The core treats all extensions identically through the `ExtensionContext` API.

## 3. Features Are Added Through Extensions

New hardware support (sensors, actuators, displays, communication modules) must be implemented as extensions under `src/extensions/`. The core Blockly block categories (events, control, operators, Arduino, actuators, sensors, display, communication) exist for the initial prototype, but future categories should come from extensions.

## 4. No Feature May Bypass ExtensionContext

Extensions must use the `ExtensionContext` API for all registrations:
- `context.registerBlock()` not `BlockRegistry.register()`
- `context.registerComponent()` not `ComponentRegistry.register()`
- `context.on()` not `EventBus.on()`

Bypassing the context breaks lifecycle management and API versioning guarantees.

## 5. Business Logic Never Depends on UI

All business logic (validation, compilation, upload, project management, board configuration) lives in `src/core/services/`. UI components in `src/features/` import services, never the reverse. Services never import React, JSX, or UI components.

## 6. Platform Code Never Leaks into Core

Capacitor-specific code (USB, storage, file operations) is abstracted behind platform adapter interfaces in `src/core/platform/types.ts`. Implementations live in `src/platform/capacitor/`. Core code only depends on interfaces, never on Capacitor imports.

## 7. Every New Capability Must Be Extensible

Before adding a new feature to the core, consider:
- Can this be an extension?
- Can extensions contribute to this feature?
- Can extensions customize this behavior?

If the answer to any is yes, design for extensibility first. The default behavior can be built-in, but the extension point must exist.

## 8. Registries Are Write-Only for Extensions

Extensions write to registries through `ExtensionContext`. Core reads from query services (`ComponentService`, `ValidationService`). No extension reads from registries. No core writes to registries (except during initialization).

## 9. Singletons Are Acceptable for Infrastructure

Infrastructure services (EventBus, registries, managers) use the singleton pattern. They are stateful by nature (they hold registrations). The `ServiceContainer` provides a single place to manage their lifecycle.

## 10. Backward Compatibility Is Required

The core API (`ExtensionContext`, registries, services) must maintain backward compatibility. Old-format extensions (exporting `blocks()`/`categories()` functions) must continue to work. Deprecation should follow a two-version cycle.

## 11. Testability Is a First-Class Concern

Every registry, service, manager, and platform adapter must be mockable. Platform adapters are the primary seam for testing. ServiceContainer allows registering test doubles. Direct imports of Capacitor APIs are limited to adapter implementations.

## 12. Build Chain Must Pass Before Merge

Every change must pass:
1. TypeScript — 0 errors
2. ESLint — 0 errors
3. Vite build — success
4. Capacitor sync — success
5. Android Debug APK — success
