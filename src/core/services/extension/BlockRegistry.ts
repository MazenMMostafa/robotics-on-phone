/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ExtensionBlock } from "../../types/extension";

class BlockRegistryClass {
  private blocks = new Map<string, ExtensionBlock>();

  register(blocks: ExtensionBlock[]): void {
    for (const block of blocks) {
      this.blocks.set(block.type, block);
    }
  }

  registerWithBlockly(Blockly: any): void {
    for (const [, block] of this.blocks) {
      Blockly.Blocks[block.type] = { init: block.init };
    }
  }

  getBlock(type: string): ExtensionBlock | undefined {
    return this.blocks.get(type);
  }

  getAllBlocks(): ExtensionBlock[] {
    return Array.from(this.blocks.values());
  }

  clear(): void {
    this.blocks.clear();
  }
}

export const BlockRegistry = new BlockRegistryClass();
