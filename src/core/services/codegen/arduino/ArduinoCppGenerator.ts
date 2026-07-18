import type { CodeGenerator, GenerationOptions, GenerationProgress, GenerationResult, ValidationResult } from "../../../types/codegen/generator";
import type { SourceArtifact } from "../../../types/codegen/artifact";
import { createSourceArtifact } from "../../../types/codegen/artifact";
import type { ArduinoBlock } from "./types";
import { ArduinoValidator } from "./ArduinoValidator";
import { GenerationContext } from "./GenerationContext";
import { generateChain, getField } from "./BlockGenerators";
import { createHash } from "crypto";

export class ArduinoCppGenerator implements CodeGenerator {
  readonly id = "arduino-cpp-generator-v1";
  readonly name = "Arduino C++ Generator";
  readonly version = "1.0.0";
  readonly supportedLanguages = ["arduino-cpp"];
  readonly supportedFrameworks = ["arduino"];

  private validator = new ArduinoValidator();
  private cancelled = false;

  supports(language: string, framework: string): boolean {
    return this.supportedLanguages.includes(language) && this.supportedFrameworks.includes(framework);
  }

  async prepare(_options: GenerationOptions): Promise<void> {
    this.cancelled = false;
  }

  async generate(options: GenerationOptions, onProgress?: (progress: GenerationProgress) => void): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      if (this.cancelled) {
        return { status: "cancelled", stage: "cancelled", message: "Generation cancelled", duration: 0, timestamp: Date.now() };
      }

      this.reportProgress(onProgress, "validating", 10, ["Validating workspace"]);
      const validation = await this.validate(options);
      if (!validation.valid) {
        return {
          status: "failure",
          stage: "error",
          message: `Validation failed: ${validation.issues.map((i) => i.message).join("; ")}`,
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        };
      }

      this.reportProgress(onProgress, "preparing", 20, ["Preparing workspace blocks"]);
      const blocks = this.parseBlocks(options);

      if (blocks.length === 0) {
        const emptyArtifact = this.createEmptySketch(options);
        return {
          status: "success",
          stage: "done",
          message: "Empty sketch generated (no blocks)",
          artifact: emptyArtifact,
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        };
      }

      this.reportProgress(onProgress, "generating", 40, ["Generating Arduino C++ code"]);
      const ctx = new GenerationContext();
      const { setupCode, loopCode } = this.generateSketchSections(blocks, ctx);

      this.reportProgress(onProgress, "optimizing", 70, ["Optimizing generated code"]);
      const sketch = this.assembleSketch(options, ctx, setupCode, loopCode);

      this.reportProgress(onProgress, "finishing", 90, ["Creating source artifact"]);
      const checksum = createHash("sha256").update(sketch).digest("hex");
      const artifact = createSourceArtifact({
        language: options.language,
        framework: options.framework,
        board: options.board,
        sourceFiles: [
          { path: `${this.getSketchName(options)}.ino`, content: sketch },
        ],
        checksum,
        metadata: {
          generatorId: this.id,
          generatorVersion: this.version,
          blockCount: String(blocks.length),
          variableCount: String(ctx.variables.size),
        },
      });

      this.reportProgress(onProgress, "done", 100, ["Generation complete"]);
      return {
        status: "success",
        stage: "done",
        message: "Arduino C++ sketch generated successfully",
        artifact,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        status: "failure",
        stage: "error",
        message: `Generation failed: ${errMsg}`,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }

  async validate(options: GenerationOptions): Promise<ValidationResult> {
    if (!options.language) {
      return { valid: false, issues: [{ severity: "error", code: "NO_LANGUAGE", message: "No language specified" }] };
    }
    if (!this.supportedLanguages.includes(options.language)) {
      return { valid: false, issues: [{ severity: "error", code: "UNSUPPORTED_LANG", message: `Language "${options.language}" not supported by Arduino C++ generator` }] };
    }
    if (!options.framework) {
      return { valid: false, issues: [{ severity: "error", code: "NO_FRAMEWORK", message: "No framework specified" }] };
    }
    if (!this.supportedFrameworks.includes(options.framework)) {
      return { valid: false, issues: [{ severity: "error", code: "UNSUPPORTED_FRAMEWORK", message: `Framework "${options.framework}" not supported by Arduino C++ generator` }] };
    }
    const blocks = this.parseBlocks(options);
    return this.validator.validateBlocks(blocks, options.board);
  }

  async cleanup(_options: GenerationOptions): Promise<void> {
    this.cancelled = false;
  }

  private parseBlocks(options: GenerationOptions): ArduinoBlock[] {
    if (options.blocks && options.blocks.length > 0) {
      return options.blocks as ArduinoBlock[];
    }
    return [];
  }

  private generateSketchSections(blocks: ArduinoBlock[], ctx: GenerationContext): { setupCode: string; loopCode: string } {
    const setupBlocks: ArduinoBlock[] = [];
    const loopBlocks: ArduinoBlock[] = [];
    const otherBlocks: ArduinoBlock[] = [];

    for (const block of blocks) {
      if (block.type === "controls_start") {
        if (block.next) setupBlocks.push(block.next);
      } else if (block.type === "controls_forever") {
        if (block.next) loopBlocks.push(block.next);
      } else {
        otherBlocks.push(block);
      }
    }

    if (setupBlocks.length === 0 && loopBlocks.length === 0 && otherBlocks.length > 0) {
      const includes = this.findIncludeBlocks(otherBlocks);
      const nonIncludes = otherBlocks.filter((b) => b.type !== "comment" || !getField(b, "TEXT", "").startsWith("#include"));

      if (includes.length > 0) {
        for (const inc of includes) {
          const text = getField(inc, "TEXT", "").replace("#include ", "").trim();
          if (text) ctx.addInclude(text);
        }
      }
      if (nonIncludes.length > 0) {
        setupBlocks.push(...nonIncludes);
      }
      return { setupCode: this.generateBlockSequence(setupBlocks, ctx), loopCode: "" };
    }

    this.collectIncludesFromLifecycle(setupBlocks, ctx);
    this.collectIncludesFromLifecycle(loopBlocks, ctx);

    return {
      setupCode: this.generateBlockSequence(setupBlocks, ctx) || "  // no setup blocks",
      loopCode: this.generateBlockSequence(loopBlocks, ctx) || "  // no loop blocks",
    };
  }

  private findIncludeBlocks(blocks: ArduinoBlock[]): ArduinoBlock[] {
    return blocks.filter((b) => {
      if (b.type !== "comment") return false;
      const text = getField(b, "TEXT", "");
      return text.startsWith("#include");
    });
  }

  private collectIncludesFromLifecycle(blocks: ArduinoBlock[], ctx: GenerationContext): void {
    const visit = (block?: ArduinoBlock) => {
      if (!block) return;
      if (block.type === "comment") {
        const text = getField(block, "TEXT", "");
        if (text.startsWith("#include")) {
          const includePath = text.replace("#include ", "").trim();
          if (includePath) ctx.addInclude(includePath);
        }
      }
      if (block.inputs) {
        for (const [, inputValue] of Object.entries(block.inputs)) {
          if (inputValue && typeof inputValue === "object") {
            const inputObj = inputValue as Record<string, unknown>;
            if (inputObj.block && typeof inputObj.block === "object") {
              visit(inputObj.block as ArduinoBlock);
            }
          }
        }
      }
      visit(block.next);
    };
    for (const b of blocks) visit(b);
  }

  private generateBlockSequence(blocks: ArduinoBlock[], ctx: GenerationContext): string {
    if (blocks.length === 0) return "";

    const nonLifecycle = blocks.filter((b) => b.type !== "controls_start" && b.type !== "controls_forever");
    if (nonLifecycle.length === 0) return "";

    const generateSubBlocks = (subBlock?: ArduinoBlock): string => {
      if (!subBlock) return "";
      return generateChain(subBlock, ctx, generateSubBlocks);
    };

    const codeParts = nonLifecycle.map((b) => generateChain(b, ctx, generateSubBlocks));
    return codeParts.filter((c) => c.trim()).join("\n");
  }

  private assembleSketch(options: GenerationOptions, ctx: GenerationContext, setupCode: string, loopCode: string): string {
    const lines: string[] = [];

    const includeCode = ctx.getIncludesCode();
    if (includeCode) {
      lines.push(includeCode);
      lines.push("");
    }

    lines.push(`// Generated by ${this.name} v${this.version}`);
    lines.push(`// Board: ${options.board}`);
    lines.push("");

    const globals = ctx.getGlobalVariables();
    if (globals) {
      lines.push("// Global variables");
      lines.push(globals);
      lines.push("");
    }

    lines.push("void setup() {");
    if (setupCode) {
      lines.push(setupCode);
    }
    lines.push("}");
    lines.push("");

    lines.push("void loop() {");
    if (loopCode) {
      lines.push(loopCode);
    }
    lines.push("}");

    return lines.join("\n");
  }

  private createEmptySketch(options: GenerationOptions): SourceArtifact {
    const sketch = [
      `// Generated by ${this.name} v${this.version}`,
      `// Board: ${options.board}`,
      "",
      "void setup() {",
      "  // no setup blocks",
      "}",
      "",
      "void loop() {",
      "  // no loop blocks",
      "}",
      "",
    ].join("\n");

    return createSourceArtifact({
      language: options.language,
      framework: options.framework,
      board: options.board,
      sourceFiles: [{ path: "sketch.ino", content: sketch }],
      checksum: createHash("sha256").update(sketch).digest("hex"),
    });
  }

  private getSketchName(options: GenerationOptions): string {
    const name = options.additionalArgs?.sketchName as string;
    if (name && typeof name === "string" && name.trim()) return name.trim();
    return "sketch";
  }

  private reportProgress(
    onProgress: ((progress: GenerationProgress) => void) | undefined,
    stage: GenerationProgress["stage"],
    percent: number,
    messages: string[],
  ): void {
    if (onProgress) {
      onProgress({ stage, percent, messages, errors: [], timestamp: Date.now() });
    }
  }
}
