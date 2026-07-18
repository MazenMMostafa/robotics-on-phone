import { EventBus } from "../extension/EventBus";
import type { CodeGenerationManager } from "../codegen/CodeGenerationManager";
import type { BuildManager } from "../build/BuildManager";
import type { UploadManager } from "../upload/UploadManager";
import type { LoggerService } from "../logging/LoggerService";
import type { BuildArtifact } from "../../types/build/artifact";
import type { SourceArtifact } from "../../types/codegen/artifact";

import {
  PIPELINE_EVENTS,
} from "../../types/pipeline/events";
import {
  createInitialPipelineProgress,
  type PipelineOptions,
  type PipelineProgress,
  type PipelineProgressHandler,
  type PipelineResult,
  type PipelineStage,
  GenerationFailedError,
  BuildFailedError,
  UploadFailedError,
  PipelineCancelledError,
  UnknownPipelineError,
  isPipelineError,
} from "../../types/pipeline";

const STAGE_ORDER: Record<PipelineStage, number> = {
  idle: 0,
  generating: 5,
  building: 35,
  "preparing-upload": 65,
  uploading: 70,
  verifying: 90,
  completed: 100,
  cancelled: 0,
  failed: 0,
};

export class PipelineService {
  private codeGenManager: CodeGenerationManager;
  private buildManager: BuildManager;
  private uploadManager: UploadManager;
  private logger: LoggerService;

  private status: "idle" | "running" | "cancelling" | "done" | "error" = "idle";
  private currentProgress: PipelineProgress = createInitialPipelineProgress();
  private currentStage: PipelineStage = "idle";
  private cancelling = false;

  constructor(
    codeGenManager: CodeGenerationManager,
    buildManager: BuildManager,
    uploadManager: UploadManager,
    logger: LoggerService,
  ) {
    this.codeGenManager = codeGenManager;
    this.buildManager = buildManager;
    this.uploadManager = uploadManager;
    this.logger = logger;
  }

  getStatus(): string {
    return this.status;
  }

  getCurrentProgress(): PipelineProgress {
    return { ...this.currentProgress, messages: [...this.currentProgress.messages], errors: [...this.currentProgress.errors] };
  }

  async run(
    options: PipelineOptions,
    onProgress?: PipelineProgressHandler,
  ): Promise<PipelineResult> {
    if (this.status === "running") {
      const err = new UnknownPipelineError(
        "Pipeline is already running. Cancel or wait for it to finish.",
        { stage: this.currentStage },
      );
      throw err;
    }

    this.reset();
    this.status = "running";
    this.cancelling = false;

    const startTime = Date.now();
    const genStart = Date.now();
    let buildStart: number;
    let uploadStart: number;

    let sourceArtifactChecksum: string | undefined;
    let buildArtifactChecksum: string | undefined;
    let firmwarePath: string | undefined;
    let bytesUploaded: number | undefined;

    EventBus.emit(PIPELINE_EVENTS.STARTED, { options, timestamp: startTime });

    try {
      // 1. GENERATE
      this.setStage("generating");
      this.reportProgress(onProgress, "Generating Arduino C++ from blocks…");

      const generationResult = await this.codeGenManager.generate({
        language: options.language,
        framework: options.framework,
        board: options.boardId,
        workspaceXml: options.workspaceXml,
        blocks: options.blocks,
        additionalArgs: options.additionalArgs,
      });

      if (this.cancelling) throw new PipelineCancelledError("Generation cancelled", { stage: "generating", boardId: options.boardId });
      if (generationResult.status !== "success" || !generationResult.artifact) {
        throw new GenerationFailedError(
          generationResult.message || "Code generation failed",
          { stage: "generating", boardId: options.boardId, framework: options.framework },
        );
      }
      sourceArtifactChecksum = generationResult.artifact.checksum;
      const sourceContent = this.extractSourceContent(generationResult.artifact);

      const genDuration = Date.now() - genStart;
      this.reportProgress(onProgress, `Generation complete (${genDuration}ms)`);

      // 2. BUILD
      buildStart = Date.now();
      this.setStage("building");
      this.reportProgress(onProgress, "Building firmware with Arduino CLI…");

      const buildResult = await this.buildManager.start({
        boardId: options.boardId,
        framework: options.framework,
        additionalArgs: { ...(options.additionalArgs ?? {}), sourceContent },
      });

      if (this.cancelling) throw new PipelineCancelledError("Build cancelled", { stage: "building", boardId: options.boardId });
      if (buildResult.status !== "success" || !buildResult.artifact) {
        throw new BuildFailedError(
          buildResult.message || "Firmware build failed",
          { stage: "building", boardId: options.boardId, framework: options.framework },
        );
      }
      const buildArtifact: BuildArtifact = buildResult.artifact;
      buildArtifactChecksum = buildArtifact.checksum;
      firmwarePath = buildArtifact.firmwarePath;
      const buildDuration = Date.now() - buildStart;
      this.reportProgress(onProgress, `Build complete (${buildDuration}ms)`);

      // 3. PREPARE UPLOAD
      this.setStage("preparing-upload");
      this.reportProgress(onProgress, `Preparing upload to ${options.boardId} on ${options.portId}…`);

      // 4. UPLOAD
      uploadStart = Date.now();
      this.setStage("uploading");
      this.reportProgress(onProgress, "Uploading firmware to board…");

      const uploadResult = await this.uploadManager.start({
        boardId: options.boardId,
        portId: options.portId,
        artifactPath: firmwarePath,
        baudRate: options.baudRate,
        additionalArgs: options.additionalArgs,
      });

      if (this.cancelling) throw new PipelineCancelledError("Upload cancelled", { stage: "uploading", boardId: options.boardId });
      bytesUploaded = uploadResult.bytesUploaded;
      const uploadDuration = Date.now() - uploadStart;
      this.reportProgress(onProgress, `Upload complete (${uploadDuration}ms)`);

      // 5. VERIFY
      this.setStage("verifying");
      this.reportProgress(onProgress, "Verifying device…");
      const verified = this.isUploadVerified(uploadResult);
      if (!verified) {
        throw new UploadFailedError(
          "Upload completed but device verification failed",
          { stage: "verifying", boardId: options.boardId, underlyingCode: uploadResult.errorCode },
        );
      }
      this.reportProgress(onProgress, "Verification successful");

      // 6. COMPLETED
      this.setStage("completed");
      this.currentProgress.percent = 100;
      this.emitProgress(onProgress);
      const totalDuration = Date.now() - startTime;
      const result: PipelineResult = {
        status: "success",
        stage: "completed",
        message: `Pipeline complete: ${options.boardId} programmed in ${totalDuration}ms`,
        duration: totalDuration,
        generationDuration: genDuration,
        buildDuration,
        uploadDuration,
        sourceArtifactChecksum,
        buildArtifactChecksum,
        firmwarePath,
        bytesUploaded,
        timestamp: Date.now(),
      };

      EventBus.emit(PIPELINE_EVENTS.FINISHED, { result, progress: this.getCurrentProgress() });
      this.logger.info("PipelineService", result.message);
      this.status = "done";
      return result;
    } catch (error) {
      const mapped = this.mapError(error, options);
      this.currentProgress.errors.push(mapped.message);
      this.setStage("failed");
      this.emitProgress(onProgress);

      EventBus.emit(PIPELINE_EVENTS.FAILED, {
        error: mapped,
        progress: this.getCurrentProgress(),
        duration: Date.now() - startTime,
      });
      this.logger.error("PipelineService", `Pipeline failed: ${mapped.message}`);
      this.status = "error";

      if (isPipelineError(mapped)) throw mapped;
      throw new UnknownPipelineError(mapped.message, { stage: this.currentStage }, error);
    }
  }

  async cancel(): Promise<void> {
    if (this.status !== "running") return;
    this.cancelling = true;
    this.setStage("cancelled");
    this.currentProgress.messages.push("Pipeline cancelled by user");
    this.emitProgress();

    // Cancel whichever stage is active.
    switch (this.currentStage) {
      case "generating":
        await this.codeGenManager.cancel();
        break;
      case "building":
        await this.buildManager.cancel();
        break;
      case "preparing-upload":
      case "uploading":
      case "verifying":
        await this.uploadManager.cancel();
        break;
      default:
        break;
    }

    EventBus.emit(PIPELINE_EVENTS.CANCELLED, {
      progress: this.getCurrentProgress(),
      duration: 0,
    });
    this.status = "done";
  }

  retry(options: PipelineOptions, onProgress?: PipelineProgressHandler): Promise<PipelineResult> {
    this.logger.info("PipelineService", "Retrying pipeline");
    return this.run(options, onProgress);
  }

  reset(): void {
    this.status = "idle";
    this.currentProgress = createInitialPipelineProgress();
    this.currentStage = "idle";
    this.cancelling = false;
  }

  private extractSourceContent(artifact: SourceArtifact): string {
    if (artifact.sourceFiles.length > 0) {
      return artifact.sourceFiles[0].content;
    }
    throw new GenerationFailedError("Generated source artifact contained no source files", {
      stage: "generating",
      boardId: artifact.board,
      framework: artifact.framework,
    });
  }

  private isUploadVerified(uploadResult: { status: string }): boolean {
    return uploadResult.status === "success";
  }

  private setStage(stage: PipelineStage): void {
    this.currentStage = stage;
    const base = STAGE_ORDER[stage];
    if (base > this.currentProgress.percent) {
      this.currentProgress.percent = base;
    }
    this.currentProgress.stage = stage;
    this.currentProgress.timestamp = Date.now();
    EventBus.emit(PIPELINE_EVENTS.STAGE_CHANGED, { stage, timestamp: Date.now() });
  }

  private reportProgress(onProgress: PipelineProgressHandler | undefined, message: string): void {
    if (message) this.currentProgress.messages.push(message);
    this.emitProgress(onProgress);
  }

  private emitProgress(onProgress?: PipelineProgressHandler): void {
    const snapshot = this.getCurrentProgress();
    EventBus.emit(PIPELINE_EVENTS.PROGRESS, snapshot);
    onProgress?.(snapshot);
  }

  private mapError(error: unknown, options: PipelineOptions): Error {
    if (isPipelineError(error)) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    const stage = this.currentStage;

    if (stage === "generating") {
      return new GenerationFailedError(message, { stage, boardId: options.boardId, framework: options.framework }, error);
    }
    if (stage === "building") {
      return new BuildFailedError(message, { stage, boardId: options.boardId, framework: options.framework }, error);
    }
    if (stage === "preparing-upload" || stage === "uploading" || stage === "verifying") {
      return new UploadFailedError(message, { stage, boardId: options.boardId, portId: options.portId }, error);
    }

    return new UnknownPipelineError(message, { stage }, error);
  }
}
