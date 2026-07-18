import { describe, it, expect, beforeEach } from "vitest";
import { UploaderBackendRegistry } from "../../services/upload/UploaderBackendRegistry";
import { MockBackend } from "../../services/upload/backends/MockBackend";

describe("UploaderBackendRegistry", () => {
  let registry: UploaderBackendRegistry;

  beforeEach(() => {
    registry = new UploaderBackendRegistry();
  });

  it("starts empty", () => {
    expect(registry.count()).toBe(0);
    expect(registry.getAvailable()).toHaveLength(0);
  });

  it("registers a backend", () => {
    const backend = new MockBackend();
    registry.register(backend);
    expect(registry.count()).toBe(1);
  });

  it("finds backend by id", () => {
    const backend = new MockBackend();
    registry.register(backend);
    expect(registry.getById("mock-v1")).toBe(backend);
  });

  it("returns undefined for unknown id", () => {
    expect(registry.getById("nonexistent")).toBeUndefined();
  });

  it("overwrites existing backend on re-register", () => {
    const b1 = new MockBackend(["a"]);
    const b2 = new MockBackend(["b"]);
    registry.register(b1);
    registry.register(b2);
    expect(registry.count()).toBe(1);
  });

  it("registers multiple backends", () => {
    const b1 = new MockBackend(["board-a"], "backend-a");
    const b2 = new MockBackend(["board-b"], "backend-b");
    registry.registerMany([b1, b2]);
    expect(registry.count()).toBe(2);
  });

  it("returns all available backends", () => {
    const b1 = new MockBackend();
    const b2 = new MockBackend([], "mock-v2", "Mock V2");
    registry.registerMany([b1, b2]);
    expect(registry.getAvailable()).toHaveLength(2);
  });

  it("finds backend for board", () => {
    const backend = new MockBackend(["uno", "nano"]);
    registry.register(backend);
    const found = registry.findForBoard("uno");
    expect(found).toBe(backend);
  });

  it("removes a backend", () => {
    const backend = new MockBackend();
    registry.register(backend);
    expect(registry.count()).toBe(1);
    registry.remove("mock-v1");
    expect(registry.count()).toBe(0);
  });

  it("clears all backends", () => {
    registry.register(new MockBackend(["a"], "backend-a"));
    registry.register(new MockBackend(["b"], "backend-b"));
    expect(registry.count()).toBe(2);
    registry.clear();
    expect(registry.count()).toBe(0);
  });

  it("finds all backends for board", () => {
    const b1 = new MockBackend(["board-a"], "backend-a");
    const b2 = new MockBackend(["board-a"], "backend-b");
    registry.registerMany([b1, b2]);
    const all = registry.findAllForBoard("board-a");
    expect(all).toHaveLength(2);
  });
});
