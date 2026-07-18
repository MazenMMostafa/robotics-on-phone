import { describe, it, expect, beforeEach } from "vitest";
import { EventBus } from "../services/extension/EventBus";

describe("EventBus", () => {
  beforeEach(() => {
    EventBus.removeAll();
  });

  it("emits to registered listeners", () => {
    let called = false;
    EventBus.on("test", () => { called = true; });
    EventBus.emit("test");
    expect(called).toBe(true);
  });

  it("passes arguments to listeners", () => {
    let captured: unknown[] = [];
    EventBus.on("args", (...args: unknown[]) => { captured = args; });
    EventBus.emit("args", 1, "two", { three: 3 });
    expect(captured).toEqual([1, "two", { three: 3 }]);
  });

  it("supports once listeners", () => {
    let count = 0;
    EventBus.once("single", () => { count++; });
    EventBus.emit("single");
    EventBus.emit("single");
    expect(count).toBe(1);
  });

  it("unsubscribes with off", () => {
    let count = 0;
    const handler = () => { count++; };
    EventBus.on("test", handler);
    EventBus.emit("test");
    EventBus.off("test", handler);
    EventBus.emit("test");
    expect(count).toBe(1);
  });

  it("unsubscribes with returned dispose function", () => {
    let count = 0;
    const dispose = EventBus.on("test", () => { count++; });
    EventBus.emit("test");
    dispose();
    EventBus.emit("test");
    expect(count).toBe(1);
  });

  it("handles multiple listeners for same event", () => {
    const results: number[] = [];
    EventBus.on("multi", () => results.push(1));
    EventBus.on("multi", () => results.push(2));
    EventBus.emit("multi");
    expect(results).toContain(1);
    expect(results).toContain(2);
  });

  it("continues if one handler throws", () => {
    let secondCalled = false;
    EventBus.on("error", () => { throw new Error("boom"); });
    EventBus.on("error", () => { secondCalled = true; });
    expect(() => EventBus.emit("error")).not.toThrow();
    expect(secondCalled).toBe(true);
  });

  it("removeAll clears all listeners", () => {
    let count = 0;
    EventBus.on("a", () => count++);
    EventBus.on("b", () => count++);
    EventBus.removeAll();
    EventBus.emit("a");
    EventBus.emit("b");
    expect(count).toBe(0);
  });

  it("removeAll(event) clears specific event", () => {
    let aCount = 0;
    let bCount = 0;
    EventBus.on("a", () => aCount++);
    EventBus.on("b", () => bCount++);
    EventBus.removeAll("a");
    EventBus.emit("a");
    EventBus.emit("b");
    expect(aCount).toBe(0);
    expect(bCount).toBe(1);
  });

  it("listenerCount returns correct count", () => {
    EventBus.on("test", () => {});
    EventBus.on("test", () => {});
    EventBus.once("test", () => {});
    expect(EventBus.listenerCount("test")).toBe(3);
    expect(EventBus.listenerCount("other")).toBe(0);
  });

  it("once dispose prevents the listener from firing", () => {
    let count = 0;
    const dispose = EventBus.once("test", () => { count++; });
    dispose();
    EventBus.emit("test");
    expect(count).toBe(0);
  });

  it("memory cleanup: removed listeners are garbage collectable", () => {
    const handler = () => {};
    EventBus.on("test", handler);
    expect(EventBus.listenerCount("test")).toBe(1);
    EventBus.off("test", handler);
    expect(EventBus.listenerCount("test")).toBe(0);
  });
});
