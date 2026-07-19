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
    this.logger.nbLog("info", "AvrUploadEngine", `Preparing upload for ${options.boardId} on ${options.portId}`);
  }

  async upload(
    options: UploadOptions,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult> {
    const backend = this.backendRegistry.getById("avrdude-v1");
    if (!backend) {
      const msg = "AVR upload backend not registered";
      this.logger.nbLog("error", "AvrUploadEngine", msg);
      throw new BackendUnavailable("avrdude-v1", msg);
    }

    const validation = await backend.validate(options);
    if (!validation.valid) {
      const msg = validation.errors?.[0] ?? "Invalid upload options";
      this.logger.nbLog("error", "AvrUploadEngine", `Validation failed: ${msg}`);
      throw new InvalidArguments("avrdude-v1", msg);
    }

    this.logger.nbLog("info", "AvrUploadEngine", `Starting upload via ${backend.id} board=${options.boardId} port=${options.portId} baudRate=${options.baudRate ?? "default"} deviceId=${options.additionalArgs?.deviceId ?? "default"}`);
    return backend.execute(options, onProgress);
  }

  async verify(options: UploadOptions): Promise<boolean> {
    const backend = this.backendRegistry.getById("avrdude-v1");
    if (!backend) return false;
    this.logger.nbLog("info", "AvrUploadEngine", `Verifying board=${options.boardId}`);
    return backend.verify(options);
  }

  async cancel(): Promise<void> {
    this.logger.nbLog("info", "AvrUploadEngine", "Cancel requested");
    const backend = this.backendRegistry.getById("avrdude-v1");
    await backend?.cancel();
  }

  async cleanup(options: UploadOptions): Promise<void> {
    this.logger.nbLog("info", "AvrUploadEngine", `Cleanup board=${options.boardId}`);
    const backend = this.backendRegistry.getById("avrdude-v1");
    await backend?.cleanup(options);
  }
}
