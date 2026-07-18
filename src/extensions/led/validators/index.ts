import type { ValidationRule } from "../../../core/types/componentConfig";

export function validators(): ValidationRule[] {
  return [
    {
      rule: "requiresResistor",
      message: "LED requires a current-limiting resistor (220-330 ohm)",
    },
    {
      rule: "requiresDigitalPin",
      message: "LED requires a digital pin",
    },
  ];
}
