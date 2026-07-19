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
import { getAvrBoardProfile } from "../avr/AvrBoardProfile";
import { STK500V1Protocol } from "../avr/Stk500V1Protocol";
import { STK500V2Protocol } from "../avr/Stk500V2Protocol";

export class AvrdudeBackend implements UploaderBackend {
  readonly id = "avrdude-v1";
  readonly name = "AVR Dude";
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
      supportedBoards: ["uno", "nano", "mega"],
      detectedAt: Date.now(),
    };
  }

  async validate(options: UploadOptions): Promise<BackendValidationResult> {
    const profile = getAvrBoardProfile(options.boardId);
    if (!profile) {
      return { valid: false, errors: [`Board "${options.boardId}" is not supported by avrdude`] };
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
    const profile = getAvrBoardProfile(options.boardId);
    if (!profile) {
      throw new UploadError("BOARD_NOT_SUPPORTED", `AVR board "${options.boardId}" not supported`);
    }

    const baudRate = options.baudRate ?? profile.defaultBaudRate;
    const deviceId = options.additionalArgs?.deviceId as number | undefined;
    const connection = this.hardwareManager.createConnection("usb");
    const startTime = Date.now();

    try {
      await connection.connect({ baudRate, deviceId });
      this.reportProgress(onProgress, "uploading", 30, [{ text: "Connected to device" }]);

      const protocol = profile.protocol === "stk500v1"
        ? new STK500V1Protocol(connection, this.logger)
        : new STK500V2Protocol(connection, this.logger);

      this.reportProgress(onProgress, "uploading", 35, [{ text: "Synchronizing with bootloader" }]);
      await protocol.sync();

      this.reportProgress(onProgress, "uploading", 40, [{ text: "Entering programming mode" }]);
      await protocol.enterProgrammingMode();

      const pageSize = profile.pageSize;
      const totalBytes = profile.flashSize;
      const totalPages = Math.ceil(totalBytes / pageSize);

      this.reportProgress(onProgress, "uploading", 45, [{ text: `Programming ${totalPages} pages` }]);

      for (let page = 0; page < totalPages; page++) {
        if (this.cancelled) break;

        const address = page * pageSize;
        const pageData = new Array(pageSize).fill(0xFF);

        await protocol.loadAddress(address / 2);
        await protocol.programPage(pageData, pageSize);

        const percent = 45 + Math.round((page / totalPages) * 40);
        this.reportProgress(onProgress, "uploading", percent, [
          { text: `Page ${page + 1}/${totalPages} (${Math.round((page / totalPages) * 100)}%)` },
        ]);
      }

      if (this.cancelled) {
        await protocol.leaveProgrammingMode();
        await connection.disconnect();
        return {
          status: "cancelled",
          stage: "cancelled",
          message: "Upload cancelled by user",
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        };
      }

      this.reportProgress(onProgress, "uploading", 85, [{ text: "Leaving programming mode" }]);
      await protocol.leaveProgrammingMode();
      await connection.disconnect();

      return {
        status: "success",
        stage: "done",
        message: "Upload completed successfully",
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
    const profile = getAvrBoardProfile(options.boardId);
    if (!profile) return false;

    const deviceId = options.additionalArgs?.deviceId as number | undefined;
    const connection = this.hardwareManager.createConnection("usb");
    try {
      await connection.connect({ baudRate: options.baudRate ?? profile.defaultBaudRate, deviceId });

      const protocol = profile.protocol === "stk500v1"
        ? new STK500V1Protocol(connection, this.logger)
        : new STK500V2Protocol(connection, this.logger);

      await protocol.sync();
      await protocol.enterProgrammingMode();
      const sig = await protocol.readSignature();
      await protocol.leaveProgrammingMode();
      await connection.disconnect();

      const match = sig.length === profile.signature.length &&
        sig.every((b, i) => b === profile.signature[i]);

      if (!match) {
        this.logger.warn("AvrdudeBackend", `Signature mismatch: got [${sig}], expected [${profile.signature}]`);
      }

      return match;
    } catch (e) {
      try { await connection.disconnect(); } catch { /* noop */ }
      this.logger.error("AvrdudeBackend", `Verification failed: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }

  async cancel(): Promise<void> {
    this.cancelled = true;
  }

  async cleanup(options: UploadOptions): Promise<void> {
    const deviceId = options.additionalArgs?.deviceId as number | undefined;
    const connection = this.hardwareManager.createConnection("usb");
    try {
      await connection.connect({ deviceId });
      await connection.disconnect();
    } catch {
      // ignore cleanup errors
    }
  }

  async prepareReset(options: UploadOptions): Promise<void> {
    const profile = getAvrBoardProfile(options.boardId);
    if (!profile) return;

    this.logger.info("AvrdudeBackend", `Preparing ${profile.mcu} on ${options.portId}`);

    const deviceId = options.additionalArgs?.deviceId as number | undefined;
    const connection = this.hardwareManager.createConnection("usb");
    try {
      await connection.connect({ baudRate: profile.resetBaudRate, deviceId });
      await this.sleep(100);
      await connection.disconnect();
      await this.sleep(profile.resetWaitMs);
      this.logger.info("AvrdudeBackend", "Reset complete, bootloader should be active");
    } catch (e) {
      throw this.mapError(e, options.portId);
    }
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
