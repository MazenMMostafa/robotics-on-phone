export type PipelineErrorCode =
  | "GENERATION_FAILED"
  | "BUILD_FAILED"
  | "UPLOAD_FAILED"
  | "CANCELLED"
  | "UNKNOWN_FAILURE";

import type { PipelineStage } from "./progress";

export interface PipelineErrorContext {
  stage?: PipelineStage;
  boardId?: string;
  framework?: string;
  portId?: string;
  underlyingCode?: string;
  details?: Record<string, unknown>;
}

export class PipelineError extends Error {
  readonly code: PipelineErrorCode;
  readonly recoverable: boolean;
  readonly context: PipelineErrorContext;
  readonly cause?: unknown;

  constructor(
    code: PipelineErrorCode,
    message: string,
    recoverable: boolean,
    context: PipelineErrorContext,
    cause?: unknown,
  ) {
    super(message);
    this.name = "PipelineError";
    this.code = code;
    this.recoverable = recoverable;
    this.context = context;
    this.cause = cause;
    Object.setPrototypeOf(this, PipelineError.prototype);
  }
}

export class GenerationFailedError extends PipelineError {
  constructor(message: string, context: PipelineErrorContext, cause?: unknown) {
    super("GENERATION_FAILED", message, false, { ...context, stage: context.stage ?? "generating" }, cause);
    this.name = "GenerationFailedError";
    Object.setPrototypeOf(this, GenerationFailedError.prototype);
  }
}

export class BuildFailedError extends PipelineError {
  constructor(message: string, context: PipelineErrorContext, cause?: unknown) {
    super("BUILD_FAILED", message, false, { ...context, stage: context.stage ?? "building" }, cause);
    this.name = "BuildFailedError";
    Object.setPrototypeOf(this, BuildFailedError.prototype);
  }
}

export class UploadFailedError extends PipelineError {
  constructor(message: string, context: PipelineErrorContext, cause?: unknown) {
    super("UPLOAD_FAILED", message, true, { ...context, stage: context.stage ?? "uploading" }, cause);
    this.name = "UploadFailedError";
    Object.setPrototypeOf(this, UploadFailedError.prototype);
  }
}

export class PipelineCancelledError extends PipelineError {
  constructor(message: string, context: PipelineErrorContext) {
    super("CANCELLED", message, false, { ...context, stage: context.stage ?? "cancelled" });
    this.name = "PipelineCancelledError";
    Object.setPrototypeOf(this, PipelineCancelledError.prototype);
  }
}

export class UnknownPipelineError extends PipelineError {
  constructor(message: string, context: PipelineErrorContext, cause?: unknown) {
    super("UNKNOWN_FAILURE", message, false, { ...context, stage: context.stage ?? "failed" }, cause);
    this.name = "UnknownPipelineError";
    Object.setPrototypeOf(this, UnknownPipelineError.prototype);
  }
}

export function isPipelineError(error: unknown): error is PipelineError {
  return error instanceof PipelineError;
}
