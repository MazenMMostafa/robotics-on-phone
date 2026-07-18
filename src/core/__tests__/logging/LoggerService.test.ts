import { describe, it, expect, beforeEach } from "vitest";
import { LoggerService } from "../../services/logging/LoggerService";

describe("LoggerService", () => {
  let logger: LoggerService;

  beforeEach(() => {
    logger = new LoggerService();
  });

  it("starts at info level", () => {
    expect(logger.getLevel()).toBe("info");
  });

  it("setLevel changes log level", () => {
    logger.setLevel("debug");
    expect(logger.getLevel()).toBe("debug");
    logger.setLevel("silent");
    expect(logger.getLevel()).toBe("silent");
  });

  it("debug is filtered at info level", () => {
    logger.setLevel("info");
    logger.debug("test", "should not appear");
    expect(logger.getHistory()).toHaveLength(0);
  });

  it("info is captured at info level", () => {
    logger.info("test", "hello");
    expect(logger.getHistory()).toHaveLength(1);
    expect(logger.getHistory()[0].message).toBe("hello");
    expect(logger.getHistory()[0].level).toBe("info");
    expect(logger.getHistory()[0].module).toBe("test");
  });

  it("warn and error are captured above info level", () => {
    logger.warn("mod", "warning");
    logger.error("mod", "error");
    expect(logger.getHistory()).toHaveLength(2);
  });

  it("silent filters everything", () => {
    logger.setLevel("silent");
    logger.error("mod", "err");
    expect(logger.getHistory()).toHaveLength(0);
  });

  it("setMaxHistory truncates old entries", () => {
    for (let i = 0; i < 10; i++) {
      logger.info("mod", `msg${i}`);
    }
    expect(logger.getHistory()).toHaveLength(10);
    logger.setMaxHistory(3);
    expect(logger.getHistory()).toHaveLength(3);
    expect(logger.getHistory()[0].message).toBe("msg7");
  });

  it("clearHistory empties history", () => {
    logger.info("mod", "msg");
    logger.clearHistory();
    expect(logger.getHistory()).toHaveLength(0);
  });

  it("onEntry notifies listeners", () => {
    const entries: string[] = [];
    const unsub = logger.onEntry((e) => entries.push(e.message));
    logger.info("mod", "test");
    expect(entries).toEqual(["test"]);
    unsub();
    logger.info("mod", "after");
    expect(entries).toHaveLength(1);
  });

  it("includes timestamp in entries", () => {
    const before = Date.now();
    logger.info("mod", "msg");
    const entry = logger.getHistory()[0];
    expect(entry.timestamp).toBeGreaterThanOrEqual(before);
    expect(entry.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it("includes data in entries", () => {
    logger.info("mod", "msg", { key: "val" });
    expect(logger.getHistory()[0].data).toEqual({ key: "val" });
  });
});
