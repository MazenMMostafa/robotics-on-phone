import type { BuildArtifact } from "./artifact";

export interface BuildOptions {
  boardId: string;
  framework: string;
  sourcePath?: string;
  sketchPath?: string;
  additionalArgs?: Record<string, unknown>;
}

export interface BuildProgress {
  stage: BuildStage;
  percent: number;
  messages: string[];
  errors: string[];
  timestamp: number;
}

export type BuildStage =
  | "queued"
  | "preparing"
  | "compiling"
  | "linking"
  | "optimizing"
  | "finishing"
  | "done"
  | "error"
  | "cancelled";

export interface BuildResult {
  status: "success" | "failure" | "cancelled";
  stage: BuildStage;
  message: string;
  artifact?: BuildArtifact;
  duration: number;
  timestamp: number;
}

export interface BuildEngine {
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
