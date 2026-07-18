# Generator API

## Interface

```typescript
interface CodeGenerator {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly supportedLanguages: string[];
  readonly supportedFrameworks: string[];

  supports(language: string, framework: string): boolean;
  prepare(options: GenerationOptions): Promise<void>;
  generate(options: GenerationOptions, onProgress?: (progress: GenerationProgress) => void): Promise<GenerationResult>;
  validate(options: GenerationOptions): Promise<ValidationResult>;
  cleanup(options: GenerationOptions): Promise<void>;
}
```

## Lifecycle

1. `supports(language, framework)` — synchronous capability check
2. `validate(options)` — workspace validation before generation
3. `prepare(options)` — initialize resources, load templates
4. `generate(options, onProgress?)` — produce `SourceArtifact`
5. `cleanup(options)` — release temporary resources

## GenerationOptions

```typescript
interface GenerationOptions {
  language: string;           // e.g. "arduino-cpp", "micropython"
  framework: string;          // e.g. "arduino", "esp-idf"
  board: string;              // e.g. "uno", "esp32"
  workspaceXml?: string;      // Blockly workspace XML
  blocks?: Record<string, unknown>[];  // parsed block data
  additionalArgs?: Record<string, unknown>;
}
```

## GenerationProgress

```typescript
interface GenerationProgress {
  stage: GenerationStage;  // "queued" | "validating" | "preparing" | "generating" | "optimizing" | "finishing" | "done" | "error" | "cancelled"
  percent: number;         // 0–100
  messages: string[];      // informational
  errors: string[];        // error messages
  timestamp: number;
}
```

## ValidationResult

```typescript
interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  blockId?: string;
  blockType?: string;
}
```

## Implementing a CodeGenerator

1. Create a new file under `src/core/services/codegen/`
2. Implement the `CodeGenerator` interface
3. Register in `CodeGeneratorRegistry`
4. Add coverage thresholds in `vitest.config.ts`
5. Write unit tests following `MockCodeGenerator` patterns
