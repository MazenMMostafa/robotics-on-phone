# Plugin Guide: Creating an Extension

This guide walks through creating a new extension for NewBegin Makes.

## Quick Start

1. Create a folder `src/extensions/<name>/` (e.g., `src/extensions/servo/`)
2. Add `extension.json` manifest
3. Add `blocks/index.ts` — block definitions + generators + toolbox category
4. (Optional) `components/index.ts` — pin validation data
5. (Optional) `examples/index.ts` — example projects
6. (Optional) `validators/index.ts` — custom validation rules

The extension is auto-discovered at next build. No core code changes needed.

## Manifest (`extension.json`)

```json
{
  "id": "servo",
  "name": "Servo Motor",
  "version": "1.0.0",
  "description": "Servo motor blocks and components",
  "supportedBoards": ["uno", "nano", "mega", "leonardo", "esp32", "esp8266", "pico"],
  "dependencies": []
}
```

- `id` — unique identifier, must match folder name
- `dependencies` — list of extension IDs this extension depends on
- `supportedBoards` — boards this extension supports

## Blocks (`blocks/index.ts`)

Each extension exports an `ExtensionModule`:

```typescript
import type { ExtensionBlock, ToolboxCategoryConfig } from "../../core/types/extension";

const blocks: ExtensionBlock[] = [
  {
    type: "ext_servo_write",
    category: "actuators",
    init: function (block) {
      block.appendDummyInput().appendField("servo write pin");
      // ...
    },
    generator: function (block, javascriptGenerator) {
      return ["", 0];
    },
  },
];

const toolboxCategory: ToolboxCategoryConfig = {
  name: "Servo",
  colour: "#FF8C00",
  blockTypes: ["ext_servo_write"],
};

export default { blocks, toolboxCategory };
```

### Block Naming Convention

Prefix extension block types with `ext_<extensionId>_` to avoid conflicts:
- `ext_led_on`
- `ext_servo_write`
- `ext_oled_print`

### Generator Output

Generators must return either:
- A string (statement block) — `["code;\n", 0]`
- Or Blockly's `[code, order]` tuple (value block)

## Components (`components/index.ts`)

Define pin requirements for validation:

```typescript
import type { ExtensionComponentDefinition } from "../../core/types/extension";

const components: ExtensionComponentDefinition[] = [
  {
    id: "servo",
    displayName: "Servo Motor",
    description: "Standard servo motor",
    category: "actuators",
    supportedBoards: ["uno", "nano", "mega", "leonardo"],
    requiredPins: [
      { key: "signal", label: "Signal Pin", type: "pwm" },
    ],
    optionalPins: [],
    libraries: ["Servo.h"],
  },
];

export default { components };
```

## Examples (`examples/index.ts`)

```typescript
import type { ExtensionExample } from "../../core/types/extension";

const examples: ExtensionExample[] = [
  {
    id: "servo-sweep",
    title: "Servo Sweep",
    description: "Sweep servo from 0 to 180 degrees",
    xml: '<xml xmlns="http://www.w3.org/1999/xhtml">...</xml>',
  },
];

export default { examples };
```

## Validation (`validators/index.ts`)

```typescript
import type { ValidationRule } from "../../core/types/componentConfig";

const rules: ValidationRule[] = [
  {
    ruleId: "simple-pin-required",
    errorMessage: "Pin is required",
    validate: (config) => config.pins?.signal !== undefined,
  },
];

export default { rules };
```

## Full Example

See the [LED extension](../src/extensions/led/) for a complete working example that implements all module types.
