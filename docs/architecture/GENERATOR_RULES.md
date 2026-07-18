# Arduino C++ Generator Rules

## Code Generation Rules

1. **Lifecycle blocks determine placement**: `controls_start` chains go to `setup()`, `controls_forever` chains go to `loop()`. Blocks without lifecycle parents default to `setup()`.

2. **Includes are tracked**: Each generator adds `#include <Arduino.h>` when it produces Arduino API calls. Custom includes can be added via comment blocks with `#include` prefix.

3. **Variables are global**: All `create_variable` blocks declare `int name = 0;` at global scope. Variables used but not declared are auto-declared.

4. **Indentation**: 2-space indentation. `pushIndent()`/`popIndent()` on the `GenerationContext` for nested blocks (if/else, loops).

5. **Expression wrapping**: Value-returning blocks (logic_compare, math_arithmetic) wrap in parentheses `()` to ensure correct precedence.

6. **Unknown blocks**: Unregistered block types generate `// unknown block: <type>` comments.

## Validation Rules

1. **Block type known**: Every block must have a registered generator function.
2. **Pin valid**: Pin numbers must exist on the selected board.
3. **PWM pins**: `analogWrite` on non-PWM pins produces a warning.
4. **Variables**: Duplicate declarations get a warning; undeclared usage auto-declares.
5. **Lifecycle nesting**: `controls_start`/`controls_forever` cannot appear inside other lifecycle blocks.
6. **Mutation JSON**: `controls_if` and `controls_whileUntil` mutation must be valid JSON.

## Extension Rules

1. **Register new blocks**: Call `registerGenerator(type, fn)` in `BlockGenerators.ts` or any loaded module.
2. **Add boards**: Extend `BOARD_PIN_MAP` in `types.ts` with new board pin definitions.
3. **Test new blocks**: Add tests to `BlockGenerators.test.ts` and integration tests to `GeneratorFixtures.test.ts`.

## Integration Rules

1. The generator must produce compile-ready `.ino` files as single-source `SourceArtifact`.
2. Generated code must be deterministic (same input → same output).
3. Progress reporting follows the `GenerationProgress` interface.
