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
  │     ├── ArduinoCliEngine (arduino-cli-v1)  ← Phase 14
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

## Phase 14 — Arduino CLI Build Engine

The `ArduinoCliBuildEngine` (id: `arduino-cli-v1`) is the first concrete build backend. It has the highest registry priority (100) and is therefore selected first for the `arduino` framework.

| Component | File | Responsibility |
|-----------|------|----------------|
| `ArduinoCliBuildEngine` | `services/build/arduino/ArduinoCliBuildEngine.ts` | Implements `BuildEngine`: writes the generated sketch to a temp dir, invokes `arduino-cli compile`, captures the `.hex`/`.elf`/`.map` artifacts, computes a SHA-256 checksum, and produces a `BuildArtifact`. |
| `ArduinoCliAdapter` | `services/build/arduino/ArduinoCliAdapter.ts` | Thin wrapper over `arduino-cli`: tool detection (`detectTool`), `compile()` execution, and output parsing (warnings/errors). Injectable for testing. |

**Supported boards** (FQBN mapping in `services/build/arduino/types.ts`):
- `uno` → `arduino:avr:uno`
- `nano` → `arduino:avr:nano`
- `mega` → `arduino:avr:mega2560`

**Lifecycle:**
1. `supports(boardId, "arduino")` — board must be in the FQBN table.
2. `prepare()` — validates board and detects the `arduino-cli` tool; throws `InvalidBoard` / `CompilerMissing` otherwise.
3. `build()` — writes `sketch.ino`, runs `arduino-cli compile --fqbn <fqbn>`, locates the produced `.hex`, and returns a `BuildArtifact` with `firmwarePath`, `hexPath`, `elfPath`, `mapPath`, `size`, and `checksum`.
4. `verify(artifact)` — re-reads the firmware file and compares its SHA-256 against `artifact.checksum`.
5. `cleanup()` — removes the temporary build directory.

**Error model additions** (Phase 14, see `types/build/error.ts`):
- `InvalidBoard` — board not in the Arduino CLI FQBN table (`INVALID_BOARD`, not recoverable)
- `SyntaxError` — malformed source (`SYNTAX_ERROR`, recoverable)
- `LibraryMissing` — required library absent (`LIBRARY_MISSING`, recoverable)
- `BuildTimeout` — build exceeded timeout (`BUILD_TIMEOUT`, recoverable)

The engine is registered in `di/ServiceBootstrap.ts` and exposed as the `arduinoCliBuildEngine` container instance.

