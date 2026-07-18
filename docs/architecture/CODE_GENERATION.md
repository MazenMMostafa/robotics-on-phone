# Code Generation Architecture

## Overview

The Code Generation Framework converts Blockly workspaces into an intermediate source representation. It follows the same patterns as the Build System and Upload Framework:

- **CodeGenerator** — interface for language-specific code generation backends
- **CodeGeneratorRegistry** — registry with priority-based language matching
- **CodeGenerationManager** — orchestrates generation, manages queue, validation, progress
- **SourceArtifact** — the intermediate source representation (consumed by Build System)

## Architecture Diagram

```
CodeGenerationManager
  ├── CodeGeneratorRegistry
  │     ├── ArduinoCppGenerator (future)
  │     ├── EspIdfCppGenerator (future)
  │     ├── MicroPythonGenerator (future)
  │     ├── CircuitPythonGenerator (future)
  │     ├── PythonGenerator (future)
  │     ├── JavaScriptGenerator (future)
  │     └── MockCodeGenerator (testing)
  ├── EventBus (generation lifecycle events)
  └── LoggerService

Generated SourceArtifact → BuildManager → BuildArtifact → UploadManager
```

## Key Components

| Component | Responsibility |
|-----------|---------------|
| `CodeGenerator` | Interface for language-specific generators |
| `CodeGeneratorRegistry` | Register, lookup, priority-sort generators |
| `CodeGenerationManager` | Queue, execute, cancel, retry generation |
| `SourceArtifact` | Intermediate source files, headers, assets |
| `ValidationResult` | Workspace validation (missing/unsupported blocks) |

## Generator Priority

| Generator ID prefix | Priority |
|--------------------|----------|
| `arduino-cpp*`     | 100      |
| `esp-idf-cpp*`     | 90       |
| `micropython*`     | 80       |
| `circuitpython*`   | 70       |
| `python*`          | 60       |
| `javascript*`      | 50       |
| `custom*`          | 40       |
| (other)            | 0        |

## Pipeline

```
Workspace XML → validate() → prepare() → generate() → SourceArtifact
                                                    ↘
                                              Build System
                                              (firmware compile)
```

## Extension API

Extensions can read generation state via `ExtensionContext`:

- `getGenerationStatus()` — `"idle"`, `"generating"`, `"done"`, `"error"`
- `getGenerationProgress()` — `{ stage, percent, messages }` or `null`
- `hasQueuedGenerations()` — `boolean`
