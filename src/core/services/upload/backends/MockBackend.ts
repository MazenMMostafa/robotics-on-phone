import type { UploaderBackend, BackendValidationResult } from "../../../types/upload/backend";
import type { UploadProgress } from "../../../types/upload/progress";
import type { UploadResult } from "../../../types/upload/result";
import type { ToolchainInfo } from "../../../types/upload/toolchain";
import type { UploadOptions } from "../UploadEngine";

export class MockBackend implements UploaderBackend {
  readonly id: string;
  readonly name: string;
  readonly version = "1.0.0";

  private cancelled = false;
  private simulateFailure = false;
  private simulateDelay = 0;
  private supportedBoards: string[];

  constructor(supportedBoards?: string[], id?: string, name?: string) {
    this.id = id ?? "mock-v1";
    this.name = name ?? "Mock Backend";
    this.supportedBoards = supportedBoards ?? ["mock-board"];
  }

  setSimulateFailure(fail: boolean): void {
    this.simulateFailure = fail;
  }

  setSimulateDelay(ms: number): void {
    this.simulateDelay = ms;
  }

  async detect(): Promise<ToolchainInfo> {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      status: "installed",
      supportedBoards: [...this.supportedBoards],
      detectedAt: Date.now(),
    };
  }

  async validate(_options: UploadOptions): Promise<BackendValidationResult> {
    if (this.simulateFailure) {
      return { valid: false, errors: ["Simulated validation failure"] };
    }
    return { valid: true };
  }

  async execute(
    options: UploadOptions,
    _onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult> {
    if (this.simulateDelay) {
      await this.sleep(this.simulateDelay);
    }

    if (this.cancelled) {
      return {
        status: "cancelled",
        stage: "cancelled",
        message: "Upload cancelled by user",
        duration: 0,
        timestamp: Date.now(),
      };
    }

    if (this.simulateFailure) {
      return {
        status: "failure",
        stage: "error",
        message: "Simulated backend failure",
        duration: 0,
        timestamp: Date.now(),
      };
    }

    return {
      status: "success",
      stage: "done",
      message: `Mock upload complete for ${options.boardId}`,
      duration: 0,
      bytesUploaded: 32256,
      timestamp: Date.now(),
    };
  }

  async verify(_options: UploadOptions): Promise<boolean> {
    return !this.simulateFailure;
  }

  async cancel(): Promise<void> {
    this.cancelled = true;
  }

  async cleanup(_options: UploadOptions): Promise<void> {
    // no-op for mock
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
