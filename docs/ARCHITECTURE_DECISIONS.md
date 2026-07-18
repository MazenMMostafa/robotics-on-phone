# Architecture Decision Records

## ADR-001: ExtensionContext Instead of Direct Registry Access

**Status:** Accepted  
**Date:** 2026-07-18

### Context
Extensions need to register blocks, generators, categories, components, validators, libraries, examples, assets, and commands. The naive approach is to let extensions import registries directly.

### Decision
Extensions receive an `ExtensionContext` object in their `activate()` function. All registration goes through context methods. Registries are never exposed to extensions directly.

### Consequences
- **Positive:** API surface is controlled and documented. Adding new capabilities only requires adding methods to `ExtensionContext`. Extensions cannot accidentally misuse registries.
- **Positive:** Registries can be refactored internally without breaking extensions.
- **Positive:** The context manages subscriptions and lifecycle cleanup automatically.
- **Negative:** One extra indirection layer. Extension developers must learn the context API instead of importing directly.

### Rejected Alternatives
- Direct imports — tight coupling, harder to version, no lifecycle management.
- Dependency injection via constructor — too complex for a browser extension system.

---

## ADR-002: Separate Registries Instead of One Monolithic Registry

**Status:** Accepted  
**Date:** 2026-07-18

### Context
Earlier iterations had a single `ExtensionRegistry` that managed all data (blocks, generators, categories, components, examples).

### Decision
Split into 8 registries: `BlockRegistry`, `GeneratorRegistry`, `CategoryRegistry`, `ComponentRegistry`, `ValidationRegistry`, `LibraryRegistry`, `ExampleRegistry`, `AssetRegistry`, and `CommandRegistry`.

### Consequences
- **Positive:** Each registry has a single responsibility. Easy to test, mock, and reason about.
- **Positive:** Adding a new capability means adding a new registry without touching existing ones.
- **Positive:** Registries can be loaded/unloaded independently.
- **Negative:** More files, more imports. Manager must orchestrate them all.

### Rejected Alternatives
- Single registry — became bloated, violated SRP, hard to reason about.
- One registry per extension — too granular, no cross-extension queries.

---

## ADR-003: EventBus for Decoupled Communication

**Status:** Accepted  
**Date:** 2026-07-18

### Context
Modules needed to communicate (board changed, compile finished, device connected). Direct imports created circular dependencies.

### Decision
Introduce a lightweight `EventBus` with `on`, `once`, `off`, `emit`. Any module can listen or emit without knowing other modules.

### Consequences
- **Positive:** Zero circular dependencies. Modules are truly decoupled.
- **Positive:** Extensions can listen to core events without core knowing about them.
- **Positive:** One handler failure doesn't crash the system (errors are caught).
- **Negative:** Event flow is implicit — hard to trace what listens to what.
- **Negative:** No type safety on event payloads (mitigated by documentation).

### Rejected Alternatives
- Direct function calls — created circular dependencies.
- Redux-style global store — overkill for event notification.
- RxJS — too heavy for the use case.

---

## ADR-004: HAL is JSON-Driven

**Status:** Accepted  
**Date:** 2026-07-18

### Context
The hardware abstraction layer needs to support multiple boards (UNO, Nano, Mega, Leonardo, ESP32, ESP8266, Pico) and components (LED, servo, motor, sensor, display).

### Decision
Board and component definitions are stored as JSON files under `src/data/boards/` and `src/data/components/`. Services load these at startup and provide query APIs.

### Consequences
- **Positive:** Adding a new board or component is a JSON file — no code changes.
- **Positive:** Non-developers can contribute board/component data.
- **Positive:** JSON is validateable, versionable, and independent of build tools.
- **Negative:** No compile-time type checking on JSON values.
- **Negative:** Runtime loading adds minimal startup cost.

### Rejected Alternatives
- TypeScript enums and constants — requires code changes for every board/component addition.
- Database — overkill, no runtime database available.

---

## ADR-005: Read/Write Separation for Services

**Status:** Accepted  
**Date:** 2026-07-18

### Context
Some services were both read and written by different parts of the application. `ComponentService` both stored component registrations and queried them.

### Decision
Split into write-side registries (for extensions to register) and read-side services (for UI and core to query). `ComponentRegistry` handles writes, `ComponentService` handles reads. `ComponentService` merges built-in JSON components with registry components.

### Consequences
- **Positive:** Clear ownership — extensions write, core reads.
- **Positive:** Easier to reason about data flow.
- **Positive:** Read layer can cache, transform, and merge without affecting write layer.
- **Negative:** Slight duplication of query API surface.

### Rejected Alternatives
- Single service with read/write methods — mixed concerns, hard to audit.

---

## ADR-006: Auto-Discovery via import.meta.glob

**Status:** Accepted  
**Date:** 2026-07-18

### Context
Extensions need to be found and loaded without manual registration in core code.

### Decision
`ExtensionLoader` uses Vite's `import.meta.glob("/src/extensions/*/extension.json")` to discover all extensions at build time. Extensions are folders under `src/extensions/` with an `extension.json` manifest.

### Consequences
- **Positive:** Zero configuration — adding an extension folder is enough.
- **Positive:** Dead-code elimination — unused extensions are tree-shaken.
- **Positive:** Build-time discovery means no runtime scanning overhead.
- **Negative:** Extensions must exist at build time. No dynamic download at runtime.
- **Negative:** `import.meta.glob` only supports static patterns (no variables).

### Rejected Alternatives
- Runtime file scanning — not possible in browser.
- Manual registration in core code — violates "core must never know extensions" principle.
- Package manager — too complex for the initial architecture.

---

## ADR-007: Backward Compatibility for Extension Format

**Status:** Accepted  
**Date:** 2026-07-18

### Context
Existing extensions use the old format (exporting `blocks()`, `categories()` functions). New format uses `activate(context)`. Both need to coexist during migration.

### Decision
`ExtensionManager` checks if an extension module has `activate`. If yes, it calls it with a context. If no, it falls back to calling the legacy `blocks()`, `categories()` functions.

### Consequences
- **Positive:** Old extensions work without changes.
- **Positive:** Migration can happen incrementally.
- **Positive:** `ExtensionLoader` handles both formats transparently.
- **Negative:** Legacy support adds complexity to the loader and manager.
- **Negative:** Old extensions don't get lifecycle events.

### Rejected Alternatives
- Breaking change — would block migration.
- Wrapper layer — more code than inline fallback.

---

## ADR-008: ServiceContainer for Dependency Injection

**Status:** Accepted  
**Date:** 2026-07-18

### Context
Services imported each other directly, creating tight coupling and making testing difficult.

### Decision
Create a lightweight `ServiceContainer` that holds all service instances. Services are registered once in `ServiceBootstrap` and resolved by name from the container. Direct imports still work for backward compatibility, but new code should use the container.

### Consequences
- **Positive:** Services can be swapped for test doubles.
- **Positive:** Initialization order is controlled.
- **Positive:** All dependencies are visible in one place.
- **Negative:** Service locator pattern is an anti-pattern for some — but pragmatic here.

### Rejected Alternatives
- Constructor injection — too invasive for existing singleton-heavy codebase.
- Full DI framework — overkill.

---

## ADR-009: Platform Abstraction Layer

**Status:** Accepted  
**Date:** 2026-07-18

### Context
The application depends on Capacitor for USB, storage, compiler, and file operations. This makes it impossible to run on web, desktop, or in tests without a device.

### Decision
Introduce platform adapter interfaces (`USBAdapter`, `StorageAdapter`, `CompilerAdapter`, `FileAdapter`) in `core/platform/types.ts`. Capacitor implementations live under `src/platform/capacitor/`. Future platforms (web, electron, test) provide their own implementations.

### Consequences
- **Positive:** Business logic is platform-independent.
- **Positive:** Tests can use mock adapters.
- **Positive:** Adding a new platform (web, desktop) requires only implementing interfaces.
- **Negative:** One extra indirection layer for platform operations.

### Rejected Alternatives
- Direct Capacitor usage everywhere — works but untestable, unportable.
- Abstract everything behind services — platform adapters are the right granularity.
