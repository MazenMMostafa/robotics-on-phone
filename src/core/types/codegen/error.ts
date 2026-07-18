export class CodeGenerationError extends Error {
  readonly code: string;
  readonly recoverable: boolean;
  readonly details: Record<string, unknown>;

  constructor(code: string, message: string, recoverable = false, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "CodeGenerationError";
    this.code = code;
    this.recoverable = recoverable;
    this.details = details;
  }
}

export class GeneratorMissing extends CodeGenerationError {
  constructor(language: string) {
    super("GENERATOR_MISSING", `No code generator found for language "${language}"`, false, { language });
    this.name = "GeneratorMissing";
  }
}

export class UnsupportedLanguage extends CodeGenerationError {
  constructor(language: string, framework: string) {
    super("UNSUPPORTED_LANGUAGE", `Language "${language}" is not supported for framework "${framework}"`, false, { language, framework });
    this.name = "UnsupportedLanguage";
  }
}

export class InvalidWorkspace extends CodeGenerationError {
  constructor(reason: string) {
    super("INVALID_WORKSPACE", `Invalid workspace: ${reason}`, false, { reason });
    this.name = "InvalidWorkspace";
  }
}

export class InvalidBlock extends CodeGenerationError {
  constructor(blockType: string, message: string) {
    super("INVALID_BLOCK", `Invalid block "${blockType}": ${message}`, true, { blockType, message });
    this.name = "InvalidBlock";
  }
}

export class GenerationFailed extends CodeGenerationError {
  constructor(language: string, reason: string) {
    super("GENERATION_FAILED", `Code generation failed for "${language}": ${reason}`, true, { language, reason });
    this.name = "GenerationFailed";
  }
}
