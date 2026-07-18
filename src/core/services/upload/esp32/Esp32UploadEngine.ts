import type { UploadEngine, UploadOptions } from "../UploadEngine";
import type { UploadProgress } from "../../../types/upload/progress";
import type { UploadResult } from "../../../types/upload/result";
import { BackendUnavailable, InvalidArguments } from "../../../types/upload/error";
import type { LoggerService } from "../../logging/LoggerService";
import type { UploaderBackendRegistry } from "../UploaderBackendRegistry";
import { isEspBoard } from "../../../types/upload/esp32/board";

export class Esp32UploadEngine implements UploadEngine {
  readonly id = "arduino-esp32-v1";
  readonly name = "Arduino ESP32 Uploader";
  readonly version = "1.0.0";

  private backendRegistry: UploaderBackendRegistry;
  private logger: LoggerService;

  constructor(backendRegistry: UploaderBackendRegistry, logger: LoggerService) {
    this.backendRegistry = backendRegistry;
    this.logger = logger;
  }

  supports(boardId: string): boolean {
    return isEspBoard(boardId);
  }

  async prepare(_options: UploadOptions): Promise<void> {
    this.logger.info("Esp32UploadEngine", "Prepare phase complete");
  }

  async upload(
    options: UploadOptions,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult> {
    const backend = this.backendRegistry.getById("esptool-v1");
    if (!backend) {
      throw new BackendUnavailable("esptool-v1", "ESP tool backend not registered");
    }

    const validation = await backend.validate(options);
    if (!validation.valid) {
      throw new InvalidArguments("esptool-v1", validation.errors?.[0] ?? "Invalid upload options");
    }

    this.logger.info("Esp32UploadEngine", `Starting upload via ${backend.id}`);
    return backend.execute(options, onProgress);
  }

  async verify(options: UploadOptions): Promise<boolean> {
    const backend = this.backendRegistry.getById("esptool-v1");
    if (!backend) return false;
    return backend.verify(options);
  }

  async cancel(): Promise<void> {
    const backend = this.backendRegistry.getById("esptool-v1");
    await backend?.cancel();
  }

  async cleanup(options: UploadOptions): Promise<void> {
    const backend = this.backendRegistry.getById("esptool-v1");
    await backend?.cleanup(options);
  }
}
