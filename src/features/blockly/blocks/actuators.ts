/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BlockDefinition } from "./types";
import { ACTUATORS } from "../theme/blockColors";

const pinOptions = [
  ["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"],
  ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"], ["10", "10"], ["11", "11"],
  ["12", "12"], ["13", "13"],
];

const pwmPinOptions = [
  ["3", "3"], ["5", "5"], ["6", "6"], ["9", "9"], ["10", "10"], ["11", "11"],
];

export const actuatorBlockDefs: BlockDefinition[] = [
  {
    type: "rb_connect_motor",
    message0: "connect motor %1 direction 1 %2 direction 2 %3 & PWM %4",
    args0: [
      { type: "field_dropdown", name: "MOTOR", options: [["1", "1"], ["2", "2"]] },
      { type: "field_dropdown", name: "DIR1", options: pinOptions },
      { type: "field_dropdown", name: "DIR2", options: pinOptions },
      { type: "field_dropdown", name: "PWM", options: pwmPinOptions },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: ACTUATORS,
  },
  {
    type: "rb_run_motor",
    message0: "run motor %1 in direction %2 with speed %3 %",
    args0: [
      { type: "field_dropdown", name: "MOTOR", options: [["1", "1"], ["2", "2"]] },
      { type: "field_dropdown", name: "DIR", options: [["forward", "forward"], ["backward", "backward"]] },
      { type: "field_number", name: "SPEED", value: 100, min: 0, max: 100 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: ACTUATORS,
  },
  {
    type: "rb_free_motor",
    message0: "%1 motor %2",
    args0: [
      { type: "field_dropdown", name: "MODE", options: [["free", "free"], ["brake", "brake"]] },
      { type: "field_dropdown", name: "MOTOR", options: [["1", "1"], ["2", "2"]] },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: ACTUATORS,
  },
  {
    type: "rb_servo_write",
    message0: "set servo on %1 to %2 angle",
    args0: [
      { type: "field_dropdown", name: "PIN", options: pwmPinOptions },
      { type: "field_number", name: "DEG", value: 30, min: 0, max: 180 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: ACTUATORS,
  },
  {
    type: "rb_relay_write",
    message0: "set relay at pin %1 to %2",
    args0: [
      { type: "field_dropdown", name: "PIN", options: pinOptions },
      { type: "field_dropdown", name: "VALUE", options: [["OFF", "LOW"], ["ON", "HIGH"]] },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: ACTUATORS,
  },
  {
    type: "rb_bldc_motor",
    message0: "run BLDC motor on %1 at %2 % speed",
    args0: [
      { type: "field_dropdown", name: "PIN", options: pwmPinOptions },
      { type: "field_number", name: "SPEED", value: 30, min: 0, max: 100 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: ACTUATORS,
  },
];

export function registerActuatorGenerators(javascriptGenerator: any) {
  javascriptGenerator.forBlock["rb_connect_motor"] = function (block: any) {
    const motor = block.getFieldValue("MOTOR");
    const dir1 = block.getFieldValue("DIR1");
    const dir2 = block.getFieldValue("DIR2");
    const pwm = block.getFieldValue("PWM");
    window._globalCode += `int motor${motor}Dir1 = ${dir1};\nint motor${motor}Dir2 = ${dir2};\nint motor${motor}Pwm = ${pwm};\n`;
    return `pinMode(motor${motor}Dir1, OUTPUT);\npinMode(motor${motor}Dir2, OUTPUT);\npinMode(motor${motor}Pwm, OUTPUT);\n`;
  };

  javascriptGenerator.forBlock["rb_run_motor"] = function (block: any) {
    const motor = block.getFieldValue("MOTOR");
    const dir = block.getFieldValue("DIR");
    const speed = Math.round((Number(block.getFieldValue("SPEED")) / 100) * 255);
    if (dir === "forward") {
      return `digitalWrite(motor${motor}Dir1, HIGH);\ndigitalWrite(motor${motor}Dir2, LOW);\nanalogWrite(motor${motor}Pwm, ${speed});\n`;
    }
    return `digitalWrite(motor${motor}Dir1, LOW);\ndigitalWrite(motor${motor}Dir2, HIGH);\nanalogWrite(motor${motor}Pwm, ${speed});\n`;
  };

  javascriptGenerator.forBlock["rb_free_motor"] = function (block: any) {
    const motor = block.getFieldValue("MOTOR");
    const mode = block.getFieldValue("MODE");
    if (mode === "brake") {
      return `digitalWrite(motor${motor}Dir1, HIGH);\ndigitalWrite(motor${motor}Dir2, HIGH);\nanalogWrite(motor${motor}Pwm, 0);\n`;
    }
    return `digitalWrite(motor${motor}Dir1, LOW);\ndigitalWrite(motor${motor}Dir2, LOW);\nanalogWrite(motor${motor}Pwm, 0);\n`;
  };

  javascriptGenerator.forBlock["rb_servo_write"] = function (block: any) {
    const pin = block.getFieldValue("PIN");
    const deg = block.getFieldValue("DEG");
    const servoName = `servo_${pin}`;
    window._includeCode += `#include <Servo.h>\n`;
    window._globalCode += `Servo ${servoName};\n`;
    window._setupCode += `${servoName}.attach(${pin});\n`;
    return `${servoName}.write(${deg});\n`;
  };

  javascriptGenerator.forBlock["rb_relay_write"] = function (block: any) {
    const pin = block.getFieldValue("PIN");
    const value = block.getFieldValue("VALUE");
    return `pinMode(${pin}, OUTPUT);\ndigitalWrite(${pin}, ${value});\n`;
  };

  javascriptGenerator.forBlock["rb_bldc_motor"] = function (block: any) {
    const pin = block.getFieldValue("PIN");
    const speed = Math.round((Number(block.getFieldValue("SPEED")) / 100) * 255);
    return `pinMode(${pin}, OUTPUT);\nanalogWrite(${pin}, ${speed});\n`;
  };
}
