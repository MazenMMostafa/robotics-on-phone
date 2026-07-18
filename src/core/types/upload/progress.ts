export type UploadStage =
  | "idle"
  | "validating"
  | "compiling"
  | "preparing"
  | "uploading"
  | "verifying"
  | "cleaning"
  | "done"
  | "cancelled"
  | "error";

export interface UploadProgress {
  stage: UploadStage;
  percent: number;
  estimatedRemaining: number;
  speed: number;
  messages: string[];
  errors: string[];
  timestamp: number;
}

export function createInitialProgress(): UploadProgress {
  return {
    stage: "idle",
    percent: 0,
    estimatedRemaining: 0,
    speed: 0,
    messages: [],
    errors: [],
    timestamp: Date.now(),
  };
}
