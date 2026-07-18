export interface PinRequirement {
  key: string;
  label: string;
  type: "digital" | "pwm" | "analog" | "text";
  default?: string;
}

export interface ExampleConfig {
  title: string;
  description: string;
  code: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface ValidationRule {
  rule: string;
  value?: number | string;
  message: string;
}

export interface ComponentConfig {
  id: string;
  displayName: string;
  description: string;
  category: string;
  supportedBoards: string[];
  requiredPins: PinRequirement[];
  optionalPins: PinRequirement[];
  libraries: string[];
  generatorId: string;
  blockId: string;
  icon: string;
  examples: ExampleConfig[];
  validationRules: ValidationRule[];
}
