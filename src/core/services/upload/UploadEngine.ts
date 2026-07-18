import type { UploadProgress } from "../../types/upload/progress";
import type { UploadResult } from "../../types/upload/result";

export interface UploadOptions {
  boardId: string;
  portId: string;
  artifactPath: string;
  baudRate?: number;
  additionalArgs?: Record<string, unknown>;
}

export interface UploadEngine {
  readonly id: string;
  readonly name: string;
  readonly version: string;

  supports(boardId: string): boolean;
  prepare(options: UploadOptions): Promise<void>;
  upload(
    options: UploadOptions,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult>;
  verify(options: UploadOptions): Promise<boolean>;
  cancel(): Promise<void>;
  cleanup(options: UploadOptions): Promise<void>;
}
