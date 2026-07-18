export interface ValidationIssue {
  componentId: string;
  boardId: string;
  severity: "error" | "warning";
  message: string;
  code?: number;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  boardId: string;
  componentId: string;
}

export interface PinAssignment {
  key: string;
  pin: number | string;
}

export interface CompileValidationRequest {
  boardId: string;
  componentAssignments: ComponentAssignment[];
}

export interface ComponentAssignment {
  componentId: string;
  pins: PinAssignment[];
}
