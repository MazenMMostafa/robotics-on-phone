export class UploadError extends Error {
  readonly code: string;
  readonly recoverable: boolean;
  readonly details: Record<string, unknown>;

  constructor(code: string, message: string, recoverable = false, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "UploadError";
    this.code = code;
    this.recoverable = recoverable;
    this.details = details;
  }
}

export class PortUnavailableError extends UploadError {
  constructor(portId: string, message?: string) {
    super(
      "PORT_UNAVAILABLE",
      message ?? `Port "${portId}" is not available`,
      true,
      { portId },
    );
    this.name = "PortUnavailableError";
  }
}

export class BoardNotSupportedError extends UploadError {
  constructor(boardId: string, engine: string, message?: string) {
    super(
      "BOARD_NOT_SUPPORTED",
      message ?? `Board "${boardId}" is not supported by upload engine "${engine}"`,
      false,
      { boardId, engine },
    );
    this.name = "BoardNotSupportedError";
  }
}

export class VerificationFailedError extends UploadError {
  constructor(details: Record<string, unknown> = {}) {
    super(
      "VERIFICATION_FAILED",
      "Upload verification failed",
      true,
      details,
    );
    this.name = "VerificationFailedError";
  }
}

export class CompileArtifactMissingError extends UploadError {
  constructor(artifactPath: string, message?: string) {
    super(
      "COMPILE_ARTIFACT_MISSING",
      message ?? `Compile artifact not found at "${artifactPath}"`,
      false,
      { artifactPath },
    );
    this.name = "CompileArtifactMissingError";
  }
}

export class UploadTimeoutError extends UploadError {
  constructor(timeoutMs: number) {
    super(
      "TIMEOUT",
      `Upload timed out after ${timeoutMs}ms`,
      true,
      { timeoutMs },
    );
    this.name = "UploadTimeoutError";
  }
}

export class PermissionDeniedError extends UploadError {
  constructor(portId: string, message?: string) {
    super(
      "PERMISSION_DENIED",
      message ?? `Permission denied for port "${portId}"`,
      true,
      { portId },
    );
    this.name = "PermissionDeniedError";
  }
}

export class DeviceDisconnectedError extends UploadError {
  constructor(deviceId: string) {
    super(
      "DEVICE_DISCONNECTED",
      `Device "${deviceId}" disconnected during upload`,
      false,
      { deviceId },
    );
    this.name = "DeviceDisconnectedError";
  }
}

export class UnknownUploaderError extends UploadError {
  constructor(boardId: string) {
    super(
      "UNKNOWN_UPLOADER",
      `No upload engine found for board "${boardId}"`,
      false,
      { boardId },
    );
    this.name = "UnknownUploaderError";
  }
}

export class ToolNotInstalled extends UploadError {
  constructor(toolId: string) {
    super("TOOL_NOT_INSTALLED", `Tool "${toolId}" is not installed`, false, { toolId });
    this.name = "ToolNotInstalled";
  }
}

export class ToolVersionMismatch extends UploadError {
  constructor(toolId: string, expected: string, found: string) {
    super("TOOL_VERSION_MISMATCH", `Tool "${toolId}" version mismatch: expected ${expected}, found ${found}`, false, { toolId, expected, found });
    this.name = "ToolVersionMismatch";
  }
}

export class ToolExecutionFailed extends UploadError {
  constructor(toolId: string, exitCode: number, stderr?: string) {
    super("TOOL_EXECUTION_FAILED", `Tool "${toolId}" failed with exit code ${exitCode}`, true, { toolId, exitCode, stderr });
    this.name = "ToolExecutionFailed";
  }
}

export class InvalidArguments extends UploadError {
  constructor(toolId: string, message: string) {
    super("INVALID_ARGUMENTS", message, false, { toolId });
    this.name = "InvalidArguments";
  }
}

export class BackendUnavailable extends UploadError {
  constructor(backendId: string, reason: string) {
    super("BACKEND_UNAVAILABLE", `Upload backend "${backendId}" is unavailable: ${reason}`, false, { backendId, reason });
    this.name = "BackendUnavailable";
  }
}
