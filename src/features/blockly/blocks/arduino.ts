/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BlockDefinition } from "./types";
import { ARDUINO } from "../theme/blockColors";

const pinOptions = [
  ["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"],
  ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"], ["10", "10"], ["11", "11"],
  ["12", "12"], ["13", "13"],
];

const analogPinOptions = [
  ["A0", "A0"], ["A1", "A1"], ["A2", "A2"], ["A3", "A3"], ["A4", "A4"], ["A5", "A5"],
];

const pwmPinOptions = [
  ["3", "3"], ["5", "5"], ["6", "6"], ["9", "9"], ["10", "10"], ["11", "11"],
];

export const arduinoBlockDefs: BlockDefinition[] = [
  {
    type: "rb_read_digital_pin",
    message0: "read status of digital pin %1",
    args0: [{ type: "field_dropdown", name: "PIN", options: pinOptions }],
    output: "Boolean",
    colour: ARDUINO,
  },
  {
    type: "rb_read_analog_pin",
    message0: "read analog pin %1",
    args0: [{ type: "field_dropdown", name: "PIN", options: analogPinOptions }],
    output: "Number",
    colour: ARDUINO,
  },
  {
    type: "rb_set_digital_pin",
    message0: "set digital pin %1 output as %2",
    args0: [
      { type: "field_dropdown", name: "PIN", options: pinOptions },
      { type: "field_dropdown", name: "VALUE", options: [["HIGH", "HIGH"], ["LOW", "LOW"]] },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: ARDUINO,
  },
  {
    type: "rb_set_pwm_pin",
    message0: "set PWM pin %1 output as %2",
    args0: [
      { type: "field_dropdown", name: "PIN", options: pwmPinOptions },
      { type: "field_number", name: "VALUE", value: 255, min: 0, max: 255 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: ARDUINO,
  },
  {
    type: "rb_play_tone",
    message0: "play tone on %1 of note %2 & beat %3",
    args0: [
      { type: "field_dropdown", name: "PIN", options: pwmPinOptions },
      {
        type: "field_dropdown", name: "NOTE",
        options: [
          ["C2", "65"], ["D2", "73"], ["E2", "82"], ["F2", "87"],
          ["G2", "98"], ["A2", "110"], ["B2", "123"], ["C3", "131"],
          ["D3", "147"], ["E3", "165"], ["F3", "175"], ["G3", "196"],
          ["A3", "220"], ["B3", "247"], ["C4", "262"],
        ],
      },
      {
        type: "field_dropdown", name: "BEAT",
        options: [["Half", "500"], ["Quarter", "250"], ["One", "1000"], ["Two", "2000"]],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: ARDUINO,
  },
  {
    type: "rb_get_timer",
    message0: "get timer value",
    output: "Number",
    colour: ARDUINO,
  },
  {
    type: "rb_reset_timer",
    message0: "reset timer",
    previousStatement: null,
    nextStatement: null,
    colour: ARDUINO,
  },
  {
    type: "rb_cast_value",
    message0: "cast %1 to %2",
    args0: [
      { type: "input_value", name: "VALUE" },
      { type: "field_dropdown", name: "TYPE", options: [["integer", "int"], ["float", "float"], ["string", "String"]] },
    ],
    output: null,
    colour: ARDUINO,
  },
  {
    type: "rb_map_value",
    message0: "map %1 from %2 ~ %3 to %4 ~ %5",
    args0: [
      { type: "input_value", name: "VALUE" },
      { type: "field_number", name: "FROM_LOW", value: 0 },
      { type: "field_number", name: "FROM_HIGH", value: 255 },
      { type: "field_number", name: "TO_LOW", value: 0 },
      { type: "field_number", name: "TO_HIGH", value: 1023 },
    ],
    output: "Number",
    colour: ARDUINO,
  },
  {
    type: "rb_serial_begin",
    message0: "Serial begin %1",
    args0: [{ type: "field_number", name: "BAUD", value: 9600 }],
    previousStatement: null,
    nextStatement: null,
    colour: ARDUINO,
  },
  {
    type: "rb_serial_print",
    message0: "Serial print %1",
    args0: [{ type: "input_value", name: "MSG" }],
    previousStatement: null,
    nextStatement: null,
    colour: ARDUINO,
  },
];

export function registerArduinoGenerators(javascriptGenerator: any) {
  javascriptGenerator.forBlock["rb_read_digital_pin"] = function (block: any) {
    return [`digitalRead(${block.getFieldValue("PIN")})`, 0];
  };

  javascriptGenerator.forBlock["rb_read_analog_pin"] = function (block: any) {
    return [`analogRead(${block.getFieldValue("PIN")})`, 0];
  };

  javascriptGenerator.forBlock["rb_set_digital_pin"] = function (block: any) {
    const pin = block.getFieldValue("PIN");
    const val = block.getFieldValue("VALUE");
    return `pinMode(${pin}, OUTPUT);\ndigitalWrite(${pin}, ${val});\n`;
  };

  javascriptGenerator.forBlock["rb_set_pwm_pin"] = function (block: any) {
    const pin = block.getFieldValue("PIN");
    const val = block.getFieldValue("VALUE");
    return `pinMode(${pin}, OUTPUT);\nanalogWrite(${pin}, ${val});\n`;
  };

  javascriptGenerator.forBlock["rb_play_tone"] = function (block: any) {
    const pin = block.getFieldValue("PIN");
    const note = block.getFieldValue("NOTE");
    const beat = block.getFieldValue("BEAT");
    return `tone(${pin}, ${note}, ${beat});\ndelay(${beat});\nnoTone(${pin});\n`;
  };

  javascriptGenerator.forBlock["rb_get_timer"] = function () {
    return ["millis()", 0];
  };

  javascriptGenerator.forBlock["rb_reset_timer"] = function () {
    return `// reset timer placeholder: millis() cannot be reset directly.\n`;
  };

  javascriptGenerator.forBlock["rb_cast_value"] = function (block: any) {
    const value = javascriptGenerator.valueToCode(block, "VALUE", 0) || "0";
    return [`(${block.getFieldValue("TYPE")})(${value})`, 0];
  };

  javascriptGenerator.forBlock["rb_map_value"] = function (block: any) {
    const value = javascriptGenerator.valueToCode(block, "VALUE", 0) || "0";
    return [`map(${value}, ${block.getFieldValue("FROM_LOW")}, ${block.getFieldValue("FROM_HIGH")}, ${block.getFieldValue("TO_LOW")}, ${block.getFieldValue("TO_HIGH")})`, 0];
  };

  javascriptGenerator.forBlock["rb_serial_begin"] = function (block: any) {
    return `Serial.begin(${block.getFieldValue("BAUD")});\n`;
  };

  javascriptGenerator.forBlock["rb_serial_print"] = function (block: any) {
    const msg = javascriptGenerator.valueToCode(block, "MSG", 0) || JSON.stringify("Hello");
    return `Serial.println(${msg});\n`;
  };
}
