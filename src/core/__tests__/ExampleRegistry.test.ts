import { describe, it, expect, beforeEach } from "vitest";
import { ExampleRegistry } from "../services/extension/ExampleRegistry";
import type { ExtensionExample } from "../types/extension";

const blinkEx: ExtensionExample = {
  id: "blink",
  title: "Blink",
  description: "Blink an LED",
  code: "void setup() {}",
  difficulty: "beginner",
  extensionId: "led",
  board: "uno",
  tags: ["led", "beginner"],
};

const servoEx: ExtensionExample = {
  id: "servo-sweep",
  title: "Servo Sweep",
  description: "Sweep servo",
  code: "void setup() {}",
  difficulty: "intermediate",
  extensionId: "servo",
  board: "mega",
  tags: ["servo"],
};

describe("ExampleRegistry", () => {
  beforeEach(() => {
    ExampleRegistry.clear();
  });

  it("registers a single example", () => {
    ExampleRegistry.register(blinkEx);
    expect(ExampleRegistry.getExamples()).toHaveLength(1);
  });

  it("registers multiple examples", () => {
    ExampleRegistry.registerMany([blinkEx, servoEx]);
    expect(ExampleRegistry.getExamples()).toHaveLength(2);
  });

  it("getExample returns by id", () => {
    ExampleRegistry.register(blinkEx);
    const found = ExampleRegistry.getExample("blink");
    expect(found).toBeDefined();
    expect(found!.title).toBe("Blink");
  });

  it("getExample returns undefined for unknown", () => {
    expect(ExampleRegistry.getExample("unknown")).toBeUndefined();
  });

  it("getExamplesByDifficulty filters correctly", () => {
    ExampleRegistry.registerMany([blinkEx, servoEx]);
    const beginner = ExampleRegistry.getExamplesByDifficulty("beginner");
    expect(beginner).toHaveLength(1);
    expect(beginner[0].id).toBe("blink");
  });

  it("getExamplesByBoard filters correctly", () => {
    ExampleRegistry.registerMany([blinkEx, servoEx]);
    const uno = ExampleRegistry.getExamplesByBoard("uno");
    expect(uno).toHaveLength(1);
  });

  it("getExamplesByTag filters correctly", () => {
    ExampleRegistry.registerMany([blinkEx, servoEx]);
    const led = ExampleRegistry.getExamplesByTag("led");
    expect(led).toHaveLength(1);
  });

  it("getExamplesByExtension filters correctly", () => {
    ExampleRegistry.registerMany([blinkEx, servoEx]);
    const ledExs = ExampleRegistry.getExamplesByExtension("led");
    expect(ledExs).toHaveLength(1);
    expect(ledExs[0].id).toBe("blink");
  });

  it("unregister removes an example", () => {
    ExampleRegistry.register(blinkEx);
    ExampleRegistry.unregister("blink");
    expect(ExampleRegistry.getExamples()).toEqual([]);
  });
});
