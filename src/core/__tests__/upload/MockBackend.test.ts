import { describe, it, expect, beforeEach } from "vitest";
import { MockBackend } from "../../services/upload/backends/MockBackend";
import type { UploadOptions } from "../../services/upload/UploadEngine";

function makeOptions(overrides?: Partial<UploadOptions>): UploadOptions {
  return { boardId: "mock-board", portId: "/dev/test", artifactPath: "/tmp/test.hex", ...overrides };
}

describe("MockBackend", () => {
  let backend: MockBackend;

  beforeEach(() => {
    backend = new MockBackend();
  });

  it("detects as installed", async () => {
    const info = await backend.detect();
    expect(info.status).toBe("installed");
    expect(info.id).toBe("mock-v1");
  });

  it("validates options", async () => {
    const r = await backend.validate(makeOptions());
    expect(r.valid).toBe(true);
  });

  it("executes successful upload", async () => {
    const r = await backend.execute(makeOptions());
    expect(r.status).toBe("success");
  });

  it("simulates failure", async () => {
    backend.setSimulateFailure(true);
    const r = await backend.execute(makeOptions());
    expect(r.status).toBe("failure");
  });

  it("simulates cancellation", async () => {
    backend.setSimulateDelay(50);
    backend.cancel();
    const r = await backend.execute(makeOptions());
    expect(r.status).toBe("cancelled");
  });

  it("verifies successfully by default", async () => {
    const ok = await backend.verify(makeOptions());
    expect(ok).toBe(true);
  });

  it("verification fails when simulate failure", async () => {
    backend.setSimulateFailure(true);
    const ok = await backend.verify(makeOptions());
    expect(ok).toBe(false);
  });

  it("cancel sets flag", async () => {
    await backend.cancel();
    backend.setSimulateDelay(50);
    const r = await backend.execute(makeOptions());
    expect(r.status).toBe("cancelled");
  });

  it("cleanup does nothing", async () => {
    await expect(backend.cleanup(makeOptions())).resolves.toBeUndefined();
  });

  it("stores supported boards from constructor", async () => {
    const custom = new MockBackend(["board-x", "board-y"]);
    const info = await custom.detect();
    expect(info.supportedBoards).toEqual(["board-x", "board-y"]);
  });
});
