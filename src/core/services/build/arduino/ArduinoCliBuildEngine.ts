import { randomUUID, createHash } from "crypto";
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "fs";
import { join, basename } from "path";
import { tmpdir } from "os";
import type {
  BuildEngine,
  BuildOptions,
  BuildProgress,
  BuildResult,
} from "../../../types/build/engine";
import type { BuildArtifact } from "../../../types/build/artifact";
import {
  CompilerMissing,
  InvalidBoard,
} from "../../../types/build/error";
import { ArduinoCliAdapter } from "./ArduinoCliAdapter";
import {
  ARDUINO_BOARD_FQBNS,
  ARDUINO_SUPPORTED_BOARDS,
  ARDUINO_FRAMEWORK,
} from "./types";

export class ArduinoCliBuildEngine implements BuildEngine {
  readonly id = "arduino-cli-v1";
  readonly name = "Arduino CLI Build Engine";
  readonly version = "1.0.0";
  readonly supportedFrameworks: string[] = [ARDUINO_FRAMEWORK];

  private adapter: ArduinoCliAdapter;
  private activeBuildPath: string | null = null;
  private activeBuildOutputPath: string | null = null;

  constructor(adapter?: ArduinoCliAdapter) {
    this.adapter = adapter ?? new ArduinoCliAdapter();
  }

  setAdapter(adapter: ArduinoCliAdapter): void {
    this.adapter = adapter;
  }

  supports(boardId: string, framework: string): boolean {
    return (
      framework === ARDUINO_FRAMEWORK &&
      ARDUINO_SUPPORTED_BOARDS.includes(boardId)
    );
  }

  async prepare(options: BuildOptions): Promise<void> {
    this.validateBoard(options.boardId);
    const toolInfo = this.adapter.detectTool();
    if (!toolInfo) {
      throw new CompilerMissing(options.framework);
    }
  }

  async build(
    options: BuildOptions,
    onProgress?: (progress: BuildProgress) => void,
  ): Promise<BuildResult> {
    const startTime = Date.now();
    this.validateBoard(options.boardId);
    const fqbn = this.getFqbn(options.boardId);

    const toolInfo = this.adapter.detectTool();
    if (!toolInfo) {
      throw new CompilerMissing(options.framework);
    }

    this.reportProgress(onProgress, "preparing", 10, ["Preparing build environment"]);

    const sketchDir = this.createTempDir("arduino-sketch-");
    const buildDir = this.createTempDir("arduino-build-");
    this.activeBuildPath = sketchDir;
    this.activeBuildOutputPath = buildDir;

    try {
      const sourceContent = this.resolveSourceContent(options);
      if (!sourceContent) {
        throw new Error("No source content provided. Set sourcePath or additionalArgs.sourceContent in BuildOptions.");
      }

      this.writeSketchFiles(sketchDir, sourceContent, fqbn);

      this.reportProgress(onProgress, "compiling", 30, ["Compiling sketch..."]);

      const compileResult = this.adapter.compile({
        fqbn,
        sketchPath: sketchDir,
        buildPath: buildDir,
        verbose: true,
      });

      if (!compileResult.success) {
        const errorMessages = compileResult.errors.join("\n");
        this.reportProgress(onProgress, "error", 0, [], [errorMessages]);
        return {
          status: "failure",
          stage: "error",
          message: `Compilation failed: ${errorMessages}`,
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        };
      }

      this.reportProgress(onProgress, "linking", 60, ["Linking firmware..."]);

      const hexPath = compileResult.hexPath;
      const elfPath = compileResult.elfPath;

      if (!hexPath || !existsSync(hexPath)) {
        const msg = "Build completed but no .hex file was produced";
        this.reportProgress(onProgress, "error", 0, [], [msg]);
        return {
          status: "failure",
          stage: "error",
          message: msg,
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        };
      }

      this.reportProgress(onProgress, "finishing", 85, ["Generating build artifact..."]);

      const size = compileResult.size;
      const hexContent = readFileSync(hexPath);
      const checksum = this.computeSha256(hexContent);

      const artifact: BuildArtifact = {
        boardId: options.boardId,
        framework: options.framework,
        firmwarePath: hexPath,
        hexPath,
        elfPath,
        mapPath: compileResult.mapPath,
        size,
        checksum,
        timestamp: Date.now(),
      };

      this.reportProgress(onProgress, "done", 100, ["Build complete"]);

      return {
        status: "success",
        stage: "done",
        message: `Build succeeded for ${options.boardId}`,
        artifact,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.reportProgress(onProgress, "error", 0, [], [message]);
      return {
        status: "failure",
        stage: "error",
        message,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }

  async verify(artifact: BuildArtifact): Promise<boolean> {
    if (!artifact.firmwarePath) return false;
    try {
      if (!existsSync(artifact.firmwarePath)) return false;
      const content = readFileSync(artifact.firmwarePath);
      const actualChecksum = this.computeSha256(content);
      return actualChecksum === artifact.checksum;
    } catch {
      return false;
    }
  }

  async cleanup(_options: BuildOptions): Promise<void> {
    for (const dir of [this.activeBuildPath, this.activeBuildOutputPath]) {
      if (dir && existsSync(dir)) {
        try {
          rmSync(dir, { recursive: true, force: true });
        } catch {
          // ignore cleanup errors
        }
      }
    }
    this.activeBuildPath = null;
    this.activeBuildOutputPath = null;
  }

  private validateBoard(boardId: string): void {
    if (!ARDUINO_SUPPORTED_BOARDS.includes(boardId)) {
      throw new InvalidBoard(boardId);
    }
  }

  private getFqbn(boardId: string): string {
    return ARDUINO_BOARD_FQBNS[boardId];
  }

  private createTempDir(prefix: string): string {
    const dir = join(tmpdir(), `${prefix}${randomUUID()}`);
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  private resolveSourceContent(options: BuildOptions): string | undefined {
    if (options.additionalArgs?.sourceContent) {
      return options.additionalArgs.sourceContent as string;
    }
    if (options.sourcePath) {
      const inoPath = join(options.sourcePath, "sketch.ino");
      if (existsSync(inoPath)) {
        return readFileSync(inoPath, "utf-8");
      }
    }
    return undefined;
  }

  private writeSketchFiles(sketchDir: string, content: string, _fqbn: string): void {
    const sketchName = basename(sketchDir);
    const mainFile = join(sketchDir, `${sketchName}.ino`);
    writeFileSync(mainFile, content, "utf-8");
  }

  private reportProgress(
    onProgress: ((progress: BuildProgress) => void) | undefined,
    stage: BuildProgress["stage"],
    percent: number,
    messages: string[],
    errors?: string[],
  ): void {
    if (!onProgress) return;
    onProgress({
      stage,
      percent,
      messages,
      errors: errors ?? [],
      timestamp: Date.now(),
    });
  }

  private computeSha256(content: Buffer): string {
    return createHash("sha256").update(content).digest("hex");
  }
}
