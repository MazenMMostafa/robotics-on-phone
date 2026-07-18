import type { CodeGenerator, GenerationOptions, GenerationProgress, GenerationResult, ValidationResult } from "../../types/codegen/generator";
import type { SourceArtifact } from "../../types/codegen/artifact";
import { createSourceArtifact } from "../../types/codegen/artifact";

export class MockCodeGenerator implements CodeGenerator {
  readonly id: string;
  readonly name: string;
  readonly version = "1.0.0";
  readonly supportedLanguages: string[];
  readonly supportedFrameworks: string[];

  private cancelled = false;
  private simulateFailure = false;
  private simulateDelay = 0;

  constructor(supportedLanguages?: string[], supportedFrameworks?: string[], id?: string, name?: string) {
    this.id = id ?? "mock-generator-v1";
    this.name = name ?? "Mock Code Generator";
    this.supportedLanguages = supportedLanguages ?? ["arduino-cpp", "micropython"];
    this.supportedFrameworks = supportedFrameworks ?? ["arduino", "micropython"];
  }

  setSimulateFailure(fail: boolean): void {
    this.simulateFailure = fail;
  }

  setSimulateDelay(ms: number): void {
    this.simulateDelay = ms;
  }

  supports(language: string, framework: string): boolean {
    return this.supportedLanguages.includes(language) && this.supportedFrameworks.includes(framework);
  }

  async prepare(_options: GenerationOptions): Promise<void> {
    if (this.simulateDelay) {
      await this.sleep(this.simulateDelay);
    }
    if (this.simulateFailure) {
      throw new Error("Simulated prepare failure");
    }
  }

  async generate(options: GenerationOptions, onProgress?: (progress: GenerationProgress) => void): Promise<GenerationResult> {
    if (this.simulateDelay) {
      await this.sleep(this.simulateDelay);
    }
    if (this.cancelled) {
      return {
        status: "cancelled",
        stage: "cancelled",
        message: "Generation cancelled by user",
        duration: 0,
        timestamp: Date.now(),
      };
    }
    if (this.simulateFailure) {
      return {
        status: "failure",
        stage: "error",
        message: "Simulated generation failure",
        duration: 0,
        timestamp: Date.now(),
      };
    }
    if (onProgress) {
      onProgress({
        stage: "generating", percent: 30, messages: ["Mock generation in progress"], errors: [], timestamp: Date.now(),
      });
      onProgress({
        stage: "optimizing", percent: 60, messages: ["Mock generation optimizing"], errors: [], timestamp: Date.now(),
      });
      onProgress({
        stage: "finishing", percent: 90, messages: ["Mock generation finishing"], errors: [], timestamp: Date.now(),
      });
    }
    const artifact = this.createMockArtifact(options);
    return {
      status: "success",
      stage: "done",
      message: `Mock generation complete for ${options.language}`,
      artifact,
      duration: this.simulateDelay,
      timestamp: Date.now(),
    };
  }

  async validate(options: GenerationOptions): Promise<ValidationResult> {
    if (this.simulateFailure) {
      return { valid: false, issues: [{ severity: "error", code: "MOCK_ERROR", message: "Simulated validation failure", blockType: "mock" }] };
    }
    if (!options.language) {
      return { valid: false, issues: [{ severity: "error", code: "NO_LANGUAGE", message: "No language specified" }] };
    }
    if (!this.supportedLanguages.includes(options.language)) {
      return { valid: false, issues: [{ severity: "error", code: "UNSUPPORTED_LANG", message: `Language "${options.language}" not supported` }] };
    }
    return { valid: true, issues: [] };
  }

  async cleanup(_options: GenerationOptions): Promise<void> {
    // no-op for mock
  }

  private createMockArtifact(options: GenerationOptions): SourceArtifact {
    return createSourceArtifact({
      language: options.language,
      framework: options.framework,
      board: options.board,
      sourceFiles: [{ path: "main.cpp", content: "// Mock generated code" }],
      headers: [{ path: "config.h", content: "// Mock header" }],
      checksum: "mock-source-checksum-12345",
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
