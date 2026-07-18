export class BuildError extends Error {
  readonly code: string;
  readonly recoverable: boolean;
  readonly details: Record<string, unknown>;

  constructor(code: string, message: string, recoverable = false, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "BuildError";
    this.code = code;
    this.recoverable = recoverable;
    this.details = details;
  }
}

export class CompilerMissing extends BuildError {
  constructor(framework: string) {
    super(
      "COMPILER_MISSING",
      `Compiler for framework "${framework}" is not installed`,
      false,
      { framework },
    );
    this.name = "CompilerMissing";
  }
}

export class CompilationFailed extends BuildError {
  constructor(framework: string, exitCode: number, stderr?: string) {
    super(
      "COMPILATION_FAILED",
      `Compilation failed for framework "${framework}" with exit code ${exitCode}`,
      true,
      { framework, exitCode, stderr },
    );
    this.name = "CompilationFailed";
  }
}

export class InvalidProject extends BuildError {
  constructor(path: string, reason: string) {
    super(
      "INVALID_PROJECT",
      `Invalid project at "${path}": ${reason}`,
      false,
      { path, reason },
    );
    this.name = "InvalidProject";
  }
}

export class UnsupportedFramework extends BuildError {
  constructor(framework: string, boardId: string) {
    super(
      "UNSUPPORTED_FRAMEWORK",
      `Framework "${framework}" is not supported for board "${boardId}"`,
      false,
      { framework, boardId },
    );
    this.name = "UnsupportedFramework";
  }
}

export class ArtifactNotFound extends BuildError {
  constructor(boardId: string, framework: string) {
    super(
      "ARTIFACT_NOT_FOUND",
      `No build artifact found for board "${boardId}" with framework "${framework}"`,
      false,
      { boardId, framework },
    );
    this.name = "ArtifactNotFound";
  }
}
