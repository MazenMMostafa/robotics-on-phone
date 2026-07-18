import { EventBus } from "../extension/EventBus";
import { CODEGEN_EVENTS } from "../../types/codegen/events";
import type { CodeGenerator, GenerationOptions, GenerationProgress, GenerationResult, ValidationResult } from "../../types/codegen/generator";
import type { SourceArtifact } from "../../types/codegen/artifact";
import { GeneratorMissing } from "../../types/codegen/error";
import type { CodeGeneratorRegistry } from "./CodeGeneratorRegistry";
import type { LoggerService } from "../logging/LoggerService";

export type GenerationStatus = "idle" | "validating" | "preparing" | "generating" | "cancelling" | "done" | "error";

export class CodeGenerationManager {
  private registry: CodeGeneratorRegistry;
  private logger: LoggerService;
  private status: GenerationStatus = "idle";
  private activeGenerator: CodeGenerator | null = null;
  private currentProgress: GenerationProgress;
  private startTime = 0;
  private queue: { options: GenerationOptions; generatorId?: string }[] = [];
  private lastArtifact: SourceArtifact | null = null;

  constructor(registry: CodeGeneratorRegistry, logger: LoggerService) {
    this.registry = registry;
    this.logger = logger;
    this.currentProgress = this.createInitialProgress();
  }

  getStatus(): GenerationStatus {
    return this.status;
  }

  getActiveGenerator(): CodeGenerator | null {
    return this.activeGenerator;
  }

  getCurrentProgress(): GenerationProgress {
    return { ...this.currentProgress, messages: [...this.currentProgress.messages], errors: [...this.currentProgress.errors] };
  }

  hasQueuedGenerations(): boolean {
    return this.queue.length > 0;
  }

  getLastArtifact(): SourceArtifact | null {
    return this.lastArtifact;
  }

  enqueue(options: GenerationOptions, generatorId?: string): void {
    this.queue.push({ options, generatorId });
    EventBus.emit(CODEGEN_EVENTS.GENERATION_QUEUED, { options, queueLength: this.queue.length });
    this.logger.info("CodeGenerationManager", `Generation queued for language "${options.language}"`);
  }

  async generate(options: GenerationOptions): Promise<GenerationResult> {
    const generator = this.registry.findForLanguage(options.language, options.framework);
    if (!generator) {
      const err = new GeneratorMissing(options.language);
      this.logger.error("CodeGenerationManager", err.message);
      throw err;
    }
    return this.doGenerate(generator, options);
  }

  async generateWithGenerator(generatorId: string, options: GenerationOptions): Promise<GenerationResult> {
    const generator = this.registry.getById(generatorId);
    if (!generator) {
      const err = new Error(`Code generator "${generatorId}" not found`);
      this.logger.error("CodeGenerationManager", err.message);
      throw err;
    }
    return this.doGenerate(generator, options);
  }

  async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      try {
        if (item.generatorId) {
          await this.generateWithGenerator(item.generatorId, item.options);
        } else {
          await this.generate(item.options);
        }
      } catch (e) {
        this.logger.error("CodeGenerationManager", `Queue generation failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  async cancel(): Promise<void> {
    if (this.status !== "preparing" && this.status !== "generating" && this.status !== "validating") return;
    this.status = "cancelling";
    this.currentProgress.stage = "cancelled";
    this.currentProgress.messages.push("Generation cancelled by user");
    if (this.activeGenerator) {
      await this.activeGenerator.cleanup({ language: "", framework: "", board: "" });
    }
    this.emitProgress();
    EventBus.emit(CODEGEN_EVENTS.GENERATION_CANCELLED, {
      progress: this.getCurrentProgress(),
      duration: Date.now() - this.startTime,
    });
    this.status = "done";
    this.activeGenerator = null;
  }

  retry(options: GenerationOptions): Promise<GenerationResult> {
    this.logger.info("CodeGenerationManager", "Retrying generation");
    return this.generate(options);
  }

  async validateOnly(options: GenerationOptions): Promise<ValidationResult> {
    const generator = this.registry.findForLanguage(options.language, options.framework);
    if (!generator) {
      return { valid: false, issues: [{ severity: "error", code: "NO_GENERATOR", message: `No generator for language "${options.language}"` }] };
    }
    return generator.validate(options);
  }

  reset(): void {
    this.status = "idle";
    this.activeGenerator = null;
    this.currentProgress = this.createInitialProgress();
    this.startTime = 0;
    this.queue = [];
  }

  private async doGenerate(generator: CodeGenerator, options: GenerationOptions): Promise<GenerationResult> {
    this.status = "generating";
    this.activeGenerator = generator;
    this.startTime = Date.now();
    this.currentProgress = this.createInitialProgress();
    EventBus.emit(CODEGEN_EVENTS.GENERATION_STARTED, {
      generator: generator.id,
      options,
      timestamp: this.startTime,
    });
    try {
      this.updateProgress("validating", 5);
      const validation = await generator.validate(options);
      if (!validation.valid) {
        const msgs = validation.issues.map((i) => i.message).join("; ");
        throw new Error(`Validation failed: ${msgs}`);
      }
      this.updateProgress("preparing", 15);
      EventBus.emit(CODEGEN_EVENTS.GENERATION_PREPARING, { options });
      await generator.prepare(options);
      this.updateProgress("generating", 25);
      const result = await generator.generate(options, (p) => {
        this.currentProgress = p;
        this.emitProgress();
      });
      this.updateProgress("finishing", 85);
      if (result.artifact) {
        this.lastArtifact = result.artifact;
      }
      this.updateProgress("done", 100);
      this.currentProgress.messages.push("Generation completed successfully");
      const finalResult: GenerationResult = {
        status: result.status,
        stage: "done",
        message: result.status === "success" ? "Generation completed successfully" : "Generation completed with issues",
        artifact: result.artifact,
        duration: Date.now() - this.startTime,
        timestamp: Date.now(),
      };
      EventBus.emit(CODEGEN_EVENTS.GENERATION_FINISHED, { result: finalResult, progress: this.getCurrentProgress() });
      this.logger.info("CodeGenerationManager", `Generation finished: ${finalResult.status}`);
      this.status = "done";
      this.activeGenerator = null;
      return finalResult;
    } catch (e) {
      this.currentProgress.stage = "error";
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.currentProgress.errors.push(errorMessage);
      this.emitProgress();
      EventBus.emit(CODEGEN_EVENTS.GENERATION_FAILED, {
        error: e,
        progress: this.getCurrentProgress(),
        duration: Date.now() - this.startTime,
      });
      this.logger.error("CodeGenerationManager", `Generation failed: ${errorMessage}`);
      this.status = "error";
      this.activeGenerator = null;
      throw e;
    }
  }

  private updateProgress(stage: GenerationProgress["stage"], percent: number): void {
    this.currentProgress.stage = stage;
    this.currentProgress.percent = percent;
    this.currentProgress.timestamp = Date.now();
    this.emitProgress();
  }

  private emitProgress(): void {
    EventBus.emit(CODEGEN_EVENTS.GENERATION_PROGRESS, this.getCurrentProgress());
  }

  private createInitialProgress(): GenerationProgress {
    return {
      stage: "queued",
      percent: 0,
      messages: [],
      errors: [],
      timestamp: Date.now(),
    };
  }
}
