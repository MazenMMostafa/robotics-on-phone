/* eslint-disable @typescript-eslint/no-explicit-any */
import { BoardService } from "../board/BoardService";
import { ComponentService } from "../component/ComponentService";
import type { ValidationResult, ValidationIssue } from "../../types/validation";

export interface ValidationRule {
  ruleId: string;
  errorMessage: string;
  validate: (context: ValidationContext) => boolean | Promise<boolean>;
}

export interface ValidationContext {
  boardId: string;
  componentId: string;
  pinAssignments: { key: string; pin: number | string }[];
  board: any;
  component: any;
}

class ValidationRegistryClass {
  private rules: Map<string, ValidationRule[]> = new Map();

  register(componentId: string, rules: ValidationRule[]): void {
    const existing = this.rules.get(componentId) ?? [];
    this.rules.set(componentId, [...existing, ...rules]);
  }

  unregister(componentId: string): void {
    this.rules.delete(componentId);
  }

  getRules(componentId: string): ValidationRule[] {
    return this.rules.get(componentId) ?? [];
  }

  async validate(
    boardId: string,
    componentId: string,
    pinAssignments: { key: string; pin: number | string }[],
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const board = BoardService.getBoard(boardId);
    const component = ComponentService.getComponent(componentId);

    if (!board) {
      issues.push({
        componentId, boardId, severity: "error",
        message: `Board "${boardId}" not found`, code: 1001,
      });
      return { valid: false, issues, boardId, componentId };
    }

    if (!component) {
      issues.push({
        componentId, boardId, severity: "error",
        message: `Component "${componentId}" not found`, code: 2001,
      });
      return { valid: false, issues, boardId, componentId };
    }

    if (!component.supportedBoards.includes(boardId)) {
      issues.push({
        componentId, boardId, severity: "error",
        message: `Component not supported on board "${board.displayName}"`, code: 3001,
      });
    }

    for (const req of component.requiredPins ?? []) {
      const assignment = pinAssignments.find((p) => p.key === req.key);
      if (!assignment) {
        issues.push({
          componentId, boardId, severity: "error",
          message: `Missing required pin: ${req.label}`, code: 4001,
        });
        continue;
      }

      const pinNum = Number(assignment.pin);
      if (isNaN(pinNum)) continue;

      switch (req.type) {
        case "pwm":
          if (!BoardService.supportsPWM(boardId, pinNum)) {
            issues.push({
              componentId, boardId, severity: "error",
              message: `Pin ${pinNum} does not support PWM (required for ${req.label})`, code: 5001,
            });
          }
          break;
        case "analog":
          if (!BoardService.supportsAnalog(boardId, String(assignment.pin))) {
            issues.push({
              componentId, boardId, severity: "error",
              message: `Pin ${assignment.pin} is not analog (required for ${req.label})`, code: 5002,
            });
          }
          break;
      }
    }

    for (const lib of component.libraries ?? []) {
      if (!BoardService.supportsLibrary(boardId, lib)) {
        issues.push({
          componentId, boardId, severity: "warning",
          message: `Library "${lib}" may not be available on board "${board.displayName}"`, code: 6001,
        });
      }
    }

    if (board.voltage === "3.3V" && (component.libraries ?? []).some((l: string) => ["Servo"].includes(l))) {
      issues.push({
        componentId, boardId, severity: "warning",
        message: "Board runs at 3.3V. Some 5V components may require level shifting", code: 7001,
      });
    }

    const rules = this.rules.get(componentId) ?? [];
    for (const rule of rules) {
      const valid = await rule.validate({ boardId, componentId, pinAssignments, board, component });
      if (!valid) {
        issues.push({
          componentId, boardId, severity: "error",
          message: rule.errorMessage, code: 8001,
        });
      }
    }

    return {
      valid: issues.filter((i) => i.severity === "error").length === 0,
      issues, boardId, componentId,
    };
  }

  async validateAll(requests: { boardId: string; componentId: string; pins: { key: string; pin: number | string }[] }[]): Promise<ValidationResult[]> {
    return Promise.all(requests.map((r) => this.validate(r.boardId, r.componentId, r.pins)));
  }

  clear(): void {
    this.rules.clear();
  }
}

export const ValidationRegistry = new ValidationRegistryClass();
