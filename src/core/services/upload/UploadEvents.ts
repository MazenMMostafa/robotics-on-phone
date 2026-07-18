export const UPLOAD_EVENTS_CONST = {
  QUEUED: "upload:queued",
  STARTED: "upload:started",
  PREPARING: "upload:preparing",
  PROGRESS: "upload:progress",
  VERIFYING: "upload:verifying",
  FINISHED: "upload:finished",
  CANCELLED: "upload:cancelled",
  FAILED: "upload:failed",
} as const;
