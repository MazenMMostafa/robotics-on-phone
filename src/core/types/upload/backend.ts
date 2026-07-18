import type { UploadProgress } from "./progress";
import type { UploadResult } from "./result";
import type { UploadOptions } from "../../services/upload/UploadEngine";
import type { ToolchainInfo } from "./toolchain";

export interface BackendValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface UploaderBackend {
  readonly id: string;
  readonly name: string;
  readonly version: string;

  detect(): Promise<ToolchainInfo>;
  validate(options: UploadOptions): Promise<BackendValidationResult>;
  execute(
    options: UploadOptions,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult>;
  verify(options: UploadOptions): Promise<boolean>;
  cancel(): Promise<void>;
  cleanup(options: UploadOptions): Promise<void>;
}
