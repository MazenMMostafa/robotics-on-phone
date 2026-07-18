/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BlockDefinition } from "./types";
import { SENSORS } from "../theme/blockColors";

const pinOptions = [
  ["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"],
  ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"], ["10", "10"], ["11", "11"],
  ["12", "12"], ["13", "13"],
];

const analogPinOptions = [
  ["A0", "A0"], ["A1", "A1"], ["A2", "A2"], ["A3", "A3"], ["A4", "A4"], ["A5", "A5"],
];

export const sensorBlockDefs: BlockDefinition[] = [
  {
    type: "rb_ultrasonic_distance",
    message0: "get ultrasonic sensor distance (cm) | trig %1 , echo %2",
    args0: [
      { type: "field_dropdown", name: "TRIG", options: pinOptions },
      { type: "field_dropdown", name: "ECHO", options: pinOptions },
    ],
    output: "Number",
    colour: SENSORS,
  },
  {
    type: "rb_digital_sensor",
    message0: "read digital sensor %1 at %2",
    args0: [
      { type: "field_dropdown", name: "SENSOR", options: [["PIR", "PIR"], ["button", "button"], ["touch", "touch"], ["IR", "IR"]] },
      { type: "field_dropdown", name: "PIN", options: pinOptions },
    ],
    output: "Boolean",
    colour: SENSORS,
  },
  {
    type: "rb_dht_sensor",
    message0: "get %1 from DHT sensor at pin %2",
    args0: [
      { type: "field_dropdown", name: "READING", options: [["temperature", "temperature"], ["humidity", "humidity"]] },
      { type: "field_dropdown", name: "PIN", options: pinOptions },
    ],
    output: "Number",
    colour: SENSORS,
  },
  {
    type: "rb_analog_sensor",
    message0: "read analog sensor %1 at %2",
    args0: [
      { type: "field_dropdown", name: "SENSOR", options: [["light / photoresistor", "light"], ["potentiometer", "potentiometer"], ["soil moisture", "soil"]] },
      { type: "field_dropdown", name: "PIN", options: analogPinOptions },
    ],
    output: "Number",
    colour: SENSORS,
  },
];

export function registerSensorGenerators(javascriptGenerator: any) {
  javascriptGenerator.forBlock["rb_ultrasonic_distance"] = function (block: any) {
    const trig = block.getFieldValue("TRIG");
    const echo = block.getFieldValue("ECHO");
    window._helperCode += `long readUltrasonicCM(int trigPin, int echoPin) {\n  pinMode(trigPin, OUTPUT);\n  pinMode(echoPin, INPUT);\n  digitalWrite(trigPin, LOW);\n  delayMicroseconds(2);\n  digitalWrite(trigPin, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(trigPin, LOW);\n  long duration = pulseIn(echoPin, HIGH, 30000);\n  return duration * 0.034 / 2;\n}\n\n`;
    return [`readUltrasonicCM(${trig}, ${echo})`, 0];
  };

  javascriptGenerator.forBlock["rb_digital_sensor"] = function (block: any) {
    return [`digitalRead(${block.getFieldValue("PIN")})`, 0];
  };

  javascriptGenerator.forBlock["rb_dht_sensor"] = function (block: any) {
    const pin = block.getFieldValue("PIN");
    const reading = block.getFieldValue("READING");
    const dhtName = `dht_${pin}`;
    window._includeCode += `#include <DHT.h>\n`;
    window._globalCode += `DHT ${dhtName}(${pin}, DHT11);\n`;
    window._setupCode += `${dhtName}.begin();\n`;
    if (reading === "humidity") return [`${dhtName}.readHumidity()`, 0];
    return [`${dhtName}.readTemperature()`, 0];
  };

  javascriptGenerator.forBlock["rb_analog_sensor"] = function (block: any) {
    return [`analogRead(${block.getFieldValue("PIN")})`, 0];
  };
}
