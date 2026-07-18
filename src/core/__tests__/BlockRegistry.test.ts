import { describe, it, expect, beforeEach } from "vitest";
import { BlockRegistry } from "../services/extension/BlockRegistry";
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ExtensionBlock } from "../types/extension";

const mockBlock1: ExtensionBlock = {
  type: "test_block_one",
  category: "test",
  init: () => {},
  generator: () => ["", 0],
};

const mockBlock2: ExtensionBlock = {
  type: "test_block_two",
  category: "test",
  init: () => {},
  generator: () => ["code;\n", 99],
};

describe("BlockRegistry", () => {
  beforeEach(() => {
    BlockRegistry.clear();
  });

  it("registers a single block", () => {
    BlockRegistry.register([mockBlock1]);
    expect(BlockRegistry.getBlock("test_block_one")).toBeDefined();
  });

  it("registers multiple blocks", () => {
    BlockRegistry.register([mockBlock1, mockBlock2]);
    expect(BlockRegistry.getAllBlocks()).toHaveLength(2);
  });

  it("overwrites duplicate block types", () => {
    BlockRegistry.register([mockBlock1]);
    BlockRegistry.register([mockBlock1]);
    expect(BlockRegistry.getAllBlocks()).toHaveLength(1);
  });

  it("getBlock returns undefined for unknown type", () => {
    expect(BlockRegistry.getBlock("nonexistent")).toBeUndefined();
  });

  it("getAllBlocks returns empty array when no blocks", () => {
    expect(BlockRegistry.getAllBlocks()).toEqual([]);
  });

  it("clear removes all blocks", () => {
    BlockRegistry.register([mockBlock1, mockBlock2]);
    BlockRegistry.clear();
    expect(BlockRegistry.getAllBlocks()).toEqual([]);
  });

  it("registerWithBlockly injects blocks into Blockly.Blocks", () => {
    const mockBlockly = { Blocks: {} } as any;
    BlockRegistry.register([mockBlock1]);
    BlockRegistry.registerWithBlockly(mockBlockly);
    expect(mockBlockly.Blocks.test_block_one).toBeDefined();
    expect(mockBlockly.Blocks.test_block_one.init).toBe(mockBlock1.init);
  });
});
