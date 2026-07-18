import { ValidationRegistry } from "../extension/ValidationRegistry";
import type { ValidationResult, CompileValidationRequest } from "../../types/validation";

export const ValidationService = {
  validate(request: CompileValidationRequest): Promise<ValidationResult[]> {
    return ValidationRegistry.validateAll(
      request.componentAssignments.map((a) => ({
        boardId: request.boardId,
        componentId: a.componentId,
        pins: a.pins,
      })),
    );
  },

  validateComponent(
    boardId: string,
    componentId: string,
    pinAssignments: { key: string; pin: number | string }[],
  ): Promise<ValidationResult> {
    return ValidationRegistry.validate(boardId, componentId, pinAssignments);
  },
};
