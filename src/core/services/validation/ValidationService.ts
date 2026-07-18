import { BoardService } from "../board/BoardService";
import { ComponentService } from "../component/ComponentService";
import type { ValidationResult, ValidationIssue, CompileValidationRequest } from "../../types/validation";

export const ValidationService = {
  validate(request: CompileValidationRequest): ValidationResult[] {
    return request.componentAssignments.map((assignment) =>
      this.validateComponent(request.boardId, assignment.componentId, assignment.pins),
    );
  },

  validateComponent(
    boardId: string,
    componentId: string,
    pinAssignments: { key: string; pin: number | string }[],
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    const board = BoardService.getBoard(boardId);
    const component = ComponentService.getComponent(componentId);

    if (!board) {
      issues.push({
        componentId,
        boardId,
        severity: "error",
        message: `Board "${boardId}" not found in the board database`,
        code: 1001,
      });
      return { valid: false, issues, boardId, componentId };
    }

    if (!component) {
      issues.push({
        componentId,
        boardId,
        severity: "error",
        message: `Component "${componentId}" not found in the component database`,
        code: 2001,
      });
      return { valid: false, issues, boardId, componentId };
    }

    // Board compatibility
    if (!component.supportedBoards.includes(boardId)) {
      issues.push({
        componentId,
        boardId,
        severity: "error",
        message: `Component "${component.displayName}" is not supported on board "${board.displayName}"`,
        code: 3001,
      });
    }

    // Required pins
    for (const req of component.requiredPins) {
      const assignment = pinAssignments.find((p) => p.key === req.key);
      if (!assignment) {
        issues.push({
          componentId,
          boardId,
          severity: "error",
          message: `Missing required pin: ${req.label}`,
          code: 4001,
        });
        continue;
      }

      const pinNum = Number(assignment.pin);
      if (isNaN(pinNum)) continue;

      switch (req.type) {
        case "pwm": {
          if (!BoardService.supportsPWM(boardId, pinNum)) {
            issues.push({
              componentId,
              boardId,
              severity: "error",
              message: `Pin ${pinNum} does not support PWM (required for ${req.label})`,
              code: 5001,
            });
          }
          break;
        }
        case "analog": {
          if (!BoardService.supportsAnalog(boardId, String(assignment.pin))) {
            issues.push({
              componentId,
              boardId,
              severity: "error",
              message: `Pin ${assignment.pin} is not an analog pin (required for ${req.label})`,
              code: 5002,
            });
          }
          break;
        }
      }
    }

    // Libraries
    for (const lib of component.libraries) {
      if (!BoardService.supportsLibrary(boardId, lib)) {
        issues.push({
          componentId,
          boardId,
          severity: "warning",
          message: `Library "${lib}" may not be available on board "${board.displayName}"`,
          code: 6001,
        });
      }
    }

    // Voltage check
    if (board.voltage === "3.3V" && component.libraries.length > 0) {
      const has5VOnly = component.libraries.some((lib) =>
        ["Servo"].includes(lib),
      );
      if (has5VOnly) {
        issues.push({
          componentId,
          boardId,
          severity: "warning",
          message: `Board runs at 3.3V. Some 5V components like Servo may require level shifting`,
          code: 7001,
        });
      }
    }

    return {
      valid: issues.filter((i) => i.severity === "error").length === 0,
      issues,
      boardId,
      componentId,
    };
  },
};
