# Upload Architecture

## Overview

The Upload Framework provides a modular, extensible architecture for uploading compiled firmware to microcontroller boards. Every upload engine implements the same `UploadEngine` interface, and the `UploadManager` coordinates the entire lifecycle.

```
┌───────────────────────────────────────────────────────────────┐
│                       ExtensionContext                        │
│   getUploadStatus() · getUploadProgress() · hasQueuedUploads()│
└──────────────────────┬────────────────────────────────────────┘
                       │ DI: container.get("uploadManager")
                       ▼
┌───────────────────────────────────────────────────────────────┐
│                        UploadManager                          │
│  start · cancel · retry · enqueue · processQueue · reset      │
│  status · activeEngine · progress                             │
│  delegates to UploadEngineRegistry                            │
└──────┬───────────────────────────────────────────┬────────────┘
       │                                           │
       │  findForBoard(boardId)                    │  EventBus events:
       ▼                                           │  upload:queued, :started,
┌──────────────────────┐                           │  :preparing, :progress,
│ UploadEngineRegistry │                           │  :verifying, :finished,
│ register · find      │                           │  :cancelled, :failed
│ findAll · getById    │                           └──────────────┘
│ priority resolution  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                        UploadEngine Interface                     │
│  supports() · prepare() · upload() · verify() · cancel() · cleanup│
├──────────────────────────────────────────────────────────────────┤
│  Future implementations:                                          │
│  ArduinoAVR · ArduinoCLI · ESP32 · ESP8266 · RP2040 · STM32     │
└──────────────────────────────────────────────────────────────────┘
```

## Core Components

### UploadManager (`src/core/services/upload/UploadManager.ts`)
Single entry point for all upload operations. Manages status, progress, queue, and delegates to engines.

- `start(options)` — find engine and run pipeline
- `startWithEngine(engineId, options)` — run with specific engine
- `cancel()` — cancel running upload
- `retry(options)` — retry with same options
- `enqueue(options)` — add to upload queue
- `processQueue()` — process pending queue
- `reset()` — reset state to idle
- `getStatus()` / `getCurrentProgress()` / `getActiveEngine()` / `hasQueuedUploads()` — queries

### UploadEngine Interface (`src/core/services/upload/UploadEngine.ts`)
Every upload engine must implement:

| Method | Purpose |
|--------|---------|
| `supports(boardId)` | Whether this engine can upload to the given board |
| `prepare(options)` | Set up the device for upload (e.g., enter bootloader) |
| `upload(options, onProgress?)` | Perform the upload with progress callback |
| `verify(options)` | Verify the uploaded firmware (checksum, compare) |
| `cancel()` | Abort a running upload |
| `cleanup(options)` | Reset device state after upload |

### UploadEngineRegistry (`src/core/services/upload/UploadEngineRegistry.ts`)
Manages the collection of upload engines with priority-based resolution.

- `register(engine)` / `registerMany(engines)`
- `findForBoard(boardId)` — returns highest-priority matching engine
- `findAllForBoard(boardId)` — returns all matching engines sorted by priority
- `getById(engineId)` / `getAll()` / `remove(engineId)` / `clear()` / `count()`

Priority: arduino-avr (100) > arduino-cli (80) > esp32 (70) > esp8266 (60) > rp2040 (50) > stm32 (40) > custom (0)

### Types

- `UploadProgress` (`src/core/types/upload/progress.ts`) — stage, percent, ETA, speed, messages, errors
- `UploadError` hierarchy (`src/core/types/upload/error.ts`) — typed errors for port/board/verification/artifact/timeout/permission/device/unknown issues
- `UploadResult` (`src/core/types/upload/result.ts`) — status (success/failure/cancelled), duration, bytes
- `UploadBoardMapping` (`src/core/types/upload/boardMapping.ts`) — per-board upload profile (preferred engine, bootloader, baud rate, reset/verification strategy)
- `UploadOptions` (in `UploadEngine.ts`) — boardId, portId, artifactPath, baudRate, additionalArgs

### Upload Events

8 events emitted on the EventBus: `upload:queued`, `upload:started`, `upload:preparing`, `upload:progress`, `upload:verifying`, `upload:finished`, `upload:cancelled`, `upload:failed`.

### ExtensionContext Integration

Three read-only methods exposed to extensions:

- `getUploadStatus()` — returns "idle" | "running" | "cancelling" | "done" | "error"
- `getUploadProgress()` — returns `{ stage, percent, messages }` or null
- `hasQueuedUploads()` — boolean

## File Reference

| File | Purpose |
|------|---------|
| `src/core/types/upload/progress.ts` | UploadProgress model + factory |
| `src/core/types/upload/error.ts` | UploadError hierarchy (8 classes) |
| `src/core/types/upload/events.ts` | UPLOAD_EVENTS constants |
| `src/core/types/upload/result.ts` | UploadResult type |
| `src/core/types/upload/boardMapping.ts` | UploadBoardMapping type |
| `src/core/types/upload/index.ts` | Barrel exports |
| `src/core/services/upload/UploadEngine.ts` | UploadEngine interface + UploadOptions |
| `src/core/services/upload/UploadEngineRegistry.ts` | Engine registry with priority |
| `src/core/services/upload/UploadManager.ts` | Central upload manager |
| `src/core/services/upload/UploadEvents.ts` | UPLOAD_EVENTS_CONST for services |
| `src/core/services/upload/index.ts` | Barrel exports |
| `src/core/di/ServiceBootstrap.ts` | DI registration (uploadEngineRegistry, uploadManager) |
