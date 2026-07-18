export type PipelineStage =
  | "idle"
  | "generating"
  | "building"
  | "preparing-upload"
  | "uploading"
  | "verifying"
  | "completed"
  | "cancelled"
  | "failed";

export interface PipelineProgress {
  stage: PipelineStage;
  percent: number;
  messages: string[];
  errors: string[];
  timestamp: number;
}

export function createInitialPipelineProgress(): PipelineProgress {
  return {
    stage: "idle",
    percent: 0,
    messages: [],
    errors: [],
    timestamp: Date.now(),
  };
}

export type PipelineProgressHandler = (progress: PipelineProgress) => void;
