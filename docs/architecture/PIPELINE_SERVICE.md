# PipelineService — Reference

**Location:** `src/core/services/pipeline/PipelineService.ts`

`PipelineService` is the Phase 15 orchestrator. It does **not** reimplement
generation, build, or upload logic. It composes the three existing managers
and adds a unified progress model, cancellation, retry, and error mapping.

## Construction

```ts
const pipeline = new PipelineService(
  codeGenerationManager,
  buildManager,
  uploadManager,
  logger,
);
```

Registered in DI as `pipelineService` (`src/core/di/ServiceBootstrap.ts`).

## API

### `run(options, onProgress?) => Promise<PipelineResult>`

Executes the full pipeline:

1. **generate** via `CodeGenerationManager.generate`
   (`language`, `framework`, `board`, `workspaceXml`/`blocks`)
2. **build** via `BuildManager.start` — source is passed as
   `additionalArgs.sourceContent` from `SourceArtifact.sourceFiles[0].content`
3. **upload** via `UploadManager.start` — `BuildArtifact.firmwarePath` is passed
   as `UploadOptions.artifactPath`, with `portId` from the caller

Throws a `PipelineError` subclass on failure (never a raw exception).

### `cancel() => Promise<void>`

Cancels whichever stage is active:

| Active stage        | Cancels                |
|---------------------|------------------------|
| `generating`        | `codeGenerationManager.cancel()` |
| `building`          | `buildManager.cancel()`         |
| `preparing-upload` / `uploading` / `verifying` | `uploadManager.cancel()` |

### `retry(options, onProgress?) => Promise<PipelineResult>`

Re-runs the whole pipeline (used after a `recoverable` `UploadFailedError`).

### `reset()`, `getStatus()`, `getCurrentProgress()`

Lifecycle helpers and progress snapshot access.

## Options

```ts
interface PipelineOptions {
  boardId: string;          // uno | nano | mega
  framework: string;        // "arduino"
  language: string;         // "arduino-cpp"
  workspaceXml?: string;
  blocks?: Record<string, unknown>[];
  portId: string;           // usbService.getState().portKey
  baudRate?: number;
  additionalArgs?: Record<string, unknown>;
}
```

## Result

```ts
interface PipelineResult {
  status: "success" | "failure" | "cancelled";
  stage: PipelineStage;
  message: string;
  duration: number;            // total ms
  generationDuration: number;
  buildDuration: number;
  uploadDuration: number;
  sourceArtifactChecksum?: string;
  buildArtifactChecksum?: string;
  firmwarePath?: string;
  bytesUploaded?: number;
  timestamp: number;
}
```

## Events

Emitted on the global `EventBus` (`PIPELINE_EVENTS`):

- `pipeline:started`
- `pipeline:progress`
- `pipeline:stage-changed`
- `pipeline:finished`
- `pipeline:failed`
- `pipeline:cancelled`

## Error mapping

See `END_TO_END_PIPELINE.md` → *Error flow*. Each manager exception is wrapped
in the appropriate `PipelineError` subclass based on the active stage.
