# Arduino C++ Generator

## Purpose
Converts Blockly workspace blocks into valid Arduino C++ sketch files (.ino). Implements the `CodeGenerator` interface defined in Phase 12.

## Architecture

```
src/core/services/codegen/arduino/
├── index.ts                  # Barrel exports
├── types.ts                  # ArduinoBlock, BoardPins, constants
├── GenerationContext.ts      # Tracks variables, includes, pins, indentation
├── ArduinoBlockRegistry.ts   # Map<blockType, BlockGeneratorFn>
├── BlockGenerators.ts        # All block generator implementations
├── ArduinoValidator.ts       # Workspace validation
└── ArduinoCppGenerator.ts    # Main CodeGenerator implementation
```

## Flow

1. `validate(options)` — validates options and blocks via `ArduinoValidator`
2. `generate(options, onProgress?)` — produces `SourceArtifact`:
   - Parses blocks from `options.blocks`
   - Separates lifecycle blocks into setup (controls_start) and loop (controls_forever)
   - Generates includes, global variables, setup(), loop()
   - Assembles .ino content
   - Creates SourceArtifact with SHA-256 checksum

## Generator Function Pattern

```typescript
type BlockGeneratorFn = (
  block: ArduinoBlock,
  ctx: GenerationContext,
  generateSubBlocks: (block?: ArduinoBlock) => string,
) => string;
```

Statement blocks return indented code lines; value blocks return expressions.

## Supported Block Types (24)

| Category     | Blocks |
|-------------|--------|
| Lifecycle   | controls_start, controls_forever |
| GPIO        | pin_mode, pin_write, pin_read |
| Analog      | analog_read, analog_write |
| Timing      | delay |
| Variables   | create_variable, set_variable, change_variable, get_variable |
| Logic       | controls_if, logic_compare, logic_operation, logic_negate, logic_boolean, logic_null |
| Loops       | controls_repeat, controls_whileUntil |
| Math        | math_number, math_arithmetic, math_random_int |
| Text        | comment |

## Registration

All generators register at module load time via `registerGenerator()` calls in `BlockGenerators.ts`. The `ArduinoCppGenerator` is registered in `CodeGeneratorRegistry` via `ServiceBootstrap.ts`.

## Validation

- Missing/unsupported block types → error
- Invalid pin numbers → error
- Non-PWM pin on analogWrite → warning
- Duplicate/undeclared variables → warning
- Nested lifecycle blocks → error
- Invalid mutation JSON → warning
