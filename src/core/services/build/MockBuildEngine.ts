import type { BuildEngine, BuildOptions, BuildProgress, BuildResult } from "../../types/build/engine";
import type { BuildArtifact } from "../../types/build/artifact";
import { createBuildArtifact } from "../../types/build/artifact";

export class MockBuildEngine implements BuildEngine {
  readonly id: string;
  readonly name: string;
  readonly version = "1.0.0";
  readonly supportedFrameworks: string[];

  private cancelled = false;
  private simulateFailure = false;
  private simulateDelay = 0;
  private supportedBoards: string[];

  constructor(supportedBoards?: string[], supportedFrameworks?: string[], id?: string, name?: string) {
    this.id = id ?? "mock-build-v1";
    this.name = name ?? "Mock Build Engine";
    this.supportedBoards = supportedBoards ?? ["mock-board"];
    this.supportedFrameworks = supportedFrameworks ?? ["arduino", "esp-idf"];
  }

  setSimulateFailure(fail: boolean): void {
    this.simulateFailure = fail;
  }

  setSimulateDelay(ms: number): void {
    this.simulateDelay = ms;
  }

  supports(boardId: string, _framework: string): boolean {
    return this.supportedBoards.includes(boardId);
  }

  async prepare(_options: BuildOptions): Promise<void> {
    if (this.simulateDelay) {
      await this.sleep(this.simulateDelay);
    }
    if (this.simulateFailure) {
      throw new Error("Simulated prepare failure");
    }
  }

  async build(options: BuildOptions, onProgress?: (progress: BuildProgress) => void): Promise<BuildResult> {
    if (this.simulateDelay) {
      await this.sleep(this.simulateDelay);
    }

    if (this.cancelled) {
      return {
        status: "cancelled",
        stage: "cancelled",
        message: "Build cancelled by user",
        duration: 0,
        timestamp: Date.now(),
      };
    }

    if (this.simulateFailure) {
      return {
        status: "failure",
        stage: "error",
        message: "Simulated build failure",
        duration: 0,
        timestamp: Date.now(),
      };
    }

    if (onProgress) {
      onProgress({
        stage: "compiling",
        percent: 30,
        messages: ["Mock build in progress"],
        errors: [],
        timestamp: Date.now(),
      });
      onProgress({
        stage: "linking",
        percent: 60,
        messages: ["Mock build linking"],
        errors: [],
        timestamp: Date.now(),
      });
      onProgress({
        stage: "finishing",
        percent: 90,
        messages: ["Mock build finishing"],
        errors: [],
        timestamp: Date.now(),
      });
    }

    const artifact = this.createMockArtifact(options);

    return {
      status: "success",
      stage: "done",
      message: `Mock build complete for ${options.boardId}`,
      artifact,
      duration: this.simulateDelay,
      timestamp: Date.now(),
    };
  }

  async verify(artifact: BuildArtifact): Promise<boolean> {
    if (this.simulateFailure) return false;
    return artifact.checksum === "mock-checksum-12345";
  }

  async cleanup(_options: BuildOptions): Promise<void> {
    // no-op for mock
  }

  private createMockArtifact(options: BuildOptions): BuildArtifact {
    return createBuildArtifact({
      boardId: options.boardId,
      framework: options.framework,
      firmwarePath: `/tmp/mock-build/${options.boardId}/firmware.hex`,
      size: 32256,
      checksum: "mock-checksum-12345",
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
