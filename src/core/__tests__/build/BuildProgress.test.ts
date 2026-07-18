import { describe, it, expect } from "vitest";
import { BUILD_EVENTS } from "../../types/build/events";

describe("Build Progress Types", () => {
  it("build stages are valid strings", () => {
    const stages = [
      "queued",
      "preparing",
      "compiling",
      "linking",
      "optimizing",
      "finishing",
      "done",
      "error",
      "cancelled",
    ] as const;
    for (const stage of stages) {
      expect(typeof stage).toBe("string");
      expect(stage.length).toBeGreaterThan(0);
    }
  });

  it("build stages are distinct", () => {
    const stages = ["queued", "preparing", "compiling", "linking", "optimizing", "finishing", "done", "error", "cancelled"];
    const unique = new Set(stages);
    expect(unique.size).toBe(stages.length);
  });

  it("BUILD_EVENTS contains all expected events", () => {

    expect(BUILD_EVENTS.BUILD_QUEUED).toBe("build:queued");
    expect(BUILD_EVENTS.BUILD_STARTED).toBe("build:started");
    expect(BUILD_EVENTS.BUILD_PREPARING).toBe("build:preparing");
    expect(BUILD_EVENTS.BUILD_PROGRESS).toBe("build:progress");
    expect(BUILD_EVENTS.BUILD_FINISHED).toBe("build:finished");
    expect(BUILD_EVENTS.BUILD_FAILED).toBe("build:failed");
    expect(BUILD_EVENTS.BUILD_CANCELLED).toBe("build:cancelled");
  });

  it("BuildResult type has status field", () => {
    const success = { status: "success" as const, stage: "done" as const, message: "ok", duration: 100, timestamp: Date.now() };
    const failure = { status: "failure" as const, stage: "error" as const, message: "fail", duration: 0, timestamp: Date.now() };
    const cancelled = { status: "cancelled" as const, stage: "cancelled" as const, message: "cancelled", duration: 0, timestamp: Date.now() };
    expect(success.status).toBe("success");
    expect(failure.status).toBe("failure");
    expect(cancelled.status).toBe("cancelled");
  });

  it("BuildProgress has all required fields", () => {
    const progress = {
      stage: "compiling" as const,
      percent: 50,
      messages: ["Compiling..."],
      errors: [],
      timestamp: Date.now(),
    };
    expect(progress.stage).toBe("compiling");
    expect(progress.percent).toBe(50);
    expect(progress.messages).toHaveLength(1);
    expect(progress.errors).toHaveLength(0);
  });
});
