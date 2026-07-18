import { describe, it, expect } from "vitest";
import { CODEGEN_EVENTS } from "../../types/codegen/events";

describe("Codegen Progress Types", () => {
  it("generation stages are valid strings", () => {
    const stages = ["queued", "validating", "preparing", "generating", "optimizing", "finishing", "done", "error", "cancelled"];
    for (const stage of stages) {
      expect(typeof stage).toBe("string");
      expect(stage.length).toBeGreaterThan(0);
    }
  });

  it("generation stages are distinct", () => {
    const stages = ["queued", "validating", "preparing", "generating", "optimizing", "finishing", "done", "error", "cancelled"];
    expect(new Set(stages).size).toBe(stages.length);
  });

  it("CODEGEN_EVENTS contains all expected events", () => {
    expect(CODEGEN_EVENTS.GENERATION_QUEUED).toBe("generation:queued");
    expect(CODEGEN_EVENTS.GENERATION_STARTED).toBe("generation:started");
    expect(CODEGEN_EVENTS.GENERATION_PREPARING).toBe("generation:preparing");
    expect(CODEGEN_EVENTS.GENERATION_PROGRESS).toBe("generation:progress");
    expect(CODEGEN_EVENTS.GENERATION_FINISHED).toBe("generation:finished");
    expect(CODEGEN_EVENTS.GENERATION_FAILED).toBe("generation:failed");
    expect(CODEGEN_EVENTS.GENERATION_CANCELLED).toBe("generation:cancelled");
  });

  it("ValidationResult has valid and issues fields", () => {
    const success = { valid: true, issues: [] };
    const fail = { valid: false, issues: [{ severity: "error" as const, code: "ERR", message: "fail" }] };
    expect(success.valid).toBe(true);
    expect(fail.valid).toBe(false);
    expect(fail.issues).toHaveLength(1);
  });

  it("GenerationProgress has all required fields", () => {
    const progress = {
      stage: "generating" as const,
      percent: 50,
      messages: ["Generating..."],
      errors: [],
      timestamp: Date.now(),
    };
    expect(progress.stage).toBe("generating");
    expect(progress.percent).toBe(50);
    expect(progress.messages).toHaveLength(1);
    expect(progress.errors).toHaveLength(0);
  });
});
