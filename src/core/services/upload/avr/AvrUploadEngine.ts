import type { UploadEngine, UploadOptions } from "../UploadEngine";
import type { UploadProgress } from "../../../types/upload/progress";
import type { UploadResult } from "../../../types/upload/result";
import { BackendUnavailable, InvalidArguments } from "../../../types/upload/error";
import type { LoggerService } from "../../logging/LoggerService";
import type { UploaderBackendRegistry } from "../UploaderBackendRegistry";
import { getAvrBoardProfile } from "./AvrBoardProfile";

export class AvrUploadEngine implements UploadEngine {
  readonly id = "arduino-avr-v1";
  readonly name = "Arduino AVR Uploader";
  readonly version = "1.0.0";

  private backendRegistry: UploaderBackendRegistry;
  private logger: LoggerService;

  constructor(backendRegistry: UploaderBackendRegistry, logger: LoggerService) {
    this.backendRegistry = backendRegistry;
    this.logger = logger;
  }

  supports(boardId: string): boolean {
    return getAvrBoardProfile(boardId) !== undefined;
  }

  async prepare(options: UploadOptions): Promise<void> {
    this.logger.info("AvrUploadEngine", `Preparing upload for ${options.boardId} on ${options.portId}`);
  }

  async upload(
    options: UploadOptions,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult> {
    const backend = this.backendRegistry.getById("avrdude-v1");
    if (!backend) {
      throw new BackendUnavailable("avrdude-v1", "AVR upload backend not registered");
    }

    const validation = await backend.validate(options);
    if (!validation.valid) {
      throw new InvalidArguments("avrdude-v1", validation.errors?.[0] ?? "Invalid upload options");
    }

    this.logger.info("AvrUploadEngine", `Starting upload via ${backend.id}`);
    return backend.execute(options, onProgress);
  }

  async verify(options: UploadOptions): Promise<boolean> {
    const backend = this.backendRegistry.getById("avrdude-v1");
    if (!backend) return false;
    return backend.verify(options);
  }

  async cancel(): Promise<void> {
    const backend = this.backendRegistry.getById("avrdude-v1");
    await backend?.cancel();
  }

  async cleanup(options: UploadOptions): Promise<void> {
    const backend = this.backendRegistry.getById("avrdude-v1");
    await backend?.cleanup(options);
  }
}
