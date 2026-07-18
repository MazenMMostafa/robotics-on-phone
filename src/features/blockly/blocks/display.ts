/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BlockDefinition } from "./types";
import { DISPLAY } from "../theme/blockColors";

const pinOptions = [
  ["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"],
  ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"], ["10", "10"], ["11", "11"],
  ["12", "12"], ["13", "13"],
];

export const displayBlockDefs: BlockDefinition[] = [
  {
    type: "rb_lcd_init_parallel",
    message0: "initialize 16 x 2 display on RST %1 EN %2 D4 %3 D5 %4 D6 %5 D7 %6",
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
      { type: "field_dropdown", name: "MODE", options: [["blink", "blink"], ["no blink", "noBlink"], ["cursor", "cursor"], ["no cursor", "noCursor"]] },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: DISPLAY,
  },
];

export function registerDisplayGenerators(javascriptGenerator: any) {
  javascriptGenerator.forBlock["rb_lcd_init_parallel"] = function (block: any) {
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

  javascriptGenerator.forBlock["rb_lcd_init_i2c"] = function (block: any) {
    const addr = block.getFieldValue("ADDR") || "0x27";
    window._includeCode += `#include <Wire.h>\n#include <LiquidCrystal_I2C.h>\n`;
    window._globalCode += `LiquidCrystal_I2C lcd(${addr}, 16, 2);\n`;
    return `lcd.init();\nlcd.backlight();\n`;
  };

  javascriptGenerator.forBlock["rb_lcd_set_cursor"] = function (block: any) {
    const col = Number(block.getFieldValue("COL") || 1) - 1;
    const row = Number(block.getFieldValue("ROW") || 1) - 1;
    return `lcd.setCursor(${col}, ${row});\n`;
  };

  javascriptGenerator.forBlock["rb_lcd_print"] = function (block: any) {
    const text = javascriptGenerator.valueToCode(block, "TEXT", 0) || JSON.stringify("Hello World");
    return `lcd.print(${text});\n`;
  };

  javascriptGenerator.forBlock["rb_lcd_clear"] = function () {
    return `lcd.clear();\n`;
  };

  javascriptGenerator.forBlock["rb_lcd_mode"] = function (block: any) {
    return `lcd.${block.getFieldValue("MODE")}();\n`;
  };
}
