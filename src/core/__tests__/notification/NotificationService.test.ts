import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NotificationService } from "../../services/notification/NotificationService";

describe("NotificationService", () => {
  let ns: NotificationService;

  beforeEach(() => {
    ns = new NotificationService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("success adds notification", () => {
    const id = ns.success("Done");
    expect(ns.getQueue()).toHaveLength(1);
    expect(ns.getQueue()[0].type).toBe("success");
    expect(ns.getQueue()[0].title).toBe("Done");
    expect(typeof id).toBe("string");
  });

  it("info adds notification", () => {
    ns.info("Info", "details");
    expect(ns.getQueue()[0].type).toBe("info");
    expect(ns.getQueue()[0].message).toBe("details");
  });

  it("warning adds notification", () => {
    ns.warning("Warning");
    expect(ns.getQueue()[0].type).toBe("warning");
  });

  it("error adds notification", () => {
    ns.error("Error");
    expect(ns.getQueue()[0].type).toBe("error");
  });

  it("loading adds notification without auto-dismiss", () => {
    ns.loading("Loading");
    expect(ns.getQueue()[0].type).toBe("loading");
    expect(ns.getQueue()[0].duration).toBe(0);
    expect(ns.getQueue()[0].dismissible).toBe(false);
  });

  it("dismiss removes notification", () => {
    const id = ns.info("Info");
    expect(ns.getQueue()).toHaveLength(1);
    ns.dismiss(id);
    expect(ns.getQueue()).toHaveLength(0);
  });

  it("clear removes all notifications", () => {
    ns.info("A");
    ns.info("B");
    ns.clear();
    expect(ns.getQueue()).toHaveLength(0);
  });

  it("auto-dismisses after duration", () => {
    vi.useFakeTimers();
    ns.success("Auto", undefined, 1000);
    expect(ns.getQueue()).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(ns.getQueue()).toHaveLength(0);
  });

  it("updateProgress updates notification progress", () => {
    const id = ns.loading("Loading");
    ns.updateProgress(id, 50);
    expect(ns.getQueue()[0].progress).toBe(50);
  });

  it("setMaxVisible limits queue", () => {
    ns.setMaxVisible(2);
    ns.info("A");
    ns.info("B");
    ns.info("C");
    expect(ns.getQueue().length).toBeLessThanOrEqual(2);
  });

  it("includes timestamp", () => {
    const before = Date.now();
    ns.info("test");
    expect(ns.getQueue()[0].timestamp).toBeGreaterThanOrEqual(before);
  });
});
