# Build System Architecture

## Overview

The Build System provides a modular, engine-based architecture for producing firmware artifacts. It follows the same patterns as the Upload Framework:

- **BuildEngine** — interface for compilation backends
- **BuildEngineRegistry** — registry with priority-based selection
- **BuildManager** — orchestrates builds, manages queue, caching, and progress
- **BuildCache** — LRU-evicting artifact cache
- **BuildArtifact** — the result of a successful build, consumed by the Upload Framework

## Architecture Diagram

```
BuildManager
  ├── BuildEngineRegistry
  │     ├── ArduinoCliEngine (future)
  │     ├── PlatformIOEngine (future)
  │     ├── EspIdfEngine (future)
  │     └── MockBuildEngine (testing)
  ├── BuildCache (LRU, in-memory)
  ├── EventBus (build lifecycle events)
  └── LoggerService
```

## Key Responsibilities

| Component | Responsibility |
|-----------|---------------|
| `BuildEngine` | Interface for compilation backends |
| `BuildEngineRegistry` | Register, lookup, priority-sort engines |
| `BuildManager` | Queue, execute, cancel, retry builds |
| `BuildCache` | In-memory LRU cache of BuildArtifacts |
| `BuildArtifact` | Firmware metadata (path, checksum, size) |

## Engine Priority

| Engine ID prefix | Priority |
|-----------------|----------|
| `arduino-cli*` | 100 |
| `platformio*`  | 80  |
| `esp-idf*`     | 70  |
| `cloud*`       | 60  |
| `custom*`      | 50  |
| (other)        | 0   |

## Error Model

| Error               | Code                | Recoverable |
|---------------------|---------------------|-------------|
| CompilerMissing     | COMPILER_MISSING    | No          |
| CompilationFailed   | COMPILATION_FAILED  | Yes         |
| InvalidProject      | INVALID_PROJECT     | No          |
| UnsupportedFramework| UNSUPPORTED_FRAMEWORK| No          |
| ArtifactNotFound    | ARTIFACT_NOT_FOUND  | No          |

## Events

| Event               | When                  |
|---------------------|-----------------------|
| `build:queued`      | Build added to queue  |
| `build:started`     | Build starts          |
| `build:preparing`   | Engine prepare phase  |
| `build:progress`    | Progress update       |
| `build:finished`    | Build succeeds        |
| `build:failed`      | Build fails           |
| `build:cancelled`   | Build cancelled       |

## Extension API

Extensions can read build state via `ExtensionContext`:

- `getBuildStatus()` — returns `"idle"`, `"building"`, `"done"`, `"error"`
- `getBuildProgress()` — returns `{ stage, percent, messages }` or `null`
- `hasQueuedBuilds()` — returns `boolean`
