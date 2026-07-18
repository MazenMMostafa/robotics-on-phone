import { describe, it, expect } from "vitest";
import { createInitialProgress } from "../../types/upload";

describe("UploadProgress", () => {
  it("creates initial progress with idle stage", () => {
    const p = createInitialProgress();
    expect(p.stage).toBe("idle");
    expect(p.percent).toBe(0);
    expect(p.estimatedRemaining).toBe(0);
    expect(p.speed).toBe(0);
    expect(p.messages).toEqual([]);
    expect(p.errors).toEqual([]);
    expect(typeof p.timestamp).toBe("number");
  });

  it("mutates correctly", () => {
    const p = createInitialProgress();
    p.stage = "uploading";
    p.percent = 50;
    p.messages.push("halfway there");
    expect(p.stage).toBe("uploading");
    expect(p.percent).toBe(50);
    expect(p.messages).toHaveLength(1);
  });
});
