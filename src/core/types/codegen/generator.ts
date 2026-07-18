import type { SourceArtifact } from "./artifact";

export interface GenerationOptions {
  language: string;
  framework: string;
  board: string;
  workspaceXml?: string;
  blocks?: Record<string, unknown>[];
  additionalArgs?: Record<string, unknown>;
}

export interface GenerationProgress {
  stage: GenerationStage;
  percent: number;
  messages: string[];
  errors: string[];
  timestamp: number;
}

export type GenerationStage =
  | "queued"
  | "validating"
  | "preparing"
  | "generating"
  | "optimizing"
  | "finishing"
  | "done"
  | "error"
  | "cancelled";

export interface GenerationResult {
  status: "success" | "failure" | "cancelled";
  stage: GenerationStage;
  message: string;
  artifact?: SourceArtifact;
  duration: number;
  timestamp: number;
}

export interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  blockId?: string;
  blockType?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface CodeGenerator {
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
