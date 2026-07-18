# Backend Registry

## UploaderBackendRegistry

Manages the lifecycle and discovery of all registered `UploaderBackend` instances.

**Class:** `src/core/services/upload/UploaderBackendRegistry.ts`

### Class Diagram

```
UploaderBackendRegistry
  - backends: UploaderBackend[]
  -------------------------------------------------
  + register(backend): void
  + registerMany(backends): void
  + findForBoard(boardId): UploaderBackend | undefined
  + findAllForBoard(boardId): UploaderBackend[]
  + getById(backendId): UploaderBackend | undefined
  + getAvailable(): UploaderBackend[]
  + remove(backendId): void
  + clear(): void
  + count(): number
```

### Registration Methods

#### `register(backend)`
Registers a single backend. If a backend with the same `id` already exists, it is **overwritten**.

```typescript
const registry = new UploaderBackendRegistry();
registry.register(avrdudeBackend);
registry.register(anotherBackend);  // overwrites if same id
```

#### `registerMany(backends)`
Registers multiple backends in one call.

```typescript
registry.registerMany([avrdudeBackend, mockBackend]);
```

### Lookup Methods

#### `getById(backendId)`
Returns the backend with the given unique `id`, or `undefined` if not found.

```typescript
const backend = registry.getById("avrdude-v1");
if (!backend) throw new BackendUnavailable("avrdude-v1", "Not registered");
```

#### `findForBoard(boardId)`
Returns the first registered backend (future: filter by board compatibility).

```typescript
const backend = registry.findForBoard("uno");
```

#### `findAllForBoard(boardId)`
Returns all registered backends (future: filter by board compatibility).

```typescript
const backends = registry.findAllForBoard("uno");
// [AvrdudeBackend, MockBackend, ...]
```

#### `getAvailable()`
Returns a copy of all registered backends.

```typescript
for (const b of registry.getAvailable()) {
  console.log(`${b.name} (${b.id})`);
}
```

### Lifecycle Methods

#### `remove(backendId)`
Removes a backend by id. No-op if id not found.

#### `clear()`
Removes all registered backends.

#### `count()`
Returns the number of registered backends.

---

## ToolchainManager

Provides cached toolchain detection for all backends.

**Class:** `src/core/services/upload/ToolchainManager.ts`

### Class Diagram

```
ToolchainManager
  - cache: Map<backendId, ToolchainRecord>
  - ttl: number (default 60000ms)
  -------------------------------------------------
  + setTtl(ms): void
  + detect(backend): Promise<ToolchainInfo>
  + detectAll(backends): Promise<Map<string, ToolchainInfo>>
  + getCached(id): ToolchainInfo | undefined
  + isAvailable(info): boolean
  + invalidate(id): void
  + clearCache(): void
```

### Caching Strategy

```
backend.detect() is called
       |
       v
Cache lookup by backend.id
       |
  +----+----+
  |         |
  hit      miss
  |         |
  check     v
  TTL   call backend.detect()
  |         |
  +----+----+
  |         |
fresh   expired
  |         |
  use     call backend.detect()
  cache    |
           v
      store in cache
           |
           v
      return ToolchainInfo
```

**TTL Behavior:**
- Default cache TTL: 60,000ms (1 minute)
- Call `setTtl(0)` to disable caching (forces fresh detection every call)
- Cache stores: `{ backendId, info, lastChecked }`

### Methods

#### `detect(backend)`
Detects a single backend's toolchain status with caching.

```typescript
const info = await toolchainManager.detect(avrdudeBackend);
// Returns cached result if younger than TTL
```

#### `detectAll(backends)`
Detects all provided backends in parallel.

```typescript
const results = await toolchainManager.detectAll(registry.getAvailable());
for (const [id, info] of results) {
  console.log(`${id}: ${info.status}`);
}
```

#### `getCached(id)`
Returns cached `ToolchainInfo` or `undefined`.

#### `isAvailable(info)`
Returns `true` if the toolchain status is `"installed"` or `"outdated"`.

```typescript
if (toolchainManager.isAvailable(info)) {
  // Proceed with upload
}
```

#### `invalidate(id)`
Removes a specific entry from the cache.

#### `clearCache()`
Clears the entire detection cache.

---

## ServiceBootstrap Wiring

In `src/core/di/ServiceBootstrap.ts`, the backend system is wired into the DI container:

```typescript
// Phase 9C - Upload Backend Registry
const uploaderBackendRegistry = new UploaderBackendRegistry();
container.registerInstance("uploaderBackendRegistry", uploaderBackendRegistry);

// Phase 9C - Toolchain Manager
const toolchainManager = new ToolchainManager();
container.registerInstance("toolchainManager", toolchainManager);

// Phase 9C - AVR Dude Backend
const avrdudeBackend = new AvrdudeBackend(hardwareManager, logger);
uploaderBackendRegistry.register(avrdudeBackend);

// Phase 9B - AVR Upload Engine (refactored to use backend registry)
const avrUploadEngine = new AvrUploadEngine(uploaderBackendRegistry, logger);
uploadEngineRegistry.register(avrUploadEngine);
```

### Dependency Graph

```
HardwareManager  +---> AvrdudeBackend ---+
     ^           |                       |
     |           |                       v
     +-----------+            UploaderBackendRegistry
                              +                  ^
                              |                  |
                              v                  |
                         AvrUploadEngine --------+
                              |
                              v
                         UploadEngineRegistry
                              |
                              v
                         UploadManager
```

---

## Future Backend Integration Guide

### Adding a New Toolchain Backend (e.g., ESP32, STM32)

1. **Create the backend class** in `src/core/services/upload/backends/`:

```typescript
// EspFlashBackend.ts
import type { UploaderBackend, BackendValidationResult } from "../../types/upload/backend";
import type { UploadProgress } from "../../types/upload/progress";
import type { UploadResult } from "../../types/upload/result";
import type { ToolchainInfo } from "../../types/upload/toolchain";
import type { UploadOptions } from "../UploadEngine";

export class EspFlashBackend implements UploaderBackend {
  readonly id = "esptool-v1";
  readonly name = "ESP Flash Tool";
  readonly version = "1.0.0";

  async detect(): Promise<ToolchainInfo> {
    // Check if esptool.py is available
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      status: "installed",  // or "missing"
      supportedBoards: ["esp32", "esp8266"],
      detectedAt: Date.now(),
    };
  }

  async validate(options: UploadOptions): Promise<BackendValidationResult> {
    // Validate board, port, artifact
    return { valid: true };
  }

  async execute(options: UploadOptions, onProgress?: (p: UploadProgress) => void): Promise<UploadResult> {
    this.cancelled = false;
    const startTime = Date.now();
    try {
      // Connect and flash using esptool protocol
      return { status: "success", stage: "done", message: "OK", duration: Date.now() - startTime, timestamp: Date.now() };
    } catch (e) {
      return { status: "failure", stage: "error", message: String(e), duration: Date.now() - startTime, timestamp: Date.now() };
    }
  }

  async verify(options: UploadOptions): Promise<boolean> {
    return true; // or implement post-flash verification
  }

  async cancel(): Promise<void> {
    this.cancelled = true;
  }

  async cleanup(options: UploadOptions): Promise<void> {
    // Release resources
  }
}
```

2. **Create or update an UploadEngine** to use the new backend:

```typescript
// EspUploadEngine.ts
export class EspUploadEngine implements UploadEngine {
  constructor(private backendRegistry: UploaderBackendRegistry, private logger: LoggerService) {}

  supports(boardId: string): boolean {
    return boardId === "esp32" || boardId === "esp8266";
  }

  async upload(options: UploadOptions, onProgress?: (p: UploadProgress) => void): Promise<UploadResult> {
    const backend = this.backendRegistry.getById("esptool-v1");
    if (!backend) throw new BackendUnavailable("esptool-v1", "ESP tool not registered");
    return backend.execute(options, onProgress);
  }
  // ... other methods
}
```

3. **Register in ServiceBootstrap**:

```typescript
import { EspFlashBackend } from "../services/upload/backends/EspFlashBackend";

const espBackend = new EspFlashBackend(logger);
uploaderBackendRegistry.register(espBackend);

const espUploadEngine = new EspUploadEngine(uploaderBackendRegistry, logger);
uploadEngineRegistry.register(espUploadEngine);
```

4. **Optionally use `ToolchainManager`** to report detection status to the UI:

```typescript
const info = await toolchainManager.detect(espBackend);
// Display status badge: "ESP Flash Tool: Installed v1.0.0"
```

### Backend Selection Strategy

Currently, `AvrUploadEngine` uses a hardcoded `getById("avrdude-v1")` lookup. For engines that need to select among multiple backends for the same board, use `findForBoard()` or `findAllForBoard()`:

```typescript
// Example: multiple backends supporting "arduino" boards
async upload(options: UploadOptions): Promise<UploadResult> {
  const backends = this.backendRegistry.findAllForBoard(options.boardId);

  // Try each backend in order until one succeeds
  for (const backend of backends) {
    const validation = await backend.validate(options);
    if (validation.valid) {
      try {
        return await backend.execute(options);
      } catch (e) {
        continue; // try next backend
      }
    }
  }
  throw new BackendUnavailable("any", `No backend available for ${options.boardId}`);
}
```

### Recommended `detect()` Implementation

When implementing `detect()` for a real toolchain (not mock), follow this pattern:

```typescript
async detect(): Promise<ToolchainInfo> {
  try {
    const result = await exec("avrdude -?"); // or which, where, etc.
    return {
      id: this.id,
      name: this.name,
      version: this.parseVersion(result.stdout),
      status: "installed",
      supportedBoards: this.getSupportedBoards(),
      detectedAt: Date.now(),
    };
  } catch (e) {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      status: "missing",
      supportedBoards: [],
      detectedAt: Date.now(),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
```
