import { EventBus } from "../extension/EventBus";
import { UPLOAD_EVENTS_CONST } from "./UploadEvents";
import type { UploadEngineRegistry } from "./UploadEngineRegistry";
import type { UploadEngine, UploadOptions } from "./UploadEngine";
import type { UploadProgress } from "../../types/upload/progress";
import type { UploadResult } from "../../types/upload/result";
import { createInitialProgress } from "../../types/upload/progress";
import { UnknownUploaderError } from "../../types/upload/error";
import type { LoggerService } from "../logging/LoggerService";

export type UploadStatus = "idle" | "running" | "cancelling" | "done" | "error";

export class UploadManager {
  private engineRegistry: UploadEngineRegistry;
  private logger: LoggerService;
  private status: UploadStatus = "idle";
  private activeEngine: UploadEngine | null = null;
  private currentProgress: UploadProgress = createInitialProgress();
  private startTime = 0;
  private queue: UploadOptions[] = [];

  constructor(engineRegistry: UploadEngineRegistry, logger: LoggerService) {
    this.engineRegistry = engineRegistry;
    this.logger = logger;
  }

  getStatus(): UploadStatus {
    return this.status;
  }

  getActiveEngine(): UploadEngine | null {
    return this.activeEngine;
  }

  getCurrentProgress(): UploadProgress {
    return { ...this.currentProgress };
  }

  hasQueuedUploads(): boolean {
    return this.queue.length > 0;
  }

  enqueue(options: UploadOptions): void {
    this.queue.push(options);
    EventBus.emit(UPLOAD_EVENTS_CONST.QUEUED, { options, queueLength: this.queue.length });
    this.logger.info("UploadManager", `Upload queued for board "${options.boardId}"`);
  }

  async start(options: UploadOptions): Promise<UploadResult> {
    const engine = this.engineRegistry.findForBoard(options.boardId);
    if (!engine) {
      const err = new UnknownUploaderError(options.boardId);
      this.logger.error("UploadManager", err.message);
      throw err;
    }

    return this.doUpload(engine, options);
  }

  async startWithEngine(engineId: string, options: UploadOptions): Promise<UploadResult> {
    const engine = this.engineRegistry.getById(engineId);
    if (!engine) {
      const err = new UnknownUploaderError(options.boardId);
      this.logger.error("UploadManager", `Engine "${engineId}" not found`);
      throw err;
    }

    return this.doUpload(engine, options);
  }

  async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const options = this.queue.shift()!;
      try {
        await this.start(options);
      } catch (e) {
        this.logger.error("UploadManager", `Queue upload failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  async cancel(): Promise<void> {
    if (this.status !== "running") return;

    this.status = "cancelling";
    this.currentProgress.stage = "cancelled";
    this.currentProgress.messages.push("Upload cancelled by user");

    if (this.activeEngine) {
      await this.activeEngine.cancel();
    }

    this.emitProgress();
    EventBus.emit(UPLOAD_EVENTS_CONST.CANCELLED, {
      progress: this.getCurrentProgress(),
      duration: Date.now() - this.startTime,
    });

    this.status = "done";
    this.activeEngine = null;
  }

  retry(options: UploadOptions): Promise<UploadResult> {
    this.logger.info("UploadManager", "Retrying upload");
    return this.start(options);
  }

  reset(): void {
    this.status = "idle";
    this.activeEngine = null;
    this.currentProgress = createInitialProgress();
    this.startTime = 0;
    this.queue = [];
  }

  private async doUpload(engine: UploadEngine, options: UploadOptions): Promise<UploadResult> {
    this.status = "running";
    this.activeEngine = engine;
    this.startTime = Date.now();
    this.currentProgress = createInitialProgress();

    EventBus.emit(UPLOAD_EVENTS_CONST.STARTED, {
      engine: engine.id,
      options,
      timestamp: this.startTime,
    });

    try {
      this.updateProgress("validating", 5);
      const supported = engine.supports(options.boardId);
      if (!supported) {
        throw new UnknownUploaderError(options.boardId);
      }

      this.updateProgress("compiling", 10);
      this.currentProgress.messages.push("Looking up compile artifact...");

      this.updateProgress("preparing", 20);
      EventBus.emit(UPLOAD_EVENTS_CONST.PREPARING, { options });
      await engine.prepare(options);

      this.updateProgress("uploading", 30);
      const result = await engine.upload(options, (p) => {
        this.currentProgress = p;
        this.emitProgress();
      });

      this.updateProgress("verifying", 85);
      EventBus.emit(UPLOAD_EVENTS_CONST.VERIFYING, { options });
      const verified = await engine.verify(options);

      this.updateProgress("cleaning", 95);
      await engine.cleanup(options);

      this.updateProgress("done", 100);
      this.currentProgress.messages.push("Upload completed successfully");

      const finalResult: UploadResult = {
        status: verified ? "success" : "failure",
        stage: "done",
        message: verified ? "Upload completed and verified" : "Upload completed but verification failed",
        duration: Date.now() - this.startTime,
        bytesUploaded: result.bytesUploaded,
        timestamp: Date.now(),
      };

      EventBus.emit(UPLOAD_EVENTS_CONST.FINISHED, {
        result: finalResult,
        progress: this.getCurrentProgress(),
      });

      this.logger.info("UploadManager", `Upload finished: ${finalResult.status}`);
      this.status = "done";
      this.activeEngine = null;

      return finalResult;
    } catch (e) {
      this.currentProgress.stage = "error";
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.currentProgress.errors.push(errorMessage);
      this.emitProgress();

      EventBus.emit(UPLOAD_EVENTS_CONST.FAILED, {
        error: e,
        progress: this.getCurrentProgress(),
        duration: Date.now() - this.startTime,
      });

      this.logger.error("UploadManager", `Upload failed: ${errorMessage}`);
      this.status = "error";
      this.activeEngine = null;

      throw e;
    }
  }

  private updateProgress(stage: UploadProgress["stage"], percent: number): void {
    this.currentProgress.stage = stage;
    this.currentProgress.percent = percent;
    this.currentProgress.timestamp = Date.now();
    this.emitProgress();
  }

  private emitProgress(): void {
    EventBus.emit(UPLOAD_EVENTS_CONST.PROGRESS, this.getCurrentProgress());
  }
}
