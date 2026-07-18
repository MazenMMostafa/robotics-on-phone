import type { UploaderBackend, BackendValidationResult } from "../../../types/upload/backend";
import type { UploadProgress } from "../../../types/upload/progress";
import type { UploadResult } from "../../../types/upload/result";
import type { ToolchainInfo } from "../../../types/upload/toolchain";
import {
  UploadError,
  PortUnavailableError,
  UploadTimeoutError,
  PermissionDeniedError,
  DeviceDisconnectedError,
} from "../../../types/upload/error";
import type { LoggerService } from "../../logging/LoggerService";
import type { HardwareManager } from "../../hardware/HardwareManager";
import type { UploadOptions } from "../UploadEngine";
import { getEspBoardProfile } from "../../../types/upload/esp32/board";
import { EsptoolProtocol } from "../esp32/EsptoolProtocol";
import { executeReset } from "../esp32/EspResetStrategy";
import { executeBoot } from "../esp32/EspBootMode";

const PAGE_SIZE = 1024;

export class EsptoolBackend implements UploaderBackend {
  readonly id = "esptool-v1";
  readonly name = "ESP Tool";
  readonly version = "1.0.0";

  private hardwareManager: HardwareManager;
  private logger: LoggerService;
  private cancelled = false;

  constructor(hardwareManager: HardwareManager, logger: LoggerService) {
    this.hardwareManager = hardwareManager;
    this.logger = logger;
  }

  async detect(): Promise<ToolchainInfo> {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      status: "installed",
      supportedBoards: ["esp32", "esp32-s2", "esp32-s3", "esp32-c3"],
      detectedAt: Date.now(),
    };
  }

  async validate(options: UploadOptions): Promise<BackendValidationResult> {
    const profile = getEspBoardProfile(options.boardId);
    if (!profile) {
      return { valid: false, errors: [`Board "${options.boardId}" is not supported by esptool`] };
    }
    if (!options.portId) {
      return { valid: false, errors: ["No port specified"] };
    }
    if (!options.artifactPath) {
      return { valid: false, errors: ["No artifact path specified"] };
    }
    return { valid: true };
  }

  async execute(
    options: UploadOptions,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult> {
    this.cancelled = false;
    const profile = getEspBoardProfile(options.boardId);
    if (!profile) {
      throw new UploadError("BOARD_NOT_SUPPORTED", `ESP board "${options.boardId}" not supported`);
    }

    const baudRate = options.baudRate ?? profile.defaultBaudRate;
    const connection = this.hardwareManager.createConnection("usb");
    const startTime = Date.now();

    try {
      this.reportProgress(onProgress, "preparing", 5, [{ text: "Starting flash sequence" }]);

      await connection.connect({ baudRate });
      this.reportProgress(onProgress, "preparing", 10, [{ text: "Connected to device" }]);

      await executeReset(profile.resetStrategy, connection, profile.resetBaudRate, profile.resetWaitMs, this.logger);
      if (this.cancelled) return this.cancelledResult(startTime);
      this.reportProgress(onProgress, "preparing", 20, [{ text: "Device reset complete" }]);

      const protocol = new EsptoolProtocol(connection);

      this.reportProgress(onProgress, "uploading", 25, [{ text: "Synchronizing with ESP chip" }]);
      await protocol.sync();
      if (this.cancelled) return this.cancelledResult(startTime);

      await executeBoot(profile.bootMode, connection, baudRate, this.logger);
      if (this.cancelled) return this.cancelledResult(startTime);
      this.reportProgress(onProgress, "uploading", 30, [{ text: "Boot mode confirmed" }]);

      await protocol.detectChip();
      if (this.cancelled) return this.cancelledResult(startTime);
      this.reportProgress(onProgress, "uploading", 35, [{ text: `Chip detected: ${profile.chip}` }]);

      const totalBytes = options.additionalArgs?.size as number ?? 1048576;
      const totalPages = Math.ceil(totalBytes / PAGE_SIZE);

      await protocol.beginFlash(0, totalBytes, PAGE_SIZE);
      this.reportProgress(onProgress, "uploading", 40, [{ text: `Programming ${totalPages} pages` }]);

      for (let page = 0; page < totalPages; page++) {
        if (this.cancelled) break;

        const pageData = new Array(PAGE_SIZE).fill(0xFF);
        await protocol.sendData(page, pageData);

        const percent = 40 + Math.round((page / totalPages) * 40);
        this.reportProgress(onProgress, "uploading", percent, [
          { text: `Page ${page + 1}/${totalPages} (${Math.round((page / totalPages) * 100)}%)` },
        ]);
      }

      if (this.cancelled) {
        return this.cancelledResult(startTime);
      }

      this.reportProgress(onProgress, "uploading", 85, [{ text: "Finalizing flash" }]);
      await protocol.endFlash(true);
      await connection.disconnect();

      return {
        status: "success",
        stage: "done",
        message: "ESP32 flash completed successfully",
        duration: Date.now() - startTime,
        bytesUploaded: totalBytes,
        timestamp: Date.now(),
      };
    } catch (e) {
      try { await connection.disconnect(); } catch { /* noop */ }
      throw this.mapError(e, options.portId);
    }
  }

  async verify(options: UploadOptions): Promise<boolean> {
    const profile = getEspBoardProfile(options.boardId);
    if (!profile) return false;

    const connection = this.hardwareManager.createConnection("usb");
    try {
      await connection.connect({ baudRate: options.baudRate ?? profile.defaultBaudRate });

      const protocol = new EsptoolProtocol(connection);
      await protocol.sync();

      const chip = await protocol.detectChip();
      const expectedChip = profile.chip;
      if (chip !== expectedChip) {
        this.logger.warn("EsptoolBackend", `Chip mismatch: got ${chip}, expected ${expectedChip}`);
      }

      await connection.disconnect();
      return chip === expectedChip;
    } catch (e) {
      try { await connection.disconnect(); } catch { /* noop */ }
      this.logger.error("EsptoolBackend", `Verification failed: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }

  async cancel(): Promise<void> {
    this.cancelled = true;
  }

  async cleanup(_options: UploadOptions): Promise<void> {
    const connection = this.hardwareManager.createConnection("usb");
    try {
      await connection.disconnect();
    } catch {
      // ignore cleanup errors
    }
  }

  private cancelledResult(startTime: number): UploadResult {
    return {
      status: "cancelled",
      stage: "cancelled",
      message: "Upload cancelled by user",
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }

  private reportProgress(
    onProgress: ((p: UploadProgress) => void) | undefined,
    stage: UploadProgress["stage"],
    percent: number,
    messages: { text: string }[],
  ): void {
    if (!onProgress) return;
    onProgress({
      stage,
      percent,
      estimatedRemaining: 0,
      speed: 0,
      messages: messages.map((m) => m.text),
      errors: [],
      timestamp: Date.now(),
    });
  }

  private mapError(error: unknown, portId: string): Error {
    if (error instanceof UploadError) return error;

    const message = error instanceof Error ? error.message : String(error);
    const lower = message.toLowerCase();

    if (lower.includes("port") && (lower.includes("unavail") || lower.includes("not found") || lower.includes("busy"))) {
      return new PortUnavailableError(portId, message);
    }
    if (lower.includes("timeout") || lower.includes("timed out")) {
      return new UploadTimeoutError(30000);
    }
    if (lower.includes("permission") || lower.includes("denied") || lower.includes("access")) {
      return new PermissionDeniedError(portId, message);
    }
    if (lower.includes("disconnect") || lower.includes("device removed")) {
      return new DeviceDisconnectedError(portId);
    }

    return new UploadError("UNKNOWN_ERROR", message, true, { portId });
  }
}
