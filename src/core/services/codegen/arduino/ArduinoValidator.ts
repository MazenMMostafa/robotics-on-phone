import type { ValidationResult, ValidationIssue } from "../../../types/codegen/generator";
import type { ArduinoBlock } from "./types";
import { BOARD_PIN_MAP, SUPPORTED_BOARDS, SUPPORTED_BLOCK_TYPES } from "./types";
import { hasGenerator } from "./ArduinoBlockRegistry";

export class ArduinoValidator {
  validateBlocks(blocks: ArduinoBlock[], board: string): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!blocks || blocks.length === 0) {
      issues.push({ severity: "warning", code: "NO_BLOCKS", message: "No blocks provided for generation" });
      return { valid: true, issues };
    }

    if (!board) {
      issues.push({ severity: "error", code: "NO_BOARD", message: "No board specified" });
      return { valid: false, issues };
    }

    const boardLower = board.toLowerCase();
    if (!SUPPORTED_BOARDS.includes(boardLower)) {
      issues.push({
        severity: "warning",
        code: "UNSUPPORTED_BOARD",
        message: `Board "${board}" may not be fully supported. Supported boards: ${SUPPORTED_BOARDS.join(", ")}`,
      });
    }

    const pinInfo = BOARD_PIN_MAP[boardLower];
    const declaredVariables = new Set<string>();
    const visitedBlockIds = new Set<string>();

    for (const block of blocks) {
      this.validateBlockRecursive(block, boardLower, pinInfo, issues, declaredVariables, visitedBlockIds);
    }

    return {
      valid: issues.filter((i) => i.severity === "error").length === 0,
      issues,
    };
  }

  private validateBlockRecursive(
    block: ArduinoBlock,
    board: string,
    pinInfo: { digital: number[]; analog: number[]; pwm: number[] } | undefined,
    issues: ValidationIssue[],
    declaredVariables: Set<string>,
    visitedBlockIds: Set<string>,
  ): void {
    if (!block || !block.type) {
      issues.push({ severity: "error", code: "INVALID_BLOCK", message: "Block missing type field" });
      return;
    }

    if (block.id && visitedBlockIds.has(block.id)) return;
    if (block.id) visitedBlockIds.add(block.id);

    if (!SUPPORTED_BLOCK_TYPES.includes(block.type as never) && !hasGenerator(block.type)) {
      issues.push({
        severity: "error",
        code: "UNSUPPORTED_BLOCK",
        message: `Unsupported block type: "${block.type}"`,
        blockType: block.type,
        blockId: block.id,
      });
      return;
    }

    this.validateLifecycleBlocks(block, issues);
    this.validatePinBlocks(block, pinInfo, issues);
    this.validateVariableBlocks(block, issues, declaredVariables);
    this.validateMathBlocks(block, issues);
    this.validateDelayBlock(block, issues);
    this.validateIfBlock(block, issues);

    if (block.inputs) {
      for (const [, inputValue] of Object.entries(block.inputs)) {
        if (inputValue && typeof inputValue === "object") {
          const inputObj = inputValue as Record<string, unknown>;
          if (inputObj.block && typeof inputObj.block === "object") {
            this.validateBlockRecursive(
              inputObj.block as ArduinoBlock,
              board,
              pinInfo,
              issues,
              declaredVariables,
              visitedBlockIds,
            );
          }
        }
      }
    }

    if (block.next) {
      this.validateBlockRecursive(block.next, board, pinInfo, issues, declaredVariables, visitedBlockIds);
    }
  }

  private validateLifecycleBlocks(block: ArduinoBlock, issues: ValidationIssue[]): void {
    if (block.type === "controls_start") {
      if (block.next) {
        this.validateNoNestedLifecycle(block.next, issues);
      }
    }
    if (block.type === "controls_forever") {
      if (block.next) {
        this.validateNoNestedLifecycle(block.next, issues);
      }
    }
  }

  private validateNoNestedLifecycle(block: ArduinoBlock, issues: ValidationIssue[]): void {
    if (block.type === "controls_start" || block.type === "controls_forever") {
      issues.push({
        severity: "error",
        code: "NESTED_LIFECYCLE",
        message: "Lifecycle blocks (controls_start, controls_forever) cannot be nested",
        blockType: block.type,
        blockId: block.id,
      });
    }
    if (block.next) {
      this.validateNoNestedLifecycle(block.next, issues);
    }
  }

  private validatePinBlocks(
    block: ArduinoBlock,
    pinInfo: { digital: number[]; analog: number[]; pwm: number[] } | undefined,
    issues: ValidationIssue[],
  ): void {
    const pinStr = block.fields?.PIN;
    if (!pinStr) return;

    const pin = parseInt(pinStr, 10);
    if (isNaN(pin)) {
      issues.push({
        severity: "warning",
        code: "INVALID_PIN_FORMAT",
        message: `Invalid pin format: "${pinStr}"`,
        blockType: block.type,
        blockId: block.id,
      });
      return;
    }

    if (!pinInfo) return;

    if (!pinInfo.digital.includes(pin) && !pinInfo.analog.includes(pin)) {
      issues.push({
        severity: "error",
        code: "INVALID_PIN",
        message: `Pin ${pin} is not available on this board`,
        blockType: block.type,
        blockId: block.id,
      });
    }

    if (block.type === "analog_write" && pinInfo.pwm && !pinInfo.pwm.includes(pin)) {
      issues.push({
        severity: "warning",
        code: "NON_PWM_PIN",
        message: `Pin ${pin} does not support PWM output (analogWrite)`,
        blockType: block.type,
        blockId: block.id,
      });
    }
  }

  private validateVariableBlocks(
    block: ArduinoBlock,
    issues: ValidationIssue[],
    declaredVariables: Set<string>,
  ): void {
    const varName = block.fields?.VAR_NAME;
    if (!varName) return;

    if (block.type === "create_variable") {
      if (declaredVariables.has(varName)) {
        issues.push({
          severity: "warning",
          code: "DUPLICATE_VARIABLE",
          message: `Variable "${varName}" declared multiple times`,
          blockType: block.type,
          blockId: block.id,
        });
      }
      declaredVariables.add(varName);
    }

    if (block.type === "set_variable" || block.type === "change_variable" || block.type === "get_variable") {
      if (!declaredVariables.has(varName)) {
        issues.push({
          severity: "warning",
          code: "UNDECLARED_VARIABLE",
          message: `Variable "${varName}" used before declaration; will be auto-declared`,
          blockType: block.type,
          blockId: block.id,
        });
        declaredVariables.add(varName);
      }
    }
  }

  private validateMathBlocks(block: ArduinoBlock, issues: ValidationIssue[]): void {
    if (block.type === "math_number") {
      const num = block.fields?.NUM;
      if (num !== undefined && num !== "" && isNaN(Number(num))) {
        issues.push({
          severity: "warning",
          code: "INVALID_NUMBER",
          message: `Invalid number: "${num}"`,
          blockType: block.type,
          blockId: block.id,
        });
      }
    }
  }

  private validateDelayBlock(block: ArduinoBlock, issues: ValidationIssue[]): void {
    if (block.type === "delay") {
      const ms = block.fields?.MS;
      if (ms !== undefined && ms !== "" && isNaN(Number(ms))) {
        issues.push({
          severity: "warning",
          code: "INVALID_DELAY",
          message: `Invalid delay value: "${ms}"`,
          blockType: block.type,
          blockId: block.id,
        });
      }
    }
  }

  private validateIfBlock(block: ArduinoBlock, issues: ValidationIssue[]): void {
    if (block.type !== "controls_if") return;
    if (!block.mutation) return;

    try {
      JSON.parse(block.mutation);
    } catch {
      issues.push({
        severity: "warning",
        code: "INVALID_MUTATION",
        message: `Invalid mutation JSON for controls_if block`,
        blockType: block.type,
        blockId: block.id,
      });
    }
  }
}
