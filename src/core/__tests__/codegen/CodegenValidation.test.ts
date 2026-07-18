import { describe, it, expect } from "vitest";
import { CodeGenerationError, GeneratorMissing, UnsupportedLanguage, InvalidWorkspace, InvalidBlock, GenerationFailed } from "../../types/codegen/error";

describe("Codegen Error Model", () => {
  it("CodeGenerationError has code, recoverable, details", () => {
    const err = new CodeGenerationError("TEST", "test error", true, { key: "val" });
    expect(err.code).toBe("TEST");
    expect(err.recoverable).toBe(true);
    expect(err.details.key).toBe("val");
    expect(err.message).toBe("test error");
    expect(err.name).toBe("CodeGenerationError");
  });

  it("GeneratorMissing is not recoverable", () => {
    const err = new GeneratorMissing("arduino-cpp");
    expect(err.code).toBe("GENERATOR_MISSING");
    expect(err.recoverable).toBe(false);
    expect(err.message).toContain("arduino-cpp");
  });

  it("UnsupportedLanguage is not recoverable", () => {
    const err = new UnsupportedLanguage("python", "arduino");
    expect(err.code).toBe("UNSUPPORTED_LANGUAGE");
    expect(err.recoverable).toBe(false);
  });

  it("InvalidWorkspace is not recoverable", () => {
    const err = new InvalidWorkspace("missing blocks");
    expect(err.code).toBe("INVALID_WORKSPACE");
    expect(err.recoverable).toBe(false);
  });

  it("InvalidBlock is recoverable", () => {
    const err = new InvalidBlock("led_blink", "missing pin");
    expect(err.code).toBe("INVALID_BLOCK");
    expect(err.recoverable).toBe(true);
    expect(err.details.blockType).toBe("led_blink");
  });

  it("GenerationFailed is recoverable", () => {
    const err = new GenerationFailed("arduino-cpp", "syntax error");
    expect(err.code).toBe("GENERATION_FAILED");
    expect(err.recoverable).toBe(true);
  });
});
