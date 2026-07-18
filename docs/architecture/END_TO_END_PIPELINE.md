# End-to-End Upload Pipeline

**Phase 15 — First MVP**

This document describes the first complete Blockly → Arduino upload workflow.
This is **not** an architecture phase: no framework, manager, or platform was
redesigned. `PipelineService` is a thin orchestrator that composes the
already-existing managers.

## Supported boards
- Arduino Uno (`uno`)
- Arduino Nano (`nano`)
- Arduino Mega 2560 (`mega`)

> ESP32 / ESP8266 / Serial Monitor / OTA / Library Manager are **out of scope**
> for this MVP (see STOP condition).

---

## Pipeline diagram

```
┌──────────────────┐
│  Blockly Workspace│
└────────┬─────────┘
         │ workspaceXml
         ▼
┌──────────────────────────┐
│  CodeGenerationManager    │  ArduinoCppGenerator
│  (Phase 12 / 13)          │
└────────┬─────────────────┘
         │ SourceArtifact (.cpp)
         ▼
┌──────────────────────────┐
│  BuildManager             │  ArduinoCliBuildEngine
│  (Phase 11 / 14)          │  → real arduino-cli 1.4.1
└────────┬─────────────────┘
         │ BuildArtifact (.hex + checksum)
         ▼
┌──────────────────────────┐
│  UploadManager            │  AvrUploadEngine → AvrdudeBackend
│  (Phase 9A / 9B / 9C)     │
└────────┬─────────────────┘
         │ STK500v1 / v2 protocol
         ▼
┌──────────────────────────┐
│  Arduino Uno / Nano / Mega│  Pin 13 LED blinks
└──────────────────────────┘
```

## Sequence diagram

```
UI (EditorPage)
  │  Press Upload
  ▼
PipelineService.run(options)
  │
  ├─ codeGenManager.generate() ............ GENERATING
  │     └─ ArduinoCppGenerator → SourceArtifact
  │
  ├─ buildManager.start() ................. BUILDING
  │     └─ ArduinoCliBuildEngine (sourceContent) → BuildArtifact (.hex)
  │
  ├─ (stage preparing-upload) ............. PREPARING UPLOAD
  │
  ├─ uploadManager.start({artifactPath}) .. UPLOADING
  │     └─ AvrUploadEngine → AvrdudeBackend → STK500
  │
  ├─ (stage verifying) .................... VERIFYING
  │     └─ UploadManager.verify() signature check
  │
  └─ return PipelineResult(status: success)  COMPLETED
```

## Unified progress model

Stages (`PipelineStage`):

`idle → generating → building → preparing-upload → uploading → verifying → completed`
(or `cancelled` / `failed` on abort/error).

`PipelineProgress` carries `stage`, `percent`, `messages`, `errors`, `timestamp`.
The UI subscribes through the `onProgress` callback (and `EventBus`
`pipeline:*` events) and renders a live status line.

## Error flow

Every failure is mapped into a `PipelineError` so the UI never sees a raw
exception:

| Stage        | Error class             | code               | recoverable |
|--------------|-------------------------|--------------------|-------------|
| generating   | `GenerationFailedError` | `GENERATION_FAILED`| no          |
| building     | `BuildFailedError`      | `BUILD_FAILED`     | no          |
| preparing/uploading/verifying | `UploadFailedError` | `UPLOAD_FAILED` | yes |
| user cancel  | `PipelineCancelledError`| `CANCELLED`        | no          |
| unknown      | `UnknownPipelineError`  | `UNKNOWN_FAILURE`  | no          |

The `code` and a friendly `message` are surfaced through the existing
`NotificationService` (error toast); success uses a success toast.

## Files

**Created**
- `src/core/types/pipeline/error.ts`
- `src/core/types/pipeline/progress.ts`
- `src/core/types/pipeline/options.ts`
- `src/core/types/pipeline/events.ts`
- `src/core/types/pipeline/index.ts`
- `src/core/services/pipeline/PipelineService.ts`
- `src/core/services/pipeline/index.ts`
- `src/core/__tests__/pipeline/PipelineService.test.ts`

**Modified**
- `src/core/di/ServiceBootstrap.ts` — registers `pipelineService`
- `src/features/editor/pages/EditorPage.tsx` — Upload button now drives the pipeline

See `PIPELINE_SERVICE.md` (service reference) and `FIRST_MVP_TEST_GUIDE.md`
(hardware test procedure).
