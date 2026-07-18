import { describe, it, expect, beforeEach } from "vitest";
import { CommandRegistry } from "../services/extension/CommandRegistry";
import type { CommandDefinition } from "../types/extension";

const cmd1: CommandDefinition = {
  id: "test.do-thing",
  title: "Do Thing",
  category: "test",
  execute: () => {},
};

const cmd2: CommandDefinition = {
  id: "test.other",
  title: "Other",
  category: "test",
  execute: () => {},
};

describe("CommandRegistry", () => {
  beforeEach(() => {
    CommandRegistry.clear();
  });

  it("registers a command", () => {
    CommandRegistry.register(cmd1);
    expect(CommandRegistry.hasCommand("test.do-thing")).toBe(true);
  });

  it("registers multiple commands", () => {
    CommandRegistry.registerMany([cmd1, cmd2]);
    expect(CommandRegistry.getAllCommands()).toHaveLength(2);
  });

  it("overwrites duplicate id with warning", () => {
    CommandRegistry.register(cmd1);
    CommandRegistry.register(cmd1);
    expect(CommandRegistry.getAllCommands()).toHaveLength(1);
  });

  it("getCommand returns command by id", () => {
    CommandRegistry.register(cmd1);
    const found = CommandRegistry.getCommand("test.do-thing");
    expect(found).toBeDefined();
    expect(found!.title).toBe("Do Thing");
  });

  it("getCommand returns undefined for unknown", () => {
    expect(CommandRegistry.getCommand("unknown")).toBeUndefined();
  });

  it("getCommandsByCategory filters correctly", () => {
    const cmdOther: CommandDefinition = { id: "other.cmd", title: "Other", category: "other", execute: () => {} };
    CommandRegistry.registerMany([cmd1, cmdOther]);
    const testCmds = CommandRegistry.getCommandsByCategory("test");
    expect(testCmds).toHaveLength(1);
  });

  it("execute runs the command", async () => {
    let executed = false;
    CommandRegistry.register({ ...cmd1, execute: () => { executed = true; } });
    await CommandRegistry.execute("test.do-thing");
    expect(executed).toBe(true);
  });

  it("execute warns for unknown command", async () => {
    await CommandRegistry.execute("unknown");
    // Should not throw
  });

  it("unregister removes a command", () => {
    CommandRegistry.register(cmd1);
    CommandRegistry.unregister("test.do-thing");
    expect(CommandRegistry.hasCommand("test.do-thing")).toBe(false);
  });

  it("clear removes all commands", () => {
    CommandRegistry.registerMany([cmd1, cmd2]);
    CommandRegistry.clear();
    expect(CommandRegistry.getAllCommands()).toEqual([]);
  });
});
