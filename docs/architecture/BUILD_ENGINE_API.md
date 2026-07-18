# Build Engine API

## Interface

```typescript
interface BuildEngine {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly supportedFrameworks: string[];

  supports(boardId: string, framework: string): boolean;
  prepare(options: BuildOptions): Promise<void>;
  build(options: BuildOptions, onProgress?: (progress: BuildProgress) => void): Promise<BuildResult>;
  verify(artifact: BuildArtifact): Promise<boolean>;
  cleanup(options: BuildOptions): Promise<void>;
}
```

## Lifecycle

1. `supports(boardId, framework)` — synchronous check
2. `prepare(options)` — validate toolchain, resolve dependencies
3. `build(options, onProgress?)` — execute compilation, report progress, return artifact
4. `verify(artifact)` — post-build integrity check (checksum)
5. `cleanup(options)` — release temporary resources

## BuildOptions

```typescript
interface BuildOptions {
  boardId: string;
  framework: string;
  sourcePath?: string;
  sketchPath?: string;
  additionalArgs?: Record<string, unknown>;
}
```

## BuildProgress

```typescript
interface BuildProgress {
  stage: BuildStage;      // "queued" | "preparing" | "compiling" | "linking" | "optimizing" | "finishing" | "done" | "error" | "cancelled"
  percent: number;        // 0–100
  messages: string[];     // informational messages
  errors: string[];       // error messages
  timestamp: number;
}
```

## BuildResult

```typescript
interface BuildResult {
  status: "success" | "failure" | "cancelled";
  stage: BuildStage;
  message: string;
  artifact?: BuildArtifact;  // present only on success
  duration: number;
  timestamp: number;
}
```

## Implementing a BuildEngine

1. Create a new file under `src/core/services/build/engines/`
2. Implement the `BuildEngine` interface
3. Register in `BuildEngineRegistry`
4. Add coverage thresholds in `vitest.config.ts`
5. Write unit tests following `MockBuildEngine` patterns
