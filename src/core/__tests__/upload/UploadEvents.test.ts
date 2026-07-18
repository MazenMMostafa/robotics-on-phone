import { describe, it, expect } from "vitest";
import { UPLOAD_EVENTS } from "../../types/upload/events";
import { UPLOAD_EVENTS_CONST } from "../../services/upload/UploadEvents";

describe("UploadEvents", () => {
  it("defines all event names in UPLOAD_EVENTS", () => {
    expect(UPLOAD_EVENTS.UPLOAD_QUEUED).toBe("upload:queued");
    expect(UPLOAD_EVENTS.UPLOAD_STARTED).toBe("upload:started");
    expect(UPLOAD_EVENTS.UPLOAD_PREPARING).toBe("upload:preparing");
    expect(UPLOAD_EVENTS.UPLOAD_PROGRESS).toBe("upload:progress");
    expect(UPLOAD_EVENTS.UPLOAD_VERIFYING).toBe("upload:verifying");
    expect(UPLOAD_EVENTS.UPLOAD_FINISHED).toBe("upload:finished");
    expect(UPLOAD_EVENTS.UPLOAD_CANCELLED).toBe("upload:cancelled");
    expect(UPLOAD_EVENTS.UPLOAD_FAILED).toBe("upload:failed");
  });

  it("defines all event names in UPLOAD_EVENTS_CONST", () => {
    expect(UPLOAD_EVENTS_CONST.QUEUED).toBe("upload:queued");
    expect(UPLOAD_EVENTS_CONST.STARTED).toBe("upload:started");
    expect(UPLOAD_EVENTS_CONST.PREPARING).toBe("upload:preparing");
    expect(UPLOAD_EVENTS_CONST.PROGRESS).toBe("upload:progress");
    expect(UPLOAD_EVENTS_CONST.VERIFYING).toBe("upload:verifying");
    expect(UPLOAD_EVENTS_CONST.FINISHED).toBe("upload:finished");
    expect(UPLOAD_EVENTS_CONST.CANCELLED).toBe("upload:cancelled");
    expect(UPLOAD_EVENTS_CONST.FAILED).toBe("upload:failed");
  });

  it("both event objects are consistent", () => {
    expect(UPLOAD_EVENTS.UPLOAD_QUEUED).toBe(UPLOAD_EVENTS_CONST.QUEUED);
    expect(UPLOAD_EVENTS.UPLOAD_STARTED).toBe(UPLOAD_EVENTS_CONST.STARTED);
    expect(UPLOAD_EVENTS.UPLOAD_PREPARING).toBe(UPLOAD_EVENTS_CONST.PREPARING);
    expect(UPLOAD_EVENTS.UPLOAD_PROGRESS).toBe(UPLOAD_EVENTS_CONST.PROGRESS);
    expect(UPLOAD_EVENTS.UPLOAD_VERIFYING).toBe(UPLOAD_EVENTS_CONST.VERIFYING);
    expect(UPLOAD_EVENTS.UPLOAD_FINISHED).toBe(UPLOAD_EVENTS_CONST.FINISHED);
    expect(UPLOAD_EVENTS.UPLOAD_CANCELLED).toBe(UPLOAD_EVENTS_CONST.CANCELLED);
    expect(UPLOAD_EVENTS.UPLOAD_FAILED).toBe(UPLOAD_EVENTS_CONST.FAILED);
  });
});
