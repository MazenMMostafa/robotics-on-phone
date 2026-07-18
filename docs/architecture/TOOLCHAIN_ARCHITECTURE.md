# Toolchain Architecture

## Overview

The toolchain architecture is a layered upload system that separates board-level orchestration from hardware-level programming. It introduces a **Backend Abstraction Layer** between `UploadEngine` instances and the physical programming protocols.

## Architecture Diagram

```
+------------------------------------------------------------------+
|                        UploadManager                              |
|  (orchestrates lifecycle: prepare -> upload -> verify -> cleanup) |
+----------------------------+-------------------------------------+
                             |
                     +-------v--------+
                     | UploadEngine    |  e.g. AvrUploadEngine
                     | (board-level)   |
                     +-------+--------+
                             |
                     +-------v--------+
                     |UploaderBackend  |
                     |  Registry       |  finds backend by id / board
                     +-------+--------+
                             |
         +-------------------+-------------------+
         |                                       |
+--------v--------+                  +-----------v--------+
|  AvrdudeBackend |                  |  MockBackend        |
| (AVR flashing)  |                  | (testing/stub)     |
+--------+--------+                  +--------------------+
         |
+--------v--------+
|  STK500V1Protocol|  or  STK500V2Protocol
|  (serial comm)   |
+--------+--------+
         |
+--------v--------+
| ConnectionAdapter|  USB / Serial / Bluetooth / WiFi
+-----------------+
```

## Layer Responsibilities

| Layer | Responsibility | Key Classes |
|-------|---------------|-------------|
| **Orchestration** | Upload lifecycle, progress reporting, error handling | `UploadManager`, `UploadEngine` |
| **Backend Abstraction** | Pluggable toolchain implementations | `UploaderBackend` interface |
| **Registry** | Backend discovery, lookup, lifecycle | `UploaderBackendRegistry` |
| **Backend Implementation** | Actual programming logic | `AvrdudeBackend`, `MockBackend` |
| **Protocol** | MCU-specific flash protocols | `STK500V1Protocol`, `STK500V2Protocol` |
| **Transport** | Physical connection adapters | `USBConnection`, `SerialConnection` |

## Data Flow

### Upload Flow

```
UploadManager.upload(options)
  |
  +-> UploadEngineRegistry.find(boardId)
  |      returns AvrUploadEngine (or other engine for this board)
  |
  +-> AvrUploadEngine.upload(options)
  |      |
  |      +-> UploaderBackendRegistry.getById("avrdude-v1")
  |      |      returns AvrdudeBackend instance
  |      |
  |      +-> AvrdudeBackend.validate(options)
  |      |      checks board support, port, artifact path
  |      |
  |      +-> AvrdudeBackend.execute(options, onProgress)
  |             |
  |             +-> connection.connect(baudRate)
  |             +-> protocol.sync()
  |             +-> protocol.enterProgrammingMode()
  |             +-> for each page:
  |             |      protocol.loadAddress(addr)
  |             |      protocol.programPage(data, size)
  |             +-> protocol.leaveProgrammingMode()
  |             +-> connection.disconnect()
  |             +-> return UploadResult
  |
  +-> return UploadResult to UploadManager
```

### Toolchain Detection Flow

```
ToolchainManager.detect(backend)
  |
  +-> Check cache (TTL = 60s by default)
  |      if valid cache hit -> return cached ToolchainInfo
  |
  +-> backend.detect()
  |      returns ToolchainInfo { id, name, version, status, supportedBoards }
  |
  +-> Store in cache with timestamp
  +-> return ToolchainInfo
```

## Component Responsibilities

### UploadEngine (Interface)
- Board-level support check (`supports(boardId)`)
- Upload lifecycle: `prepare` -> `upload` -> `verify` -> `cleanup`
- Delegates actual programming to backends via registry

### UploaderBackend (Interface)
- `detect()` - Self-report toolchain installation status
- `validate()` - Validate options before execution
- `execute()` - Perform the actual upload (flash the device)
- `verify()` - Verify device signature after upload
- `cancel()` - Cancel an in-progress upload
- `cleanup()` - Release resources

### UploaderBackendRegistry
- Stores registered backends in order
- Supports lookup by id (`getById`)
- Supports lookup by board compatibility (`findForBoard`, `findAllForBoard`)
- Supports bulk operations (`registerMany`, `clear`)
- Backends can be discovered and registered at any time

### ToolchainManager
- Provides caching of `detect()` results (60s default TTL)
- Bulk detection of multiple backends (`detectAll`)
- Status helpers (`isAvailable` to check if a toolchain can be used)
- Explicit cache invalidation

## Extension Points

### Adding a New Backend Type

1. Implement the `UploaderBackend` interface in `src/core/services/upload/backends/`
2. Register with `UploaderBackendRegistry` in `ServiceBootstrap`
3. Optionally create a new `UploadEngine` subclass or add the backend to an existing engine's lookup logic

The `AvrUploadEngine` is currently hardcoded to look up `"avrdude-v1"`. To support multiple backends per engine, engines can use `findForBoard()` or `findAllForBoard()` to select the most appropriate backend.

### Adding a New UploadEngine

1. Implement the `UploadEngine` interface
2. Register with `UploadEngineRegistry` in `ServiceBootstrap`
3. The engine can use `UploaderBackendRegistry` to delegate to backends, or implement standalone logic

## Backend Discovery Lifecycle

```
Application Startup
  |
  +-> ServiceBootstrap.bootstrapContainer()
         |
         +-> new UploaderBackendRegistry()
         +-> new ToolchainManager()
         +-> new AvrdudeBackend(hardwareManager, logger)
         +-> registry.register(avrdudeBackend)
         +-> new AvrUploadEngine(registry, logger)
         +-> engineRegistry.register(avrEngine)
```

At runtime, `ToolchainManager.detect()` can be called to discover and cache backend capabilities. The UI can use this to display toolchain status before attempting an upload.

## File Layout

```
src/core/
  types/upload/
    backend.ts       - UploaderBackend interface, BackendValidationResult
    toolchain.ts     - ToolchainInfo, ToolchainStatus
    error.ts         - All upload error classes
    result.ts        - UploadResult
    progress.ts      - UploadProgress
    events.ts        - Upload lifecycle event names

  services/upload/
    UploadEngine.ts         - UploadEngine interface, UploadOptions
    UploaderBackendRegistry.ts - Backend registry service
    ToolchainManager.ts     - Toolchain detection and caching

    backends/
      AvrdudeBackend.ts     - AVR Dude implementation
      MockBackend.ts        - Test/mock implementation
      index.ts              - Barrel exports

    avr/
      AvrUploadEngine.ts    - AVR board-level upload engine
      AvrBoardProfile.ts    - AVR board definitions (uno, nano, mega)
      Stk500V1Protocol.ts   - STK500 v1 serial protocol
      Stk500V2Protocol.ts   - STK500 v2 serial protocol
