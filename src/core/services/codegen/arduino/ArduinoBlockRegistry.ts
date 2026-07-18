import type { ArduinoBlock } from "./types";
import { GenerationContext } from "./GenerationContext";

export type BlockGeneratorFn = (
  block: ArduinoBlock,
  ctx: GenerationContext,
  generateSubBlocks: (block?: ArduinoBlock) => string,
) => string;

const registry = new Map<string, BlockGeneratorFn>();

export function registerGenerator(type: string, fn: BlockGeneratorFn): void {
  registry.set(type, fn);
}

export function getGenerator(type: string): BlockGeneratorFn | undefined {
  return registry.get(type);
}

export function hasGenerator(type: string): boolean {
  return registry.has(type);
}

export function getAllRegisteredTypes(): string[] {
  return [...registry.keys()];
}

export function clearRegistry(): void {
  registry.clear();
}
