import type { ExtensionComponentDefinition } from "../../../core/types/extension";

export function components(): ExtensionComponentDefinition[] {
  return [
    {
      id: "led",
      displayName: "LED (Light Emitting Diode)",
      description: "Standard 5mm LED with current-limiting resistor",
      category: "output",
      supportedBoards: ["uno", "nano", "mega", "leonardo", "esp32", "esp8266", "pico"],
      requiredPins: [{ key: "PIN", label: "Anode pin", type: "digital" }],
      optionalPins: [],
      libraries: [],
      icon: "💡",
    },
  ];
}

export const ledComponent = {
  id: "led",
  displayName: "LED (Light Emitting Diode)",
  description: "Standard 5mm LED with current-limiting resistor",
  category: "output",
  supportedBoards: ["uno", "nano", "mega", "leonardo", "esp32", "esp8266", "pico"],
  requiredPins: [{ key: "PIN", label: "Anode pin", type: "digital" }],
  optionalPins: [],
  libraries: [],
  icon: "💡",
};
