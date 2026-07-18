import { describe, it, expect } from "vitest";
import {
  UploadError,
  PortUnavailableError,
  BoardNotSupportedError,
  VerificationFailedError,
  CompileArtifactMissingError,
  UploadTimeoutError,
  PermissionDeniedError,
  DeviceDisconnectedError,
  UnknownUploaderError,
} from "../../types/upload/error";

describe("UploadError model", () => {
  describe("UploadError base", () => {
    it("creates with code and message", () => {
      const err = new UploadError("TEST_CODE", "Test error", true, { foo: "bar" });
      expect(err.code).toBe("TEST_CODE");
      expect(err.message).toBe("Test error");
      expect(err.recoverable).toBe(true);
      expect(err.details).toEqual({ foo: "bar" });
      expect(err.name).toBe("UploadError");
    });

    it("defaults to non-recoverable with empty details", () => {
      const err = new UploadError("CODE", "msg");
      expect(err.recoverable).toBe(false);
      expect(err.details).toEqual({});
    });
  });

  describe("PortUnavailableError", () => {
    it("creates with portId", () => {
      const err = new PortUnavailableError("COM3");
      expect(err.code).toBe("PORT_UNAVAILABLE");
      expect(err.message).toContain("COM3");
      expect(err.recoverable).toBe(true);
      expect(err.details.portId).toBe("COM3");
      expect(err.name).toBe("PortUnavailableError");
    });
  });

  describe("BoardNotSupportedError", () => {
    it("creates with board and engine", () => {
      const err = new BoardNotSupportedError("esp32", "avr");
      expect(err.code).toBe("BOARD_NOT_SUPPORTED");
      expect(err.message).toContain("esp32");
      expect(err.recoverable).toBe(false);
      expect(err.details.boardId).toBe("esp32");
      expect(err.details.engine).toBe("avr");
    });
  });

  describe("VerificationFailedError", () => {
    it("creates with details", () => {
      const err = new VerificationFailedError({ expected: "abc", got: "xyz" });
      expect(err.code).toBe("VERIFICATION_FAILED");
      expect(err.recoverable).toBe(true);
      expect(err.details.expected).toBe("abc");
    });

    it("creates without details", () => {
      const err = new VerificationFailedError();
      expect(err.details).toEqual({});
    });
  });

  describe("CompileArtifactMissingError", () => {
    it("creates with artifact path", () => {
      const err = new CompileArtifactMissingError("/path/to/hex");
      expect(err.code).toBe("COMPILE_ARTIFACT_MISSING");
      expect(err.message).toContain("/path/to/hex");
      expect(err.recoverable).toBe(false);
      expect(err.details.artifactPath).toBe("/path/to/hex");
    });
  });

  describe("UploadTimeoutError", () => {
    it("creates with timeout", () => {
      const err = new UploadTimeoutError(30000);
      expect(err.code).toBe("TIMEOUT");
      expect(err.message).toContain("30000");
      expect(err.recoverable).toBe(true);
      expect(err.details.timeoutMs).toBe(30000);
    });
  });

  describe("PermissionDeniedError", () => {
    it("creates with portId", () => {
      const err = new PermissionDeniedError("COM3");
      expect(err.code).toBe("PERMISSION_DENIED");
      expect(err.message).toContain("COM3");
      expect(err.recoverable).toBe(true);
      expect(err.details.portId).toBe("COM3");
    });
  });

  describe("DeviceDisconnectedError", () => {
    it("creates with deviceId", () => {
      const err = new DeviceDisconnectedError("device-123");
      expect(err.code).toBe("DEVICE_DISCONNECTED");
      expect(err.message).toContain("device-123");
      expect(err.recoverable).toBe(false);
      expect(err.details.deviceId).toBe("device-123");
    });
  });

  describe("UnknownUploaderError", () => {
    it("creates with boardId", () => {
      const err = new UnknownUploaderError("pico");
      expect(err.code).toBe("UNKNOWN_UPLOADER");
      expect(err.message).toContain("pico");
      expect(err.recoverable).toBe(false);
      expect(err.details.boardId).toBe("pico");
    });
  });

  it("all errors are instances of UploadError", () => {
    const errors = [
      new PortUnavailableError("p1"),
      new BoardNotSupportedError("b1", "e1"),
      new VerificationFailedError(),
      new CompileArtifactMissingError("/a"),
      new UploadTimeoutError(1000),
      new PermissionDeniedError("p1"),
      new DeviceDisconnectedError("d1"),
      new UnknownUploaderError("b1"),
    ];
    for (const err of errors) {
      expect(err).toBeInstanceOf(UploadError);
      expect(err).toBeInstanceOf(Error);
    }
  });
});
