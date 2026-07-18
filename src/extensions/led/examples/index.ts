import type { ExtensionExample } from "../../../core/types/extension";

export function examples(): ExtensionExample[] {
  return [
    {
      id: "led-blink",
      title: "Blink an LED",
      description: "Make an LED blink on and off every second",
      code: `void setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(1000);\n  digitalWrite(13, LOW);\n  delay(1000);\n}`,
      difficulty: "beginner",
      extensionId: "led",
    },
    {
      id: "led-fade",
      title: "Fade an LED",
      description: "Gradually fade an LED brightness using PWM",
      code: `int brightness = 0;\n\nvoid setup() {\n  pinMode(9, OUTPUT);\n}\n\nvoid loop() {\n  analogWrite(9, brightness);\n  brightness += 5;\n  if (brightness > 255) brightness = 0;\n  delay(30);\n}`,
      difficulty: "beginner",
      extensionId: "led",
    },
  ];
}
