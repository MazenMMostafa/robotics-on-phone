# Component Database

## Overview

The component database is a collection of JSON files in `src/data/components/` that define every electronic component/module supported by the app. Adding a new component requires **minimal code changes** — create a JSON file and optionally a new Blockly block definition.

## Auto-Discovery

The `ComponentService` (`src/core/services/component/ComponentService.ts`) uses `import.meta.glob` to automatically discover and load all `*.json` files from `src/data/components/`.

## How to Add a New Component

1. Create a new JSON file in `src/data/components/` (e.g., `bmp280.json`)
2. Fill in the schema fields
3. Create a Blockly block definition in `src/features/blockly/blocks/` (if a new visual block is needed)
4. Add a generator in the appropriate block category file
5. Add to `blocks/registry.ts` (if new file created)
6. Add to the toolbox in `workspace/toolbox.ts`
7. Add the component ID to each board's `supportedComponents` array

## JSON Schema

```typescript
interface ComponentConfig {
  /** Unique identifier (e.g. "servo", "dht") */
  id: string;
  /** Human-readable name */
  displayName: string;
  /** Brief description */
  description: string;
  /** Category: "actuator" | "sensor" | "display" | "input" | "output" */
  category: string;
  /** Board IDs this component is compatible with */
  supportedBoards: string[];
  /** Pins that must be assigned */
  requiredPins: PinRequirement[];
  /** Pins that may optionally be assigned */
  optionalPins: PinRequirement[];
  /** Arduino libraries required */
  libraries: string[];
  /** Reference to the code generator ID */
  generatorId: string;
  /** Reference to the Blockly block type */
  blockId: string;
  /** Emoji icon */
  icon: string;
  /** Example projects */
  examples: ExampleConfig[];
  /** Validation rules for code generation */
  validationRules: ValidationRule[];
}

interface PinRequirement {
  key: string;      // Unique key within the component (e.g. "PIN", "TRIG")
  label: string;    // Human-readable label (e.g. "Signal pin")
  type: "digital" | "pwm" | "analog" | "text";
  default?: string; // Default value (for text-type pins like I2C addresses)
}

interface ExampleConfig {
  title: string;
  description: string;
  code: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

interface ValidationRule {
  rule: string;       // Rule identifier
  value?: number | string;
  message: string;    // Human-friendly error message
}
```

## Validation Rules Reference

| Rule | Description | Example |
|------|-------------|---------|
| `requiresPWM` | Pin must support PWM | Servo, buzzer |
| `requiresLibrary` | Library must be available | DHT, OLED |
| `requiresI2C` | Board must have I2C | OLED, I2C LCD |
| `pinCount` | Minimum pin count required | LCD (6 pins) |
| `pinSeparation` | Pins must be on different pins | Ultrasonic (TRIG != ECHO) |
| `requiresPullUp` | Should use INPUT_PULLUP | Button |
| `requiresResistor` | External resistor required | LED |

## Supported Components

| ID | Name | Category | Icon |
|----|------|----------|------|
| servo | Servo Motor | actuator | ⚙️ |
| oled | OLED Display (I2C) | display | 🖥️ |
| lcd | LCD 16x2 Display | display | 🖥️ |
| relay | Relay Module | actuator | 🔌 |
| motor | DC Motor (L298N) | actuator | 🔄 |
| ultrasonic | HC-SR04 Ultrasonic Sensor | sensor | 📡 |
| dht | DHT11/DHT22 Temp & Humidity | sensor | 🌡️ |
| button | Push Button | input | 🔘 |
| led | LED | output | 💡 |
| buzzer | Piezo Buzzer | output | 🔔 |

## ComponentService API

```typescript
ComponentService.getComponents(): ComponentConfig[]
ComponentService.getComponent(id: string): ComponentConfig | undefined
ComponentService.getComponentsByCategory(category: string): ComponentConfig[]
ComponentService.getComponentsForBoard(boardId: string): ComponentConfig[]
ComponentService.getCategories(): string[]
```

## ValidationService API

```typescript
ValidationService.validate(request: CompileValidationRequest): ValidationResult[]
ValidationService.validateComponent(
  boardId: string,
  componentId: string,
  pinAssignments: PinAssignment[]
): ValidationResult
```

Returns `ValidationResult` with:
- `valid: boolean` — true if no errors
- `issues: ValidationIssue[]` — list of errors/warnings with human-friendly messages
- Error codes for programmatic handling (1001=board not found, 2001=component not found, 3001=incompatible, 4001=missing pin, 5001=no PWM, 5002=no analog, 6001=missing library, 7001=voltage mismatch)
