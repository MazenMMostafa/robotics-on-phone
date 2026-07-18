# Extension Developer Guide

## Folder Layout

```
src/extensions/<extension-id>/
├── extension.json          # Manifest (required)
├── index.ts                # Entry point with activate() (recommended)
├── blocks/
│   └── index.ts            # Legacy format (optional)
├── components/
│   └── index.ts            # Component definitions (optional)
├── examples/
│   └── index.ts            # Example projects (optional)
├── validators/
│   └── index.ts            # Validation rules (optional)
└── README.md               # Documentation (optional)
```

## Lifecycle

Extensions go through these states:

```
discovered → loaded → activating → active
                               ↘ error
```

1. **discovered** — `extension.json` found by `ExtensionLoader`
2. **loaded** — API version and dependency checks pass
3. **activating** — `activate(context)` is called
4. **active** — Extension is fully registered

On deactivation (future), state transitions to `inactive`.

## Extension Context API

Every extension receives an `ExtensionContext` in `activate()`:

```typescript
function activate(context: ExtensionContext): void {
  context.registerBlock({ ... });
  context.registerComponent({ ... });
  context.on("boardChanged", (board) => { ... });
}
```

See [PUBLIC_API.md](PUBLIC_API.md) for the full API reference.

## Registering Blocks

```typescript
context.registerBlock({
  type: "ext_servo_write",
  category: "actuators",
  init: function (this: any) {
    this.jsonInit({
      message0: "servo write pin %1 to %2 degrees",
      args0: [
        { type: "field_dropdown", name: "PIN", options: [["9", "9"], ["10", "10"]] },
        { type: "field_number", name: "DEGREES", value: 90, min: 0, max: 180 },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#FF8C00",
    });
  },
  generator: function (block: any) {
    const pin = block.getFieldValue("PIN");
    const degrees = block.getFieldValue("DEGREES");
    return `Servo servo${pin};\nservo${pin}.attach(${pin});\nservo${pin}.write(${degrees});\n`;
  },
});
```

### Block Naming Convention

Prefix with `ext_<extensionId>_` to avoid conflicts:
- `ext_led_on` ✓
- `ext_servo_write` ✓
- `my_block` ✗ (risk of collision)

### Generator Output

- **Statement blocks** return a string: `"code;\n"`
- **Value blocks** return a tuple: `["code", order]`

## Registering Toolbox Categories

```typescript
context.registerCategory({
  id: "actuators",
  name: "Actuators",
  colour: "#FF8C00",
  blockTypes: ["ext_servo_write", "ext_servo_read"],
});
```

Categories with the same `id` from multiple extensions are merged. Block types are appended to the existing category — useful for grouping related extensions.

## Registering Components

Components define pin requirements for validation:

```typescript
context.registerComponent({
  id: "servo",
  displayName: "Servo Motor",
  description: "Standard servo motor",
  category: "actuators",
  supportedBoards: ["uno", "nano", "mega", "leonardo"],
  requiredPins: [{ key: "signal", label: "Signal Pin", type: "pwm" }],
  optionalPins: [],
  libraries: ["Servo.h"],
});
```

### Pin Types

| Type | Description |
|------|-------------|
| `digital` | Digital I/O pin |
| `pwm` | PWM-capable pin (~3, 5, 6, 9, 10, 11 on UNO) |
| `analog` | Analog input pin (A0–A5 on UNO) |
| `text` | Free-form text field (not validated) |

## Registering Validators

```typescript
context.registerValidator("servo", {
  ruleId: "servo-pin-pwm",
  errorMessage: "Servo signal pin must support PWM",
  validate: (ctx) => {
    const pin = ctx.pinAssignments.find(p => p.key === "signal");
    if (!pin) return false;
    // built-in PWM check already runs, but you can add custom logic
    return true;
  },
});
```

Validators run before compile, upload, and code generation.

## Registering Libraries

```typescript
context.registerLibrary({
  name: "Servo",
  headers: ["<Servo.h>"],
  provides: ["Servo"],
  boards: ["uno", "nano", "mega"],
});
```

Generators should request libraries from `LibraryRegistry` instead of hardcoding `#include`:

```typescript
// Instead of hardcoding: return `#include <Servo.h>\n...`
// Get from registry:
const headers = LibraryRegistry.getHeaders(["Servo"]);
return headers.join("\n") + "\n" + code;
```

## Registering Examples

```typescript
context.registerExample({
  id: "servo-sweep",
  title: "Servo Sweep",
  description: "Sweep servo from 0 to 180 degrees",
  code: `#include <Servo.h>\nServo servo;\nvoid setup() { servo.attach(9); }\nvoid loop() { for (int i = 0; i <= 180; i++) { servo.write(i); delay(15); } }`,
  difficulty: "beginner",
  tags: ["servo", "sweep"],
});
```

Examples are filterable by difficulty, board, tags, and category.

## Events

Extensions can listen and emit events:

```typescript
context.on("boardChanged", (boardId: string) => {
  // Update block pin dropdowns for new board
});

context.emit("myEvent", data);
```

See [EVENT_SYSTEM.md](EVENT_SYSTEM.md) for event reference.

## Commands

```typescript
context.registerCommand({
  id: "led-toggle",
  title: "Toggle LED",
  category: "hardware",
  execute: () => { /* ... */ },
});
```

Commands can later be bound to keyboard shortcuts, menus, or automation.

## Dependencies

In `extension.json`:

```json
{
  "dependencies": {
    "extensions": ["servo"],       // depends on servo extension
    "libraries": ["Wire"],         // depends on Wire library
    "boards": ["uno", "mega"]     // only works on these boards
  }
}
```

If a dependency is missing, the extension is skipped with a console warning.

## API Versioning

`extension.json` fields for compatibility:

```json
{
  "apiVersion": "1.0",
  "minimumAppVersion": "1.0.0"
}
```

- `apiVersion` must match `CURRENT_API_VERSION` in `ExtensionLoader`
- `minimumAppVersion` is compared semver; extension won't load if app is older

## Best Practices

1. **Prefix block types** with `ext_<extensionId>_` to avoid naming conflicts.
2. **Use `activate(context)` format** — the old `blocks()`/`categories()` format is deprecated.
3. **Keep extensions small** — one extension should cover one component family (e.g., "servo", not "all actuators").
4. **Define components** for pin validation — this prevents users from assigning wrong pins.
5. **Register libraries** — generators should not hardcode `#include` statements.
6. **Provide examples** — users learn by loading example projects.
7. **Use events** for cross-extension communication — direct imports between extensions are not supported.
8. **Test with `apiVersion`** — set it so users get clear errors if they have an incompatible app.

## Common Mistakes

| Mistake | Why it fails | Fix |
|---------|-------------|-----|
| Hardcoding `#include` in generator | LibraryRegistry is the single source of truth | Use `LibraryRegistry.getHeaders()` |
| Not prefixing block types | Collision with core blocks or other extensions | Prefix with `ext_<id>_` |
| Importing registries directly | Core must never know extension implementations | Use `context.register*()` |
| Exports without `default` | `ExtensionLoader` expects `default` export | Add `export default extension` |
| Missing `extension.json` | Extension is not discovered | Create `extension.json` |
| Block type mismatch in `blockTypes` | Category shows no blocks | Ensure `blockTypes` matches `type` in `registerBlock` |
