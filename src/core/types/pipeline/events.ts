export const PIPELINE_EVENTS = {
  STARTED: "pipeline:started",
  PROGRESS: "pipeline:progress",
  STAGE_CHANGED: "pipeline:stage-changed",
  FINISHED: "pipeline:finished",
  FAILED: "pipeline:failed",
  CANCELLED: "pipeline:cancelled",
} as const;

export type PipelineEventName = (typeof PIPELINE_EVENTS)[keyof typeof PIPELINE_EVENTS];
