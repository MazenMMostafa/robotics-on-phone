# LED Extension

Adds LED output support to NewBegin Makes.

## Features

- Turn an LED ON or OFF on any digital pin
- Blink an LED with configurable interval
- Automatically adds LED component to the component database
- Includes example projects (blink, fade)

## Blocks

| Block ID | Description |
|----------|-------------|
| `ext_led_on` | Turn LED on/off on a specified pin |
| `ext_led_blink` | Blink LED with configurable delay |

## Dependencies

None — works with all boards.

## Files

```
extension.json       # Extension manifest
blocks/index.ts      # Block definitions and generators
components/index.ts  # Component definition
examples/index.ts    # Example projects
validators/index.ts  # Validation rules
```
