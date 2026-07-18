import { EventBus } from "../extension/EventBus";
import { BUILD_EVENTS } from "../../types/build/events";
import type { BuildEngine, BuildOptions, BuildProgress, BuildResult } from "../../types/build/engine";
import type { BuildArtifact } from "../../types/build/artifact";

import { BuildCache } from "./BuildCache";
import type { BuildEngineRegistry } from "./BuildEngineRegistry";
import type { LoggerService } from "../logging/LoggerService";

export type BuildStatus = "idle" | "preparing" | "building" | "cancelling" | "done" | "error";

export class BuildManager {
  private engineRegistry: BuildEngineRegistry;
  private cache: BuildCache;
  private logger: LoggerService;
  private status: BuildStatus = "idle";
  private activeEngine: BuildEngine | null = null;
  private currentProgress: BuildProgress;
  private startTime = 0;
  private queue: { options: BuildOptions; engineId?: string }[] = [];

  constructor(engineRegistry: BuildEngineRegistry, logger: LoggerService, cache?: BuildCache) {
    this.engineRegistry = engineRegistry;
    this.logger = logger;
    this.cache = cache ?? new BuildCache();
    this.currentProgress = this.createInitialProgress();
  }

  getStatus(): BuildStatus {
    return this.status;
  }

  getActiveEngine(): BuildEngine | null {
    return this.activeEngine;
  }

  getCurrentProgress(): BuildProgress {
    return { ...this.currentProgress, messages: [...this.currentProgress.messages], errors: [...this.currentProgress.errors] };
  }

  hasQueuedBuilds(): boolean {
    return this.queue.length > 0;
  }

  enqueue(options: BuildOptions, engineId?: string): void {
    this.queue.push({ options, engineId });
    EventBus.emit(BUILD_EVENTS.BUILD_QUEUED, { options, queueLength: this.queue.length });
    this.logger.info("BuildManager", `Build queued for board "${options.boardId}"`);
  }

  async start(options: BuildOptions): Promise<BuildResult> {
    const engine = this.engineRegistry.findForBoardAndFramework(options.boardId, options.framework);
    if (!engine) {
      const err = new Error(`No build engine found for board "${options.boardId}"`);
      this.logger.error("BuildManager", err.message);
      throw err;
    }
    return this.doBuild(engine, options);
  }

  async startWithEngine(engineId: string, options: BuildOptions): Promise<BuildResult> {
    const engine = this.engineRegistry.getById(engineId);
    if (!engine) {
      const err = new Error(`Build engine "${engineId}" not found`);
      this.logger.error("BuildManager", err.message);
      throw err;
    }
    return this.doBuild(engine, options);
  }

  async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      try {
        if (item.engineId) {
          await this.startWithEngine(item.engineId, item.options);
        } else {
          await this.start(item.options);
        }
      } catch (e) {
        this.logger.error("BuildManager", `Queue build failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  async cancel(): Promise<void> {
    if (this.status !== "preparing" && this.status !== "building") return;
    this.status = "cancelling";
    this.currentProgress.stage = "cancelled";
    this.currentProgress.messages.push("Build cancelled by user");
    if (this.activeEngine) {
      await this.activeEngine.cleanup({ boardId: "", framework: "" });
    }
    this.emitProgress();
    EventBus.emit(BUILD_EVENTS.BUILD_CANCELLED, {
      progress: this.getCurrentProgress(),
      duration: Date.now() - this.startTime,
    });
    this.status = "done";
    this.activeEngine = null;
  }

  retry(options: BuildOptions): Promise<BuildResult> {
    this.logger.info("BuildManager", "Retrying build");
    return this.start(options);
  }

  getCachedArtifact(boardId: string, framework: string): BuildArtifact | undefined {
    return this.cache.get(boardId, framework);
  }

  hasCachedArtifact(boardId: string, framework: string): boolean {
    return this.cache.has(boardId, framework);
  }

  clearCache(): void {
    this.cache.clear();
  }

  reset(): void {
    this.status = "idle";
    this.activeEngine = null;
    this.currentProgress = this.createInitialProgress();
    this.startTime = 0;
    this.queue = [];
  }

  private async doBuild(engine: BuildEngine, options: BuildOptions): Promise<BuildResult> {
    this.status = "building";
    this.activeEngine = engine;
    this.startTime = Date.now();
    this.currentProgress = this.createInitialProgress();
    EventBus.emit(BUILD_EVENTS.BUILD_STARTED, {
      engine: engine.id,
      options,
      timestamp: this.startTime,
    });
    try {
      this.updateProgress("preparing", 5);
      const supported = engine.supports(options.boardId, options.framework);
      if (!supported) {
        throw new Error(`Board "${options.boardId}" with framework "${options.framework}" is not supported by engine "${engine.id}"`);
      }
      this.updateProgress("preparing", 15);
      EventBus.emit(BUILD_EVENTS.BUILD_PREPARING, { options });
      await engine.prepare(options);
      this.updateProgress("compiling", 20);
      const result = await engine.build(options, (p) => {
        this.currentProgress = p;
        this.emitProgress();
      });
      this.updateProgress("finishing", 85);
      if (result.artifact) {
        this.cache.set(result.artifact);
      }
      this.updateProgress("done", 100);
      this.currentProgress.messages.push("Build completed successfully");
      const finalResult: BuildResult = {
        status: result.status,
        stage: "done",
        message: result.status === "success" ? "Build completed successfully" : "Build completed with issues",
        artifact: result.artifact,
        duration: Date.now() - this.startTime,
        timestamp: Date.now(),
      };
      EventBus.emit(BUILD_EVENTS.BUILD_FINISHED, { result: finalResult, progress: this.getCurrentProgress() });
      this.logger.info("BuildManager", `Build finished: ${finalResult.status}`);
      this.status = "done";
      this.activeEngine = null;
      return finalResult;
    } catch (e) {
      this.currentProgress.stage = "error";
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.currentProgress.errors.push(errorMessage);
      this.emitProgress();
      EventBus.emit(BUILD_EVENTS.BUILD_FAILED, {
        error: e,
        progress: this.getCurrentProgress(),
        duration: Date.now() - this.startTime,
      });
      this.logger.error("BuildManager", `Build failed: ${errorMessage}`);
      this.status = "error";
      this.activeEngine = null;
      throw e;
    }
  }

  private updateProgress(stage: BuildProgress["stage"], percent: number): void {
    this.currentProgress.stage = stage;
    this.currentProgress.percent = percent;
    this.currentProgress.timestamp = Date.now();
    this.emitProgress();
  }

  private emitProgress(): void {
    EventBus.emit(BUILD_EVENTS.BUILD_PROGRESS, this.getCurrentProgress());
  }

  private createInitialProgress(): BuildProgress {
    return {
      stage: "queued",
      percent: 0,
      messages: [],
      errors: [],
      timestamp: Date.now(),
    };
  }
}
