import { describe, it, expect, beforeEach } from "vitest";
import { ServiceContainer } from "../di/ServiceContainer";

describe("ServiceContainer", () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  it("resolves registered instances", () => {
    const obj = { value: 42 };
    container.registerInstance("test", obj);
    expect(container.get("test")).toBe(obj);
  });

  it("resolves factory-defined services", () => {
    container.register({
      name: "factory",
      factory: () => ({ value: 99 }),
    });
    const result = container.get<{ value: number }>("factory");
    expect(result.value).toBe(99);
  });

  it("returns singleton instance from factory", () => {
    container.register({
      name: "singleton",
      factory: () => ({ id: Math.random() }),
    });
    const a = container.get<{ id: number }>("singleton");
    const b = container.get<{ id: number }>("singleton");
    expect(a.id).toBe(b.id);
  });

  it("creates new instance when singleton: false", () => {
    container.register({
      name: "transient",
      factory: () => ({ id: Math.random() }),
      singleton: false,
    });
    const a = container.get<{ id: number }>("transient");
    const b = container.get<{ id: number }>("transient");
    expect(a.id).not.toBe(b.id);
  });

  it("throws for unregistered services", () => {
    expect(() => container.get("nonexistent")).toThrow('Service "nonexistent" is not registered');
  });

  it("returns true from has() for registered services", () => {
    container.registerInstance("exists", {});
    expect(container.has("exists")).toBe(true);
    expect(container.has("missing")).toBe(false);
  });

  it("throws on circular dependencies", () => {
    container.register({
      name: "a",
      factory: () => container.get("b"),
    });
    container.register({
      name: "b",
      factory: () => container.get("a"),
    });
    expect(() => container.get("a")).toThrow("Circular dependency detected");
  });

  it("resolvesAll triggers all factories", () => {
    let aCalled = false;
    let bCalled = false;
    container.register({ name: "a", factory: () => { aCalled = true; return 1; } });
    container.register({ name: "b", factory: () => { bCalled = true; return 2; } });
    container.resolveAll();
    expect(aCalled).toBe(true);
    expect(bCalled).toBe(true);
  });

  it("reset clears all cached instances", () => {
    let callCount = 0;
    container.register({
      name: "counted",
      factory: () => { callCount++; return {}; },
    });
    container.get("counted");
    container.get("counted");
    expect(callCount).toBe(1);
    container.reset();
    container.get("counted");
    expect(callCount).toBe(2);
  });

  it("getRegisteredNames returns all names", () => {
    container.registerInstance("x", 1);
    container.registerInstance("y", 2);
    const names = container.getRegisteredNames();
    expect(names).toContain("x");
    expect(names).toContain("y");
  });

  it("override replaces existing instance", () => {
    container.registerInstance("svc", { mode: "real" });
    container.registerInstance("svc", { mode: "mock" });
    expect(container.get<{ mode: string }>("svc").mode).toBe("mock");
  });

  it("resolve returns cached instance if available", () => {
    container.registerInstance("cached", 10);
    expect(container.resolve<number>("cached")).toBe(10);
  });
});
