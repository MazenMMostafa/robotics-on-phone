import { describe, it, expect, beforeEach } from "vitest";
import { LibraryRegistry } from "../services/extension/LibraryRegistry";
import type { LibraryDefinition } from "../types/extension";

const servoLib: LibraryDefinition = {
  name: "Servo",
  headers: ["<Servo.h>"],
  provides: ["Servo"],
  boards: ["uno", "nano", "mega"],
};

const wireLib: LibraryDefinition = {
  name: "Wire",
  headers: ["<Wire.h>"],
  provides: ["Wire", "TwoWire"],
};

describe("LibraryRegistry", () => {
  beforeEach(() => {
    LibraryRegistry.clear();
  });

  it("registers a library", () => {
    LibraryRegistry.register(servoLib);
    expect(LibraryRegistry.hasLibrary("Servo")).toBe(true);
  });

  it("registers multiple libraries", () => {
    LibraryRegistry.registerMany([servoLib, wireLib]);
    expect(LibraryRegistry.getAllLibraries()).toHaveLength(2);
  });

  it("getLibrary returns library by name", () => {
    LibraryRegistry.register(servoLib);
    const lib = LibraryRegistry.getLibrary("Servo");
    expect(lib).toBeDefined();
    expect(lib!.headers).toEqual(["<Servo.h>"]);
  });

  it("getLibrary returns undefined for unknown", () => {
    expect(LibraryRegistry.getLibrary("Unknown")).toBeUndefined();
  });

  it("getHeaders resolves #include statements", () => {
    LibraryRegistry.registerMany([servoLib, wireLib]);
    const headers = LibraryRegistry.getHeaders(["Servo", "Wire"]);
    expect(headers).toContain("<Servo.h>");
    expect(headers).toContain("<Wire.h>");
    expect(headers).toHaveLength(2);
  });

  it("getHeaders deduplicates", () => {
    LibraryRegistry.register(servoLib);
    const headers = LibraryRegistry.getHeaders(["Servo", "Servo"]);
    expect(headers).toHaveLength(1);
  });

  it("getLibrariesForBoard filters by board", () => {
    LibraryRegistry.registerMany([servoLib, wireLib]);
    const unoLibs = LibraryRegistry.getLibrariesForBoard("uno");
    expect(unoLibs).toHaveLength(2);
    const picoLibs = LibraryRegistry.getLibrariesForBoard("pico");
    expect(picoLibs).toHaveLength(1);
    expect(picoLibs[0].name).toBe("Wire");
  });

  it("unregister removes a library", () => {
    LibraryRegistry.register(servoLib);
    LibraryRegistry.unregister("Servo");
    expect(LibraryRegistry.hasLibrary("Servo")).toBe(false);
  });

  it("clear removes all libraries", () => {
    LibraryRegistry.registerMany([servoLib, wireLib]);
    LibraryRegistry.clear();
    expect(LibraryRegistry.getAllLibraries()).toEqual([]);
  });
});
