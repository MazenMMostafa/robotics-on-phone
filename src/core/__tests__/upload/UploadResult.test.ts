import { describe, it, expect } from "vitest";
import type { UploadResult, UploadResultStatus } from "../../types/upload/result";

describe("UploadResult", () => {
  it("supports success status", () => {
    const result: UploadResult = {
      status: "success",
      stage: "done",
      message: "Upload successful",
      duration: 1234,
      bytesUploaded: 8192,
      timestamp: Date.now(),
    };
    expect(result.status).toBe("success");
    expect(result.duration).toBeGreaterThan(0);
  });

  it("supports failure status with error info", () => {
    const result: UploadResult = {
      status: "failure",
      stage: "uploading",
      message: "Upload failed",
      duration: 500,
      errorCode: "PORT_UNAVAILABLE",
      errorMessage: "Port not found",
      timestamp: Date.now(),
    };
    expect(result.status).toBe("failure");
    expect(result.errorCode).toBe("PORT_UNAVAILABLE");
  });

  it("supports cancelled status", () => {
    const result: UploadResult = {
      status: "cancelled",
      stage: "cancelled",
      message: "Cancelled by user",
      duration: 200,
      timestamp: Date.now(),
    };
    expect(result.status).toBe("cancelled");
  });

  it("enforces UploadResultStatus type", () => {
    const statuses: UploadResultStatus[] = ["success", "failure", "cancelled"];
    expect(statuses).toHaveLength(3);
  });
});
