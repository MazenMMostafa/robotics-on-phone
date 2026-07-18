export { CodeGeneratorRegistry } from "./CodeGeneratorRegistry";
export { CodeGenerationManager } from "./CodeGenerationManager";
export { MockCodeGenerator } from "./MockCodeGenerator";
export type { GenerationStatus } from "./CodeGenerationManager";

export { ArduinoCppGenerator } from "./arduino/ArduinoCppGenerator";
export { ArduinoValidator } from "./arduino/ArduinoValidator";
export { registerGenerator, getGenerator, hasGenerator, getAllRegisteredTypes, clearRegistry } from "./arduino/ArduinoBlockRegistry";
export type { BlockGeneratorFn } from "./arduino/ArduinoBlockRegistry";
export { GenerationContext } from "./arduino/GenerationContext";
export { generateChain, generateExpression } from "./arduino/BlockGenerators";
export type { ArduinoBlock, BoardPins } from "./arduino/types";
export { BOARD_PIN_MAP, SUPPORTED_BOARDS, SUPPORTED_BLOCK_TYPES } from "./arduino/types";
