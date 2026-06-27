import { useEffect, useRef } from "react";
import type { BoardType } from "../lib/blocks";
import type { WorkspaceSvg } from "blockly";
import { javascriptGenerator } from "blockly/javascript";

declare global {
  interface Window {
    getCode: () => string;
    _setupCode: string;
    _loopCode: string;
    _functionCode: string;
    _helperCode: string;
    _includeCode: string;
    _globalCode: string;
  }
}

interface Props {
  board: BoardType;
  initialXml?: string;
  onChange?: (xml: string) => void;
}

type ToolboxItem =
  | { kind: "block"; type: string }
  | { kind: "label"; text: string }
  | { kind: "button"; text: string; callbackKey: string };

type ToolboxCategory = {
  name: string;
  colour: string;
  contents?: ToolboxItem[];
  custom?: "VARIABLE" | "PROCEDURE";
};

const CONTROL = "#FFA51F";
const OPERATORS = "#49B44E";
const VARIABLES = "#FF8C1A";
const MY_BLOCKS = "#FF6680";
const ARDUINO = "#14BFA3";
const ACTUATORS = "#55B82E";
const SENSORS = "#54B8DE";
const DISPLAY = "#FF4D5A";

function boardCategoryName(board: BoardType) {
  if (board === "nano") return "Arduino Nano";
  if (board === "esp32") return "ESP32";
  return "Arduino Uno";
}

function buildToolbox(board: BoardType) {
  const categories: ToolboxCategory[] = [
    {
      name: "Control",
      colour: CONTROL,
      contents: [
        { kind: "block", type: "rb_wait_seconds" },
        { kind: "block", type: "controls_repeat_ext" },
        { kind: "block", type: "rb_forever" },
        { kind: "block", type: "rb_count_loop" },
        { kind: "block", type: "controls_if" },
        { kind: "block", type: "rb_wait_until" },
        { kind: "block", type: "rb_repeat_until" },
        { kind: "block", type: "rb_stop_all" },
        { kind: "block", type: "rb_when_clone_start" },
        { kind: "block", type: "rb_create_clone" },
        { kind: "block", type: "rb_delete_clone" },
      ],
    },
    {
      name: "Operators",
      colour: OPERATORS,
      contents: [
        { kind: "block", type: "math_number" },
        { kind: "block", type: "text" },
        { kind: "block", type: "math_arithmetic" },
        { kind: "block", type: "math_random_int" },
        { kind: "block", type: "logic_compare" },
        { kind: "block", type: "logic_operation" },
        { kind: "block", type: "logic_negate" },
        { kind: "block", type: "text_join" },
        { kind: "block", type: "text_charAt" },
        { kind: "block", type: "text_length" },
        { kind: "block", type: "rb_text_contains" },
        { kind: "block", type: "math_modulo" },
        { kind: "block", type: "math_round" },
      ],
    },
    {
      name: "Variables",
      colour: VARIABLES,
      custom: "VARIABLE",
      contents: [],
    },
    {
      name: "My Blocks",
      colour: MY_BLOCKS,
      custom: "PROCEDURE",
      contents: [],
    },
    {
      name: boardCategoryName(board),
      colour: ARDUINO,
      contents: [
        { kind: "block", type: "rb_when_start" },
        { kind: "block", type: "rb_read_digital_pin" },
        { kind: "block", type: "rb_read_analog_pin" },
        { kind: "block", type: "rb_set_digital_pin" },
        { kind: "block", type: "rb_set_pwm_pin" },
        { kind: "block", type: "rb_play_tone" },
        { kind: "block", type: "rb_get_timer" },
        { kind: "block", type: "rb_reset_timer" },
        { kind: "block", type: "rb_cast_value" },
        { kind: "block", type: "rb_map_value" },
        { kind: "block", type: "rb_serial_begin" },
        { kind: "block", type: "rb_serial_print" },
        ...(board === "esp32"
          ? [
              { kind: "block", type: "rb_wifi_connect" } as const,
              { kind: "block", type: "rb_bt_begin" } as const,
              { kind: "block", type: "rb_bt_send" } as const,
            ]
          : []),
      ],
    },
    {
      name: "Actuators",
      colour: ACTUATORS,
      contents: [
        { kind: "block", type: "rb_connect_motor" },
        { kind: "block", type: "rb_run_motor" },
        { kind: "block", type: "rb_free_motor" },
        { kind: "block", type: "rb_servo_write" },
        { kind: "block", type: "rb_relay_write" },
        { kind: "block", type: "rb_bldc_motor" },
      ],
    },
    {
      name: "Sensors",
      colour: SENSORS,
      contents: [
        { kind: "block", type: "rb_ultrasonic_distance" },
        { kind: "block", type: "rb_digital_sensor" },
        { kind: "block", type: "rb_dht_sensor" },
        { kind: "block", type: "rb_analog_sensor" },
      ],
    },
    {
      name: "Display Modules",
      colour: DISPLAY,
      contents: [
        { kind: "label", text: "Initialise LCD Display 16x2" },
        { kind: "block", type: "rb_lcd_init_parallel" },
        { kind: "block", type: "rb_lcd_init_i2c" },
        { kind: "label", text: "LCD Display 16x2" },
        { kind: "block", type: "rb_lcd_set_cursor" },
        { kind: "block", type: "rb_lcd_print" },
        { kind: "block", type: "rb_lcd_clear" },
        { kind: "block", type: "rb_lcd_mode" },
      ],
    },
  ];

  return {
    kind: "categoryToolbox",
    contents: categories.map((c) => ({
      kind: "category",
      name: c.name,
      colour: c.colour,
      ...(c.custom ? { custom: c.custom } : {}),
      contents: c.contents ?? [],
    })),
  };
}

let customBlocksRegistered = false;

function registerCustomBlocks(Blockly: typeof import("blockly")) {
  if (customBlocksRegistered) return;
  customBlocksRegistered = true;

  const pinOptions = [
    ["0", "0"],
    ["1", "1"],
    ["2", "2"],
    ["3", "3"],
    ["4", "4"],
    ["5", "5"],
    ["6", "6"],
    ["7", "7"],
    ["8", "8"],
    ["9", "9"],
    ["10", "10"],
    ["11", "11"],
    ["12", "12"],
    ["13", "13"],
  ];

  const analogPinOptions = [
    ["A0", "A0"],
    ["A1", "A1"],
    ["A2", "A2"],
    ["A3", "A3"],
    ["A4", "A4"],
    ["A5", "A5"],
  ];

  const pwmPinOptions = [
    ["3", "3"],
    ["5", "5"],
    ["6", "6"],
    ["9", "9"],
    ["10", "10"],
    ["11", "11"],
  ];

  const defs = [
    {
      type: "rb_wait_seconds",
      message0: "wait %1 seconds",
      args0: [{ type: "field_number", name: "SECONDS", value: 1, min: 0 }],
      previousStatement: null,
      nextStatement: null,
      colour: CONTROL,
    },
    {
      type: "rb_forever",
      message0: "forever",
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      colour: CONTROL,
    },
    {
      type: "rb_count_loop",
      message0: "count %1 from %2 to %3 in steps of %4",
      args0: [
        { type: "field_variable", name: "VAR", variable: "i" },
        { type: "field_number", name: "FROM", value: 1 },
        { type: "field_number", name: "TO", value: 4 },
        { type: "field_number", name: "STEP", value: 1 },
      ],
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      colour: CONTROL,
    },
    {
      type: "rb_wait_until",
      message0: "wait until %1",
      args0: [{ type: "input_value", name: "CONDITION", check: "Boolean" }],
      previousStatement: null,
      nextStatement: null,
      colour: CONTROL,
    },
    {
      type: "rb_repeat_until",
      message0: "repeat until %1",
      args0: [{ type: "input_value", name: "CONDITION", check: "Boolean" }],
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      colour: CONTROL,
    },
    {
      type: "rb_stop_all",
      message0: "stop %1",
      args0: [
        {
          type: "field_dropdown",
          name: "MODE",
          options: [["all", "all"]],
        },
      ],
      previousStatement: null,
      colour: CONTROL,
    },
    {
      type: "rb_when_clone_start",
      message0: "when I start as a clone",
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      colour: CONTROL,
    },
    {
      type: "rb_create_clone",
      message0: "create clone of %1",
      args0: [
        {
          type: "field_dropdown",
          name: "TARGET",
          options: [["myself", "myself"]],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: CONTROL,
    },
    {
      type: "rb_delete_clone",
      message0: "delete this clone",
      previousStatement: null,
      nextStatement: null,
      colour: CONTROL,
    },
    {
      type: "rb_text_contains",
      message0: "%1 contains %2 ?",
      args0: [
        { type: "input_value", name: "TEXT" },
        { type: "input_value", name: "SUB" },
      ],
      output: "Boolean",
      colour: OPERATORS,
    },
    {
      type: "rb_when_start",
      message0: "when Arduino starts up",
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      colour: "#607D8B",
    },
    {
      type: "rb_read_digital_pin",
      message0: "read status of digital pin %1",
      args0: [
        {
          type: "field_dropdown",
          name: "PIN",
          options: pinOptions,
        },
      ],
      output: "Boolean",
      colour: ARDUINO,
    },
    {
      type: "rb_read_analog_pin",
      message0: "read analog pin %1",
      args0: [
        {
          type: "field_dropdown",
          name: "PIN",
          options: analogPinOptions,
        },
      ],
      output: "Number",
      colour: ARDUINO,
    },
    {
      type: "rb_set_digital_pin",
      message0: "set digital pin %1 output as %2",
      args0: [
        {
          type: "field_dropdown",
          name: "PIN",
          options: pinOptions,
        },
        {
          type: "field_dropdown",
          name: "VALUE",
          options: [
            ["HIGH", "HIGH"],
            ["LOW", "LOW"],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: ARDUINO,
    },
    {
      type: "rb_set_pwm_pin",
      message0: "set PWM pin %1 output as %2",
      args0: [
        {
          type: "field_dropdown",
          name: "PIN",
          options: pwmPinOptions,
        },
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
        {
          type: "field_dropdown",
          name: "PIN",
          options: pwmPinOptions,
        },
        {
          type: "field_dropdown",
          name: "NOTE",
          options: [
            ["C2", "65"],
            ["D2", "73"],
            ["E2", "82"],
            ["F2", "87"],
            ["G2", "98"],
            ["A2", "110"],
            ["B2", "123"],
            ["C3", "131"],
            ["D3", "147"],
            ["E3", "165"],
            ["F3", "175"],
            ["G3", "196"],
            ["A3", "220"],
            ["B3", "247"],
            ["C4", "262"],
          ],
        },
        {
          type: "field_dropdown",
          name: "BEAT",
          options: [
            ["Half", "500"],
            ["Quarter", "250"],
            ["One", "1000"],
            ["Two", "2000"],
          ],
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
        {
          type: "field_dropdown",
          name: "TYPE",
          options: [
            ["integer", "int"],
            ["float", "float"],
            ["string", "String"],
          ],
        },
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
    {
      type: "rb_connect_motor",
      message0: "connect motor %1 direction 1 %2 direction 2 %3 & PWM %4",
      args0: [
        {
          type: "field_dropdown",
          name: "MOTOR",
          options: [
            ["1", "1"],
            ["2", "2"],
          ],
        },
        {
          type: "field_dropdown",
          name: "DIR1",
          options: pinOptions,
        },
        {
          type: "field_dropdown",
          name: "DIR2",
          options: pinOptions,
        },
        {
          type: "field_dropdown",
          name: "PWM",
          options: pwmPinOptions,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: ACTUATORS,
    },
    {
      type: "rb_run_motor",
      message0: "run motor %1 in direction %2 with speed %3 %",
      args0: [
        {
          type: "field_dropdown",
          name: "MOTOR",
          options: [
            ["1", "1"],
            ["2", "2"],
          ],
        },
        {
          type: "field_dropdown",
          name: "DIR",
          options: [
            ["forward", "forward"],
            ["backward", "backward"],
          ],
        },
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
        {
          type: "field_dropdown",
          name: "MODE",
          options: [
            ["free", "free"],
            ["brake", "brake"],
          ],
        },
        {
          type: "field_dropdown",
          name: "MOTOR",
          options: [
            ["1", "1"],
            ["2", "2"],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: ACTUATORS,
    },
    {
      type: "rb_servo_write",
      message0: "set servo on %1 to %2 angle",
      args0: [
        {
          type: "field_dropdown",
          name: "PIN",
          options: pwmPinOptions,
        },
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
        {
          type: "field_dropdown",
          name: "PIN",
          options: pinOptions,
        },
        {
          type: "field_dropdown",
          name: "VALUE",
          options: [
            ["OFF", "LOW"],
            ["ON", "HIGH"],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: ACTUATORS,
    },
    {
      type: "rb_bldc_motor",
      message0: "run BLDC motor on %1 at %2 % speed",
      args0: [
        {
          type: "field_dropdown",
          name: "PIN",
          options: pwmPinOptions,
        },
        { type: "field_number", name: "SPEED", value: 30, min: 0, max: 100 },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: ACTUATORS,
    },
    {
      type: "rb_ultrasonic_distance",
      message0: "get ultrasonic sensor distance (cm) | trig %1 , echo %2",
      args0: [
        {
          type: "field_dropdown",
          name: "TRIG",
          options: pinOptions,
        },
        {
          type: "field_dropdown",
          name: "ECHO",
          options: pinOptions,
        },
      ],
      output: "Number",
      colour: SENSORS,
    },
    {
      type: "rb_digital_sensor",
      message0: "read digital sensor %1 at %2",
      args0: [
        {
          type: "field_dropdown",
          name: "SENSOR",
          options: [
            ["PIR", "PIR"],
            ["button", "button"],
            ["touch", "touch"],
            ["IR", "IR"],
          ],
        },
        {
          type: "field_dropdown",
          name: "PIN",
          options: pinOptions,
        },
      ],
      output: "Boolean",
      colour: SENSORS,
    },
    {
      type: "rb_dht_sensor",
      message0: "get %1 from DHT sensor at pin %2",
      args0: [
        {
          type: "field_dropdown",
          name: "READING",
          options: [
            ["temperature", "temperature"],
            ["humidity", "humidity"],
          ],
        },
        {
          type: "field_dropdown",
          name: "PIN",
          options: pinOptions,
        },
      ],
      output: "Number",
      colour: SENSORS,
    },
    {
      type: "rb_analog_sensor",
      message0: "read analog sensor %1 at %2",
      args0: [
        {
          type: "field_dropdown",
          name: "SENSOR",
          options: [
            ["light / photoresistor", "light"],
            ["potentiometer", "potentiometer"],
            ["soil moisture", "soil"],
          ],
        },
        {
          type: "field_dropdown",
          name: "PIN",
          options: analogPinOptions,
        },
      ],
      output: "Number",
      colour: SENSORS,
    },
    {
      type: "rb_lcd_init_parallel",
      message0:
        "initialize 16 x 2 display on RST %1 EN %2 D4 %3 D5 %4 D6 %5 D7 %6",
      args0: [
        { type: "field_dropdown", name: "RS", options: pinOptions },
        { type: "field_dropdown", name: "EN", options: pinOptions },
        { type: "field_dropdown", name: "D4", options: pinOptions },
        { type: "field_dropdown", name: "D5", options: pinOptions },
        { type: "field_dropdown", name: "D6", options: pinOptions },
        { type: "field_dropdown", name: "D7", options: pinOptions },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: DISPLAY,
    },
    {
      type: "rb_lcd_init_i2c",
      message0: "initialize 16 x 2 I2C display at address %1",
      args0: [{ type: "field_input", name: "ADDR", text: "0x27" }],
      previousStatement: null,
      nextStatement: null,
      colour: DISPLAY,
    },
    {
      type: "rb_lcd_set_cursor",
      message0: "set cursor at column %1 row %2",
      args0: [
        { type: "field_number", name: "COL", value: 1, min: 1, max: 16 },
        { type: "field_number", name: "ROW", value: 1, min: 1, max: 2 },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: DISPLAY,
    },
    {
      type: "rb_lcd_print",
      message0: "write %1 display",
      args0: [{ type: "input_value", name: "TEXT" }],
      previousStatement: null,
      nextStatement: null,
      colour: DISPLAY,
    },
    {
      type: "rb_lcd_clear",
      message0: "clear display",
      previousStatement: null,
      nextStatement: null,
      colour: DISPLAY,
    },
    {
      type: "rb_lcd_mode",
      message0: "set %1 mode",
      args0: [
        {
          type: "field_dropdown",
          name: "MODE",
          options: [
            ["blink", "blink"],
            ["no blink", "noBlink"],
            ["cursor", "cursor"],
            ["no cursor", "noCursor"],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: DISPLAY,
    },
    {
      type: "rb_wifi_connect",
      message0: "Wi-Fi connect SSID %1 password %2",
      args0: [
        { type: "field_input", name: "SSID", text: "MyWiFi" },
        { type: "field_input", name: "PASS", text: "password" },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#3498DB",
    },
    {
      type: "rb_bt_begin",
      message0: "Bluetooth begin name %1",
      args0: [{ type: "field_input", name: "NAME", text: "RoboticsBT" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#2980B9",
    },
    {
      type: "rb_bt_send",
      message0: "Bluetooth send %1",
      args0: [{ type: "input_value", name: "MSG" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#2980B9",
    },
  ];

  for (const def of defs) {
    Blockly.Blocks[def.type] = {
      init: function () {
        (this as { jsonInit: (d: unknown) => void }).jsonInit(def);
      },
    };
  }
}

function safeArduinoName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, "_");

  if (/^[0-9]/.test(cleaned)) {
    return `var_${cleaned}`;
  }

  return cleaned || "myVariable";
}

function getVariableName(block: {
  getField: (name: string) => { getText: () => string } | null;
}) {
  const field = block.getField("VAR");
  return safeArduinoName(field?.getText() ?? "myVariable");
}

function q(value: string) {
  return JSON.stringify(value);
}

function registerArduinoGenerators() {
  javascriptGenerator.forBlock["text"] = function (block) {
    return [q(block.getFieldValue("TEXT") || ""), 0];
  };

  javascriptGenerator.forBlock["text_join"] = function (block) {
    //const itemCount = Number(block.itemCount_ ?? 2);
    const itemCount = Number(
      (block as unknown as { itemCount_?: number }).itemCount_ ?? 2,
    );
    const parts: string[] = [];

    for (let i = 0; i < itemCount; i++) {
      parts.push(
        `String(${javascriptGenerator.valueToCode(block, `ADD${i}`, 0) || '""'})`,
      );
    }

    return [parts.length ? parts.join(" + ") : '""', 0];
  };

  javascriptGenerator.forBlock["text_length"] = function (block) {
    const text = javascriptGenerator.valueToCode(block, "VALUE", 0) || '""';
    return [`String(${text}).length()`, 0];
  };

  javascriptGenerator.forBlock["text_charAt"] = function (block) {
    const text = javascriptGenerator.valueToCode(block, "VALUE", 0) || '""';
    const at = javascriptGenerator.valueToCode(block, "AT", 0) || "1";
    return [`String(${text}).charAt((${at}) - 1)`, 0];
  };

  javascriptGenerator.forBlock["rb_text_contains"] = function (block) {
    const text = javascriptGenerator.valueToCode(block, "TEXT", 0) || '""';
    const sub = javascriptGenerator.valueToCode(block, "SUB", 0) || '""';
    return [`String(${text}).indexOf(${sub}) >= 0`, 0];
  };

  javascriptGenerator.forBlock["variables_set"] = function (block) {
    const varName = getVariableName(block);
    const value = javascriptGenerator.valueToCode(block, "VALUE", 0) || "0";
    return `${varName} = ${value};\n`;
  };

  javascriptGenerator.forBlock["math_change"] = function (block) {
    const varName = getVariableName(block);
    const value = javascriptGenerator.valueToCode(block, "DELTA", 0) || "1";
    return `${varName} += ${value};\n`;
  };

  javascriptGenerator.forBlock["variables_get"] = function (block) {
    const varName = getVariableName(block);
    return [varName, 0];
  };

  javascriptGenerator.forBlock["procedures_defnoreturn"] = function (block) {
    const name = safeArduinoName(block.getFieldValue("NAME") || "myBlock");
    const body = javascriptGenerator.statementToCode(block, "STACK");
    window._functionCode += `void ${name}() {\n${body}}\n\n`;
    return "";
  };

  javascriptGenerator.forBlock["procedures_callnoreturn"] = function (block) {
    const name = safeArduinoName(block.getFieldValue("NAME") || "myBlock");
    return `${name}();\n`;
  };

  javascriptGenerator.forBlock["procedures_defreturn"] = function (block) {
    const name = safeArduinoName(block.getFieldValue("NAME") || "myBlock");
    const body = javascriptGenerator.statementToCode(block, "STACK");
    const value = javascriptGenerator.valueToCode(block, "RETURN", 0) || "0";
    window._functionCode += `int ${name}() {\n${body}  return ${value};\n}\n\n`;
    return "";
  };

  javascriptGenerator.forBlock["procedures_callreturn"] = function (block) {
    const name = safeArduinoName(block.getFieldValue("NAME") || "myBlock");
    return [`${name}()`, 0];
  };

  javascriptGenerator.forBlock["rb_wait_seconds"] = function (block) {
    const seconds = Number(block.getFieldValue("SECONDS") || 0);
    return `delay(${Math.round(seconds * 1000)});\n`;
  };

  javascriptGenerator.forBlock["rb_forever"] = function (block) {
    const body = javascriptGenerator.statementToCode(block, "DO");
    window._loopCode = body;
    return "";
  };

  javascriptGenerator.forBlock["rb_count_loop"] = function (block) {
    const varName = safeArduinoName(block.getField("VAR")?.getText() ?? "i");
    const from = block.getFieldValue("FROM");
    const to = block.getFieldValue("TO");
    const step = block.getFieldValue("STEP") || "1";
    const body = javascriptGenerator.statementToCode(block, "DO");

    return `for (int ${varName} = ${from}; ${varName} <= ${to}; ${varName} += ${step}) {\n${body}}\n`;
  };

  javascriptGenerator.forBlock["rb_wait_until"] = function (block) {
    const condition =
      javascriptGenerator.valueToCode(block, "CONDITION", 0) || "false";

    return `while (!(${condition})) {\n  delay(10);\n}\n`;
  };

  javascriptGenerator.forBlock["rb_repeat_until"] = function (block) {
    const condition =
      javascriptGenerator.valueToCode(block, "CONDITION", 0) || "false";
    const body = javascriptGenerator.statementToCode(block, "DO");

    return `while (!(${condition})) {\n${body}}\n`;
  };

  javascriptGenerator.forBlock["rb_stop_all"] = function () {
    return `while (true) {\n  delay(1000);\n}\n`;
  };

  javascriptGenerator.forBlock["rb_when_clone_start"] = function (block) {
    const body = javascriptGenerator.statementToCode(block, "DO");
    return `// Clone start is not supported on Arduino.\n${body}`;
  };

  javascriptGenerator.forBlock["rb_create_clone"] = function () {
    return `// create clone is not supported on Arduino.\n`;
  };

  javascriptGenerator.forBlock["rb_delete_clone"] = function () {
    return `// delete clone is not supported on Arduino.\n`;
  };

  javascriptGenerator.forBlock["rb_when_start"] = function (block) {
    window._setupCode = javascriptGenerator.statementToCode(block, "DO");
    return "";
  };

  javascriptGenerator.forBlock["controls_whileUntil"] = function (block) {
    const mode = block.getFieldValue("MODE");
    const condition =
      javascriptGenerator.valueToCode(block, "BOOL", 0) || "true";
    const body = javascriptGenerator.statementToCode(block, "DO");

    if (mode === "WHILE") {
      return `while (${condition}) {\n${body}}\n`;
    }

    return `while (!(${condition})) {\n${body}}\n`;
  };

  javascriptGenerator.forBlock["rb_read_digital_pin"] = function (block) {
    const pin = block.getFieldValue("PIN");
    return [`digitalRead(${pin})`, 0];
  };

  javascriptGenerator.forBlock["rb_read_analog_pin"] = function (block) {
    const pin = block.getFieldValue("PIN");
    return [`analogRead(${pin})`, 0];
  };

  javascriptGenerator.forBlock["rb_set_digital_pin"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const val = block.getFieldValue("VALUE");
    return `pinMode(${pin}, OUTPUT);\ndigitalWrite(${pin}, ${val});\n`;
  };

  javascriptGenerator.forBlock["rb_set_pwm_pin"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const val = block.getFieldValue("VALUE");
    return `pinMode(${pin}, OUTPUT);\nanalogWrite(${pin}, ${val});\n`;
  };

  javascriptGenerator.forBlock["rb_play_tone"] = function (block) {
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

  javascriptGenerator.forBlock["rb_cast_value"] = function (block) {
    const value = javascriptGenerator.valueToCode(block, "VALUE", 0) || "0";
    const type = block.getFieldValue("TYPE");
    return [`(${type})(${value})`, 0];
  };

  javascriptGenerator.forBlock["rb_map_value"] = function (block) {
    const value = javascriptGenerator.valueToCode(block, "VALUE", 0) || "0";
    const fromLow = block.getFieldValue("FROM_LOW");
    const fromHigh = block.getFieldValue("FROM_HIGH");
    const toLow = block.getFieldValue("TO_LOW");
    const toHigh = block.getFieldValue("TO_HIGH");

    return [`map(${value}, ${fromLow}, ${fromHigh}, ${toLow}, ${toHigh})`, 0];
  };

  javascriptGenerator.forBlock["rb_serial_begin"] = function (block) {
    const baud = block.getFieldValue("BAUD");
    return `Serial.begin(${baud});\n`;
  };

  javascriptGenerator.forBlock["rb_serial_print"] = function (block) {
    const msg = javascriptGenerator.valueToCode(block, "MSG", 0) || q("Hello");
    return `Serial.println(${msg});\n`;
  };

  javascriptGenerator.forBlock["rb_connect_motor"] = function (block) {
    const motor = block.getFieldValue("MOTOR");
    const dir1 = block.getFieldValue("DIR1");
    const dir2 = block.getFieldValue("DIR2");
    const pwm = block.getFieldValue("PWM");

    window._globalCode += `int motor${motor}Dir1 = ${dir1};\nint motor${motor}Dir2 = ${dir2};\nint motor${motor}Pwm = ${pwm};\n`;

    return `pinMode(motor${motor}Dir1, OUTPUT);\npinMode(motor${motor}Dir2, OUTPUT);\npinMode(motor${motor}Pwm, OUTPUT);\n`;
  };

  javascriptGenerator.forBlock["rb_run_motor"] = function (block) {
    const motor = block.getFieldValue("MOTOR");
    const dir = block.getFieldValue("DIR");
    const speed = Math.round(
      (Number(block.getFieldValue("SPEED")) / 100) * 255,
    );

    if (dir === "forward") {
      return `digitalWrite(motor${motor}Dir1, HIGH);\ndigitalWrite(motor${motor}Dir2, LOW);\nanalogWrite(motor${motor}Pwm, ${speed});\n`;
    }

    return `digitalWrite(motor${motor}Dir1, LOW);\ndigitalWrite(motor${motor}Dir2, HIGH);\nanalogWrite(motor${motor}Pwm, ${speed});\n`;
  };

  javascriptGenerator.forBlock["rb_free_motor"] = function (block) {
    const motor = block.getFieldValue("MOTOR");
    const mode = block.getFieldValue("MODE");

    if (mode === "brake") {
      return `digitalWrite(motor${motor}Dir1, HIGH);\ndigitalWrite(motor${motor}Dir2, HIGH);\nanalogWrite(motor${motor}Pwm, 0);\n`;
    }

    return `digitalWrite(motor${motor}Dir1, LOW);\ndigitalWrite(motor${motor}Dir2, LOW);\nanalogWrite(motor${motor}Pwm, 0);\n`;
  };

  javascriptGenerator.forBlock["rb_servo_write"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const deg = block.getFieldValue("DEG");
    const servoName = `servo_${pin}`;

    window._includeCode += `#include <Servo.h>\n`;
    window._globalCode += `Servo ${servoName};\n`;
    window._setupCode += `${servoName}.attach(${pin});\n`;

    return `${servoName}.write(${deg});\n`;
  };

  javascriptGenerator.forBlock["rb_relay_write"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const value = block.getFieldValue("VALUE");

    return `pinMode(${pin}, OUTPUT);\ndigitalWrite(${pin}, ${value});\n`;
  };

  javascriptGenerator.forBlock["rb_bldc_motor"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const speed = Math.round(
      (Number(block.getFieldValue("SPEED")) / 100) * 255,
    );

    return `pinMode(${pin}, OUTPUT);\nanalogWrite(${pin}, ${speed});\n`;
  };

  javascriptGenerator.forBlock["rb_ultrasonic_distance"] = function (block) {
    const trig = block.getFieldValue("TRIG");
    const echo = block.getFieldValue("ECHO");

    window._helperCode += `
long readUltrasonicCM(int trigPin, int echoPin) {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH, 30000);
  return duration * 0.034 / 2;
}

`;

    return [`readUltrasonicCM(${trig}, ${echo})`, 0];
  };

  javascriptGenerator.forBlock["rb_digital_sensor"] = function (block) {
    const pin = block.getFieldValue("PIN");
    return [`digitalRead(${pin})`, 0];
  };

  javascriptGenerator.forBlock["rb_dht_sensor"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const reading = block.getFieldValue("READING");
    const dhtName = `dht_${pin}`;

    window._includeCode += `#include <DHT.h>\n`;
    window._globalCode += `DHT ${dhtName}(${pin}, DHT11);\n`;
    window._setupCode += `${dhtName}.begin();\n`;

    if (reading === "humidity") {
      return [`${dhtName}.readHumidity()`, 0];
    }

    return [`${dhtName}.readTemperature()`, 0];
  };

  javascriptGenerator.forBlock["rb_analog_sensor"] = function (block) {
    const pin = block.getFieldValue("PIN");
    return [`analogRead(${pin})`, 0];
  };

  javascriptGenerator.forBlock["rb_lcd_init_parallel"] = function (block) {
    const rs = block.getFieldValue("RS");
    const en = block.getFieldValue("EN");
    const d4 = block.getFieldValue("D4");
    const d5 = block.getFieldValue("D5");
    const d6 = block.getFieldValue("D6");
    const d7 = block.getFieldValue("D7");

    window._includeCode += `#include <LiquidCrystal.h>\n`;
    window._globalCode += `LiquidCrystal lcd(${rs}, ${en}, ${d4}, ${d5}, ${d6}, ${d7});\n`;

    return `lcd.begin(16, 2);\n`;
  };

  javascriptGenerator.forBlock["rb_lcd_init_i2c"] = function (block) {
    const addr = block.getFieldValue("ADDR") || "0x27";

    window._includeCode += `#include <Wire.h>\n#include <LiquidCrystal_I2C.h>\n`;
    window._globalCode += `LiquidCrystal_I2C lcd(${addr}, 16, 2);\n`;

    return `lcd.init();\nlcd.backlight();\n`;
  };

  javascriptGenerator.forBlock["rb_lcd_set_cursor"] = function (block) {
    const col = Number(block.getFieldValue("COL") || 1) - 1;
    const row = Number(block.getFieldValue("ROW") || 1) - 1;

    return `lcd.setCursor(${col}, ${row});\n`;
  };

  javascriptGenerator.forBlock["rb_lcd_print"] = function (block) {
    const text =
      javascriptGenerator.valueToCode(block, "TEXT", 0) || q("Hello World");
    return `lcd.print(${text});\n`;
  };

  javascriptGenerator.forBlock["rb_lcd_clear"] = function () {
    return `lcd.clear();\n`;
  };

  javascriptGenerator.forBlock["rb_lcd_mode"] = function (block) {
    const mode = block.getFieldValue("MODE");
    return `lcd.${mode}();\n`;
  };

  javascriptGenerator.forBlock["rb_wifi_connect"] = function (block) {
    const ssid = block.getFieldValue("SSID");
    const pass = block.getFieldValue("PASS");

    window._includeCode += `#include <WiFi.h>\n`;

    return `WiFi.begin(${q(ssid)}, ${q(pass)});\n`;
  };

  javascriptGenerator.forBlock["rb_bt_begin"] = function (block) {
    const name = block.getFieldValue("NAME");

    window._includeCode += `#include <BluetoothSerial.h>\n`;
    window._globalCode += `BluetoothSerial SerialBT;\n`;

    return `SerialBT.begin(${q(name)});\n`;
  };

  javascriptGenerator.forBlock["rb_bt_send"] = function (block) {
    const msg = javascriptGenerator.valueToCode(block, "MSG", 0) || q("Hello");
    return `SerialBT.println(${msg});\n`;
  };
}

function uniqueLines(text: string) {
  const seen = new Set<string>();

  return text
    .split("\n")
    .filter((line) => {
      const key = line.trim();
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("\n");
}

export function BlocklyWorkspace({ board, initialXml, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<WorkspaceSvg | null>(null);
  const onChangeRef = useRef(onChange);
  const initialXmlRef = useRef(initialXml);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    let disposed = false;
    let ws: WorkspaceSvg | null = null;
    let loaded = false;

    async function setupBlockly() {
      const Blockly = await import("blockly");

      if (disposed || !containerRef.current) return;

      registerCustomBlocks(Blockly);
      registerArduinoGenerators();

      ws = Blockly.inject(containerRef.current, {
        toolbox: buildToolbox(board),
        grid: { spacing: 20, length: 3, colour: "#ccc", snap: true },
        zoom: {
          controls: true,
          wheel: true,
          startScale: 0.9,
          maxScale: 2,
          minScale: 0.4,
        },
        trashcan: true,
        renderer: "zelos",
        move: { scrollbars: true, drag: true, wheel: false },
      });

      workspaceRef.current = ws;

      const setupToolboxToggle = () => {
        const toolbox = document.querySelector(".blocklyToolboxDiv");

        if (!toolbox) return undefined;

        toolbox.classList.add("rb-toolbox-collapsed");

        const openToolbox = () => {
          toolbox.classList.add("rb-toolbox-open");

          setTimeout(() => {
            if (ws) Blockly.svgResize(ws);
          }, 50);
        };

        const closeToolbox = () => {
          toolbox.classList.remove("rb-toolbox-open");

          setTimeout(() => {
            if (ws) Blockly.svgResize(ws);
          }, 50);
        };

        const stopCloseFromToolbox = (event: Event) => {
          event.stopPropagation();
        };

        toolbox.addEventListener("pointerdown", stopCloseFromToolbox);
        toolbox.addEventListener("click", openToolbox);

        const workspaceEl = containerRef.current;
        workspaceEl?.addEventListener("pointerdown", closeToolbox);

        return () => {
          toolbox.removeEventListener("pointerdown", stopCloseFromToolbox);
          toolbox.removeEventListener("click", openToolbox);
          workspaceEl?.removeEventListener("pointerdown", closeToolbox);
        };
      };

      const cleanupToolbox = setupToolboxToggle();

      window.getCode = () => {
        if (!ws) return "";

        const dom = Blockly.Xml.workspaceToDom(ws);
        const xml = Blockly.Xml.domToText(dom);
        console.log("XML:", xml);

        window._setupCode = "";
        window._loopCode = "";
        window._functionCode = "";
        window._helperCode = "";
        window._includeCode = "";
        window._globalCode = "";

        const looseCode = javascriptGenerator.workspaceToCode(ws);
        const vars = Blockly.Variables.allUsedVarModels(ws);
        const varDefs = vars
          .map((v) => `int ${safeArduinoName(v.getName())} = 0;`)
          .join("\n");

        const includeCode = uniqueLines(window._includeCode);
        const globalCode = uniqueLines(window._globalCode);
        const setup = window._setupCode || "";
        const loop = window._loopCode || looseCode || "";
        const functionCode = window._functionCode || "";
        const helperCode = window._helperCode || "";

        const fullCode = `
${includeCode}

${globalCode}
${varDefs}

${helperCode}
${functionCode}
void setup() {
${setup}
}

void loop() {
${loop}
}
`;

        console.log("Arduino Code:", fullCode);
        return fullCode;
      };

      const xmlToLoad = initialXmlRef.current;

      if (xmlToLoad) {
        try {
          const dom = Blockly.utils.xml.textToDom(xmlToLoad);
          Blockly.Xml.domToWorkspace(dom, ws);
        } catch {
          // ignore corrupt saved xml
        }
      }

      loaded = true;

      ws.addChangeListener((event: { isUiEvent?: boolean }) => {
        if (!loaded) return;
        if (event?.isUiEvent) return;
        if (!onChangeRef.current || !ws) return;

        const dom = Blockly.Xml.workspaceToDom(ws);
        onChangeRef.current(Blockly.Xml.domToText(dom));
      });

      const resize = () => {
        if (ws) Blockly.svgResize(ws);
      };

      window.addEventListener("resize", resize);
      setTimeout(resize, 0);

      ws.addChangeListener(() => resize());

      return () => {
        window.removeEventListener("resize", resize);
        cleanupToolbox?.();
      };
    }

    let cleanup: (() => void) | undefined;

    setupBlockly().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      disposed = true;
      cleanup?.();

      if (ws) {
        ws.dispose();
      }
    };
  }, [board]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

/*import { useEffect, useRef } from "react";
import type { BoardType } from "../lib/blocks";
import type { WorkspaceSvg } from "blockly";
import { javascriptGenerator } from "blockly/javascript";

declare global {
  interface Window {
    getCode: () => string;
    _setupCode: string;
    _loopCode: string;
  }
}

interface Props {
  board: BoardType;
  initialXml?: string;
  onChange?: (xml: string) => void;
}

function buildToolbox(board: BoardType) {
  const categories: Array<{
    name: string;
    colour: string;
    contents: Array<{ kind: string; type: string }>;
  }> = [
    {
      name: "Logic",
      colour: "#5C81A6",
      contents: [
        { kind: "block", type: "controls_if" },
        { kind: "block", type: "logic_compare" },
        { kind: "block", type: "logic_operation" },
        { kind: "block", type: "logic_negate" },
        { kind: "block", type: "logic_boolean" },
      ],
    },
    {
      name: "Loops",
      colour: "#5CA65C",
      contents: [
        { kind: "block", type: "controls_repeat_ext" },
        { kind: "block", type: "controls_whileUntil" },
        { kind: "block", type: "rb_forever" },
      ],
    },
    {
      name: "Math",
      colour: "#5C68A6",
      contents: [
        { kind: "block", type: "math_number" },
        { kind: "block", type: "math_arithmetic" },
        { kind: "block", type: "math_random_int" },
      ],
    },
    {
      name: "Text",
      colour: "#5CA68D",
      contents: [
        { kind: "block", type: "text" },
        { kind: "block", type: "text_print" },
      ],
    },
    {
      name: "Variables",
      colour: "#A65C81",
      contents: [],
    },
    {
      name:
        board === "nano"
          ? "Arduino Nano"
          : board === "uno"
            ? "Arduino Uno"
            : "ESP32",
      colour: "#00B894",
      contents: [
        { kind: "block", type: "rb_when_start" },
        { kind: "block", type: "rb_read_digital_pin" },
        { kind: "block", type: "rb_read_analog_pin" },
        { kind: "block", type: "rb_set_digital_pin" },
        { kind: "block", type: "rb_set_pwm_pin" },
        { kind: "block", type: "rb_play_tone" },
        { kind: "block", type: "rb_get_timer" },
        { kind: "block", type: "rb_reset_timer" },
        { kind: "block", type: "rb_map_value" },
      ],
    },
    {
      name: "I/O",
      colour: "#E67E22",
      contents: [
        { kind: "block", type: "rb_pin_mode" },
        { kind: "block", type: "rb_digital_write" },
        { kind: "block", type: "rb_digital_read" },
        { kind: "block", type: "rb_analog_read" },
        { kind: "block", type: "rb_analog_write" },
      ],
    },
    {
      name: "Time",
      colour: "#9B59B6",
      contents: [{ kind: "block", type: "rb_delay" }],
    },
    {
      name: "LED",
      colour: "#F1C40F",
      contents: [
        { kind: "block", type: "rb_led_on" },
        { kind: "block", type: "rb_led_off" },
      ],
    },
    {
      name: "Actuators",
      colour: "#7CB342",
      contents: [{ kind: "block", type: "rb_servo_write" }],
    },
    {
      name: "Servo",
      colour: "#16A085",
      contents: [{ kind: "block", type: "rb_servo_write" }],
    },
    {
      name: "Serial",
      colour: "#34495E",
      contents: [
        { kind: "block", type: "rb_serial_begin" },
        { kind: "block", type: "rb_serial_print" },
      ],
    },
  ];

  if (board === "esp32") {
    categories.push({
      name: "Wi-Fi",
      colour: "#3498DB",
      contents: [{ kind: "block", type: "rb_wifi_connect" }],
    });

    categories.push({
      name: "Bluetooth",
      colour: "#2980B9",
      contents: [
        { kind: "block", type: "rb_bt_begin" },
        { kind: "block", type: "rb_bt_send" },
      ],
    });
  }

  return {
    kind: "categoryToolbox",
    contents: categories.map((c) => ({
      kind: "category",
      name: c.name,
      colour: c.colour,
      ...(c.name === "Variables" ? { custom: "VARIABLE" } : {}),
      contents: c.contents,
    })),
  };
}

let customBlocksRegistered = false;

function registerCustomBlocks(Blockly: typeof import("blockly")) {
  if (customBlocksRegistered) return;
  customBlocksRegistered = true;

  const defs = [
    {
      type: "rb_forever",
      message0: "forever",
      message1: "%1",
      args1: [
        {
          type: "input_statement",
          name: "DO",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#5CA65C",
    },
    {
      type: "rb_when_start",
      message0: "when Arduino starts up",
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      colour: "#607D8B",
    },
    {
      type: "rb_set_digital_pin",
      message0: "set digital pin %1 output as %2",
      args0: [
        { type: "field_number", name: "PIN", value: 13, min: 0, max: 40 },
        {
          type: "field_dropdown",
          name: "VALUE",
          options: [
            ["HIGH", "HIGH"],
            ["LOW", "LOW"],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#00B894",
    },
    {
      type: "rb_read_digital_pin",
      message0: "read status of digital pin %1",
      args0: [
        { type: "field_number", name: "PIN", value: 13, min: 0, max: 40 },
      ],
      output: "Boolean",
      colour: "#00B894",
    },
    {
      type: "rb_read_analog_pin",
      message0: "read analog pin %1",
      args0: [
        {
          type: "field_dropdown",
          name: "PIN",
          options: [
            ["A0", "A0"],
            ["A1", "A1"],
            ["A2", "A2"],
            ["A3", "A3"],
            ["A4", "A4"],
            ["A5", "A5"],
          ],
        },
      ],
      output: "Number",
      colour: "#00B894",
    },
    {
      type: "rb_set_pwm_pin",
      message0: "set PWM pin %1 output as %2",
      args0: [
        {
          type: "field_dropdown",
          name: "PIN",
          options: [
            ["3", "3"],
            ["5", "5"],
            ["6", "6"],
            ["9", "9"],
            ["10", "10"],
            ["11", "11"],
          ],
        },
        { type: "field_number", name: "VALUE", value: 255, min: 0, max: 255 },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#00B894",
    },
    {
      type: "rb_play_tone",
      message0: "play tone on pin %1 of note %2",
      args0: [
        { type: "field_number", name: "PIN", value: 3, min: 0, max: 40 },
        {
          type: "field_dropdown",
          name: "NOTE",
          options: [
            ["C2", "65"],
            ["D2", "73"],
            ["E2", "82"],
            ["F2", "87"],
            ["G2", "98"],
            ["A2", "110"],
            ["B2", "123"],
            ["C3", "131"],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#00B894",
    },
    {
      type: "rb_get_timer",
      message0: "get timer value",
      output: "Number",
      colour: "#00B894",
    },
    {
      type: "rb_reset_timer",
      message0: "reset timer",
      previousStatement: null,
      nextStatement: null,
      colour: "#00B894",
    },
    {
      type: "rb_map_value",
      message0: "map %1 from %2 ~ %3 to %4 ~ %5",
      args0: [
        { type: "input_value", name: "VALUE" },
        { type: "field_number", name: "FROM_LOW", value: 0 },
        { type: "field_number", name: "FROM_HIGH", value: 255 },
        { type: "field_number", name: "TO_LOW", value: 0 },
        { type: "field_number", name: "TO_HIGH", value: 100 },
      ],
      output: "Number",
      colour: "#00B894",
    },
    {
      type: "rb_pin_mode",
      message0: "pinMode pin %1 as %2",
      args0: [
        { type: "field_number", name: "PIN", value: 13, min: 0, max: 40 },
        {
          type: "field_dropdown",
          name: "MODE",
          options: [
            ["OUTPUT", "OUTPUT"],
            ["INPUT", "INPUT"],
            ["INPUT_PULLUP", "INPUT_PULLUP"],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#E67E22",
    },
    {
      type: "rb_digital_write",
      message0: "digitalWrite pin %1 %2",
      args0: [
        { type: "field_number", name: "PIN", value: 13 },
        {
          type: "field_dropdown",
          name: "VAL",
          options: [
            ["HIGH", "HIGH"],
            ["LOW", "LOW"],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#E67E22",
    },
    {
      type: "rb_digital_read",
      message0: "digitalRead pin %1",
      args0: [{ type: "field_number", name: "PIN", value: 2 }],
      output: "Boolean",
      colour: "#E67E22",
    },
    {
      type: "rb_analog_read",
      message0: "analogRead pin %1",
      args0: [{ type: "field_number", name: "PIN", value: 0 }],
      output: "Number",
      colour: "#E67E22",
    },
    {
      type: "rb_analog_write",
      message0: "analogWrite pin %1 value %2",
      args0: [
        { type: "field_number", name: "PIN", value: 9 },
        { type: "field_number", name: "VAL", value: 128, min: 0, max: 255 },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#E67E22",
    },
    {
      type: "rb_delay",
      message0: "wait %1 ms",
      args0: [{ type: "field_number", name: "MS", value: 500, min: 0 }],
      previousStatement: null,
      nextStatement: null,
      colour: "#9B59B6",
    },
    {
      type: "rb_led_on",
      message0: "turn LED on pin %1 ON",
      args0: [{ type: "field_number", name: "PIN", value: 13 }],
      previousStatement: null,
      nextStatement: null,
      colour: "#F1C40F",
    },
    {
      type: "rb_led_off",
      message0: "turn LED on pin %1 OFF",
      args0: [{ type: "field_number", name: "PIN", value: 13 }],
      previousStatement: null,
      nextStatement: null,
      colour: "#F1C40F",
    },
    {
      type: "rb_servo_write",
      message0: "set servo pin %1 to %2°",
      args0: [
        { type: "field_number", name: "PIN", value: 9 },
        { type: "field_number", name: "DEG", value: 90, min: 0, max: 180 },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#16A085",
    },
    {
      type: "rb_serial_begin",
      message0: "Serial begin %1",
      args0: [{ type: "field_number", name: "BAUD", value: 9600 }],
      previousStatement: null,
      nextStatement: null,
      colour: "#34495E",
    },
    {
      type: "rb_serial_print",
      message0: "Serial print %1",
      args0: [{ type: "input_value", name: "MSG" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#34495E",
    },
    {
      type: "rb_wifi_connect",
      message0: "Wi-Fi connect SSID %1 password %2",
      args0: [
        { type: "field_input", name: "SSID", text: "MyWiFi" },
        { type: "field_input", name: "PASS", text: "password" },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#3498DB",
    },
    {
      type: "rb_bt_begin",
      message0: "Bluetooth begin name %1",
      args0: [{ type: "field_input", name: "NAME", text: "RoboBT" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#2980B9",
    },
    {
      type: "rb_bt_send",
      message0: "Bluetooth send %1",
      args0: [{ type: "input_value", name: "MSG" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#2980B9",
    },
  ];

  for (const def of defs) {
    Blockly.Blocks[def.type] = {
      init: function () {
        (this as { jsonInit: (d: unknown) => void }).jsonInit(def);
      },
    };
  }
}
function safeArduinoName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, "_");

  if (/^[0-9]/.test(cleaned)) {
    return `var_${cleaned}`;
  }

  return cleaned || "myVariable";
}

function getVariableName(block: {
  getField: (name: string) => { getText: () => string } | null;
}) {
  const field = block.getField("VAR");
  return safeArduinoName(field?.getText() ?? "myVariable");
}

function registerArduinoGenerators() {
  javascriptGenerator.forBlock["variables_set"] = function (block) {
    const varName = getVariableName(block);
    const value = javascriptGenerator.valueToCode(block, "VALUE", 0) || "0";
    return `${varName} = ${value};\n`;
  };

  javascriptGenerator.forBlock["math_change"] = function (block) {
    const varName = getVariableName(block);
    const value = javascriptGenerator.valueToCode(block, "DELTA", 0) || "1";
    return `${varName} += ${value};\n`;
  };

  javascriptGenerator.forBlock["variables_get"] = function (block) {
    const varName = getVariableName(block);
    return [varName, 0];
  };

  javascriptGenerator.forBlock["rb_forever"] = function (block) {
    const body = javascriptGenerator.statementToCode(block, "DO");
    window._loopCode = body;
    return "";
  };

  javascriptGenerator.forBlock["rb_when_start"] = function (block) {
    window._setupCode = javascriptGenerator.statementToCode(block, "DO");
    return "";
  };

  javascriptGenerator.forBlock["controls_whileUntil"] = function (block) {
    const mode = block.getFieldValue("MODE");
    const condition =
      javascriptGenerator.valueToCode(block, "BOOL", 0) || "true";
    const body = javascriptGenerator.statementToCode(block, "DO");

    if (mode === "WHILE" && condition === "true") {
      window._loopCode = body;
      return "";
    }

    return `while (${condition}) {\n${body}}\n`;
  };

  javascriptGenerator.forBlock["rb_set_digital_pin"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const val = block.getFieldValue("VALUE");
    return `digitalWrite(${pin}, ${val});\n`;
  };

  javascriptGenerator.forBlock["rb_read_digital_pin"] = function (block) {
    const pin = block.getFieldValue("PIN");
    return [`digitalRead(${pin})`, 0];
  };

  javascriptGenerator.forBlock["rb_read_analog_pin"] = function (block) {
    const pin = block.getFieldValue("PIN");
    return [`analogRead(${pin})`, 0];
  };

  javascriptGenerator.forBlock["rb_set_pwm_pin"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const val = block.getFieldValue("VALUE");
    return `analogWrite(${pin}, ${val});\n`;
  };

  javascriptGenerator.forBlock["rb_play_tone"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const note = block.getFieldValue("NOTE");
    return `tone(${pin}, ${note});\n`;
  };

  javascriptGenerator.forBlock["rb_get_timer"] = function () {
    return ["millis()", 0];
  };

  javascriptGenerator.forBlock["rb_reset_timer"] = function () {
    return `// reset timer placeholder\n`;
  };

  javascriptGenerator.forBlock["rb_pin_mode"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const mode = block.getFieldValue("MODE");
    return `pinMode(${pin}, ${mode});\n`;
  };

  javascriptGenerator.forBlock["rb_digital_write"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const val = block.getFieldValue("VAL");
    return `digitalWrite(${pin}, ${val});\n`;
  };

  javascriptGenerator.forBlock["rb_digital_read"] = function (block) {
    const pin = block.getFieldValue("PIN");
    return [`digitalRead(${pin})`, 0];
  };

  javascriptGenerator.forBlock["rb_analog_read"] = function (block) {
    const pin = block.getFieldValue("PIN");
    return [`analogRead(${pin})`, 0];
  };

  javascriptGenerator.forBlock["rb_analog_write"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const val = block.getFieldValue("VAL");
    return `analogWrite(${pin}, ${val});\n`;
  };

  javascriptGenerator.forBlock["rb_delay"] = function (block) {
    const ms = block.getFieldValue("MS");
    return `delay(${ms});\n`;
  };

  javascriptGenerator.forBlock["rb_led_on"] = function (block) {
    const pin = block.getFieldValue("PIN");
    return `digitalWrite(${pin}, HIGH);\n`;
  };

  javascriptGenerator.forBlock["rb_led_off"] = function (block) {
    const pin = block.getFieldValue("PIN");
    return `digitalWrite(${pin}, LOW);\n`;
  };

  javascriptGenerator.forBlock["rb_servo_write"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const deg = block.getFieldValue("DEG");
    return `// Servo on pin ${pin}\nservo.write(${deg});\n`;
  };

  javascriptGenerator.forBlock["rb_serial_begin"] = function (block) {
    const baud = block.getFieldValue("BAUD");
    return `Serial.begin(${baud});\n`;
  };

  javascriptGenerator.forBlock["rb_serial_print"] = function (block) {
    const msg = javascriptGenerator.valueToCode(block, "MSG", 0) || `"Hello"`;
    return `Serial.println(${msg});\n`;
  };

  javascriptGenerator.forBlock["rb_map_value"] = function (block) {
    const value = javascriptGenerator.valueToCode(block, "VALUE", 0) || "0";
    const fromLow = block.getFieldValue("FROM_LOW");
    const fromHigh = block.getFieldValue("FROM_HIGH");
    const toLow = block.getFieldValue("TO_LOW");
    const toHigh = block.getFieldValue("TO_HIGH");

    return [`map(${value}, ${fromLow}, ${fromHigh}, ${toLow}, ${toHigh})`, 0];
  };

  javascriptGenerator.forBlock["rb_wifi_connect"] = function (block) {
    const ssid = block.getFieldValue("SSID");
    const pass = block.getFieldValue("PASS");
    return `WiFi.begin("${ssid}", "${pass}");\n`;
  };

  javascriptGenerator.forBlock["rb_bt_begin"] = function (block) {
    const name = block.getFieldValue("NAME");
    return `SerialBT.begin("${name}");\n`;
  };

  javascriptGenerator.forBlock["rb_bt_send"] = function (block) {
    const msg = javascriptGenerator.valueToCode(block, "MSG", 0) || `"Hello"`;
    return `SerialBT.println(${msg});\n`;
  };
}
export function BlocklyWorkspace({ board, initialXml, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<WorkspaceSvg | null>(null);
  const onChangeRef = useRef(onChange);
  const initialXmlRef = useRef(initialXml);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    let disposed = false;
    let ws: WorkspaceSvg | null = null;
    let loaded = false;

    async function setupBlockly() {
      const Blockly = await import("blockly");

      if (disposed || !containerRef.current) return;

      registerCustomBlocks(Blockly);
      registerArduinoGenerators();

      ws = Blockly.inject(containerRef.current, {
        toolbox: buildToolbox(board),
        grid: { spacing: 20, length: 3, colour: "#ccc", snap: true },
        zoom: {
          controls: true,
          wheel: true,
          startScale: 0.9,
          maxScale: 2,
          minScale: 0.4,
        },
        trashcan: true,
        renderer: "zelos",
        move: { scrollbars: true, drag: true, wheel: false },
      });

      workspaceRef.current = ws;

      const setupToolboxToggle = () => {
        const toolbox = document.querySelector(".blocklyToolboxDiv");

        if (!toolbox) return undefined;

        toolbox.classList.add("rb-toolbox-collapsed");

        const openToolbox = () => {
          toolbox.classList.add("rb-toolbox-open");

          setTimeout(() => {
            if (ws) Blockly.svgResize(ws);
          }, 50);
        };

        const closeToolbox = () => {
          toolbox.classList.remove("rb-toolbox-open");

          setTimeout(() => {
            if (ws) Blockly.svgResize(ws);
          }, 50);
        };

        const stopCloseFromToolbox = (event: Event) => {
          event.stopPropagation();
        };

        toolbox.addEventListener("pointerdown", stopCloseFromToolbox);
        toolbox.addEventListener("click", openToolbox);

        const workspaceEl = containerRef.current;
        workspaceEl?.addEventListener("pointerdown", closeToolbox);

        return () => {
          toolbox.removeEventListener("pointerdown", stopCloseFromToolbox);
          toolbox.removeEventListener("click", openToolbox);
          workspaceEl?.removeEventListener("pointerdown", closeToolbox);
        };
      };

      const cleanupToolbox = setupToolboxToggle();

      window.getCode = () => {
        if (!ws) return "";

        const dom = Blockly.Xml.workspaceToDom(ws);
        const xml = Blockly.Xml.domToText(dom);
        console.log("XML:", xml);

        window._setupCode = "";
        window._loopCode = "";

        const looseCode = javascriptGenerator.workspaceToCode(ws);
        const vars = Blockly.Variables.allUsedVarModels(ws);
        const varDefs = vars
          .map((v) => `int ${safeArduinoName(v.getName())} = 0;`)
          .join("\n");
        const setup = window._setupCode || "";
        const loop = window._loopCode || looseCode || "";

        const fullCode = `
${varDefs}
void setup() {
${setup}
}

void loop() {
${loop}
}
`;

        console.log("Arduino Code:", fullCode);
        return fullCode;
      };

      const xmlToLoad = initialXmlRef.current;

      if (xmlToLoad) {
        try {
          const dom = Blockly.utils.xml.textToDom(xmlToLoad);
          Blockly.Xml.domToWorkspace(dom, ws);
        } catch {
          // ignore corrupt saved xml
        }
      }

      loaded = true;

      ws.addChangeListener((event: { isUiEvent?: boolean }) => {
        if (!loaded) return;
        if (event?.isUiEvent) return;
        if (!onChangeRef.current || !ws) return;

        const dom = Blockly.Xml.workspaceToDom(ws);
        onChangeRef.current(Blockly.Xml.domToText(dom));
      });

      const resize = () => {
        if (ws) Blockly.svgResize(ws);
      };

      window.addEventListener("resize", resize);
      setTimeout(resize, 0);

      ws.addChangeListener(() => resize());

      return () => {
        window.removeEventListener("resize", resize);
        cleanupToolbox?.();
      };
    }

    let cleanup: (() => void) | undefined;

    setupBlockly().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      disposed = true;
      cleanup?.();

      if (ws) {
        ws.dispose();
      }
    };
  }, [board]);

  return <div ref={containerRef} className="absolute inset-0" />;
}*/
