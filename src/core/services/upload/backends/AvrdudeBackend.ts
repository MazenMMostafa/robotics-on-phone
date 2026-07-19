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
    const MOD = "Avrdude";
    const profile = getAvrBoardProfile(options.boardId);
    if (!profile) {
      const msg = `AVR board "${options.boardId}" not supported`;
      this.logger.nbLog("error", MOD, `[STAGE=INIT] ${msg}`);
      throw new UploadError("BOARD_NOT_SUPPORTED", msg);
    }

    const baudRate = options.baudRate ?? profile.defaultBaudRate;
    const deviceId = options.additionalArgs?.deviceId as number | undefined;
    const connection = this.hardwareManager.createConnection("usb");
    const startTime = Date.now();

    this.logger.nbLog("info", MOD, `[STAGE=INIT] board=${options.boardId} mcu=${profile.mcu} protocol=${profile.protocol} flash=${profile.flashSize}B pageSize=${profile.pageSize} baudRate=${baudRate} deviceId=${deviceId ?? "default"} portId=${options.portId}`);

    try {
      // --- CONNECT ---
      this.logger.nbLog("info", MOD, `[STAGE=CONNECT] opening USB deviceId=${deviceId} baudRate=${baudRate}`);
      const connStart = Date.now();
      await connection.connect({ baudRate, deviceId });
      this.logger.nbLog("info", MOD, `[STAGE=CONNECT] OK in ${Date.now() - connStart}ms`);
      this.reportProgress(onProgress, "uploading", 30, [{ text: "Connected to device" }]);

      // --- SELECT PROTOCOL ---
      const protocol = profile.protocol === "stk500v1"
        ? new STK500V1Protocol(connection, this.logger)
        : new STK500V2Protocol(connection, this.logger);
      this.logger.nbLog("info", MOD, `[STAGE=PROTOCOL] using ${profile.protocol}`);

      // --- SYNC ---
      this.reportProgress(onProgress, "uploading", 35, [{ text: "Synchronizing with bootloader" }]);
      this.logger.nbLog("info", MOD, `[STAGE=SYNC] starting protocol.sync()`);
      const syncStart = Date.now();
      await protocol.sync();
      this.logger.nbLog("info", MOD, `[STAGE=SYNC] OK in ${Date.now() - syncStart}ms`);

      // --- ENTER PROGRAMMING MODE ---
      this.reportProgress(onProgress, "uploading", 40, [{ text: "Entering programming mode" }]);
      this.logger.nbLog("info", MOD, `[STAGE=PROG_MODE] entering programming mode`);
      const progStart = Date.now();
      await protocol.enterProgrammingMode();
      this.logger.nbLog("info", MOD, `[STAGE=PROG_MODE] OK in ${Date.now() - progStart}ms`);

      // --- FLASH ---
      const pageSize = profile.pageSize;
      const totalBytes = profile.flashSize;
      const totalPages = Math.ceil(totalBytes / pageSize);
      this.logger.nbLog("info", MOD, `[STAGE=FLASH] totalPages=${totalPages} pageSize=${pageSize} totalBytes=${totalBytes}`);
      this.reportProgress(onProgress, "uploading", 45, [{ text: `Programming ${totalPages} pages` }]);

      const flashStart = Date.now();
      for (let page = 0; page < totalPages; page++) {
        if (this.cancelled) break;

        const address = page * pageSize;
        const pageData = new Array(pageSize).fill(0xFF);

        const pgStart = Date.now();
        await protocol.loadAddress(address / 2);
        await protocol.programPage(pageData, pageSize);
        const pgMs = Date.now() - pgStart;

        const percent = 45 + Math.round((page / totalPages) * 40);
        if (page % 32 === 0 || page === totalPages - 1) {
          this.logger.nbLog("debug", MOD, `[STAGE=FLASH] page ${page + 1}/${totalPages} addr=0x${(address / 2).toString(16)} ${pgMs}ms`);
        }
        this.reportProgress(onProgress, "uploading", percent, [
          { text: `Page ${page + 1}/${totalPages} (${Math.round((page / totalPages) * 100)}%)` },
        ]);
      }

      if (this.cancelled) {
        this.logger.nbLog("warn", MOD, `[STAGE=CANCELLED] upload cancelled at page loop`);
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

      this.logger.nbLog("info", MOD, `[STAGE=FLASH] complete in ${Date.now() - flashStart}ms`);

      // --- LEAVE PROGRAMMING MODE ---
      this.reportProgress(onProgress, "uploading", 85, [{ text: "Leaving programming mode" }]);
      this.logger.nbLog("info", MOD, `[STAGE=LEAVE_PROG] leaving programming mode`);
      const leaveStart = Date.now();
      await protocol.leaveProgrammingMode();
      this.logger.nbLog("info", MOD, `[STAGE=LEAVE_PROG] OK in ${Date.now() - leaveStart}ms`);

      // --- DISCONNECT ---
      this.logger.nbLog("info", MOD, `[STAGE=DISCONNECT] closing USB`);
      const disconnStart = Date.now();
      await connection.disconnect();
      this.logger.nbLog("info", MOD, `[STAGE=DISCONNECT] OK in ${Date.now() - disconnStart}ms`);

      const totalMs = Date.now() - startTime;
      this.logger.nbLog("info", MOD, `[STAGE=DONE] upload success totalBytes=${totalBytes} duration=${totalMs}ms`);

      return {
        status: "success",
        stage: "done",
        message: "Upload completed successfully",
        duration: totalMs,
        bytesUploaded: totalBytes,
        timestamp: Date.now(),
      };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.logger.nbLog("error", MOD, `[STAGE=ERROR] ${err.name}: ${err.message}\n${err.stack ?? ""}\nstage=execute board=${options.boardId} portId=${options.portId}`);
      try { await connection.disconnect(); } catch { /* noop */ }
      throw this.mapError(e, options.portId);
    }
  }

  async verify(options: UploadOptions): Promise<boolean> {
    const MOD = "Avrdude";
    const profile = getAvrBoardProfile(options.boardId);
    if (!profile) {
      this.logger.nbLog("warn", MOD, `[STAGE=VERIFY] no profile for board "${options.boardId}", skipping`);
      return false;
    }

    const deviceId = options.additionalArgs?.deviceId as number | undefined;
    const connection = this.hardwareManager.createConnection("usb");
    try {
      this.logger.nbLog("info", MOD, `[STAGE=VERIFY] connecting baudRate=${options.baudRate ?? profile.defaultBaudRate} deviceId=${deviceId}`);
      const t0 = Date.now();
      await connection.connect({ baudRate: options.baudRate ?? profile.defaultBaudRate, deviceId });

      const protocol = profile.protocol === "stk500v1"
        ? new STK500V1Protocol(connection, this.logger)
        : new STK500V2Protocol(connection, this.logger);

      this.logger.nbLog("info", MOD, `[STAGE=VERIFY] syncing`);
      await protocol.sync();

      this.logger.nbLog("info", MOD, `[STAGE=VERIFY] entering programming mode`);
      await protocol.enterProgrammingMode();

      this.logger.nbLog("info", MOD, `[STAGE=VERIFY] reading signature`);
      const sig = await protocol.readSignature();
      await protocol.leaveProgrammingMode();
      await connection.disconnect();

      const match = sig.length === profile.signature.length &&
        sig.every((b, i) => b === profile.signature[i]);

      if (!match) {
        this.logger.nbLog("warn", MOD, `[STAGE=VERIFY] SIGNATURE MISMATCH got=[${sig}] expected=[${profile.signature}]`);
      } else {
        this.logger.nbLog("info", MOD, `[STAGE=VERIFY] signature OK [${sig}] in ${Date.now() - t0}ms`);
      }

      return match;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.logger.nbLog("error", MOD, `[STAGE=VERIFY] FAILED ${err.name}: ${err.message}\n${err.stack ?? ""}`);
      try { await connection.disconnect(); } catch { /* noop */ }
      return false;
    }
  }

  async cancel(): Promise<void> {
    this.cancelled = true;
  }

  async cleanup(options: UploadOptions): Promise<void> {
    const MOD = "Avrdude";
    const deviceId = options.additionalArgs?.deviceId as number | undefined;
    this.logger.nbLog("info", MOD, `[STAGE=CLEANUP] deviceId=${deviceId}`);
    const connection = this.hardwareManager.createConnection("usb");
    try {
      await connection.connect({ deviceId });
      await connection.disconnect();
      this.logger.nbLog("info", MOD, `[STAGE=CLEANUP] OK`);
    } catch (e) {
      this.logger.nbLog("warn", MOD, `[STAGE=CLEANUP] error (ignored): ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async prepareReset(options: UploadOptions): Promise<void> {
    const MOD = "Avrdude";
    const profile = getAvrBoardProfile(options.boardId);
    if (!profile) return;

    this.logger.nbLog("info", MOD, `[STAGE=RESET] preparing ${profile.mcu} on ${options.portId} resetBaudRate=${profile.resetBaudRate} resetWaitMs=${profile.resetWaitMs}`);

    const deviceId = options.additionalArgs?.deviceId as number | undefined;
    const connection = this.hardwareManager.createConnection("usb");
    try {
      const t0 = Date.now();
      await connection.connect({ baudRate: profile.resetBaudRate, deviceId });
      this.logger.nbLog("info", MOD, `[STAGE=RESET] connected at ${profile.resetBaudRate}, waiting ${profile.resetWaitMs}ms`);
      await this.sleep(100);
      await connection.disconnect();
      await this.sleep(profile.resetWaitMs);
      this.logger.nbLog("info", MOD, `[STAGE=RESET] complete in ${Date.now() - t0}ms, bootloader should be active`);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.logger.nbLog("error", MOD, `[STAGE=RESET] FAILED ${err.name}: ${err.message}\n${err.stack ?? ""}`);
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

    let mapped: Error;
    if (lower.includes("port") && (lower.includes("unavail") || lower.includes("not found") || lower.includes("busy"))) {
      mapped = new PortUnavailableError(portId, message);
    } else if (lower.includes("timeout") || lower.includes("timed out")) {
      mapped = new UploadTimeoutError(30000);
    } else if (lower.includes("permission") || lower.includes("denied") || lower.includes("access")) {
      mapped = new PermissionDeniedError(portId, message);
    } else if (lower.includes("disconnect") || lower.includes("device removed")) {
      mapped = new DeviceDisconnectedError(portId);
    } else {
      mapped = new UploadError("UNKNOWN_ERROR", message, true, { portId });
    }

    this.logger.nbLog("error", "Avrdude", `[STAGE=MAP_ERROR] original="${message}" → mapped=${mapped.constructor.name}(${(mapped as UploadError).code ?? "?"})`);
    return mapped;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
