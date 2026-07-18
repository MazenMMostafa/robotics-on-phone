/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BlockDefinition } from "./types";
import { CONTROL } from "../theme/blockColors";
import { safeArduinoName } from "./helpers";

export const controlBlockDefs: BlockDefinition[] = [
  {
    type: "rb_wait_seconds",
    message0: "wait %1 seconds",
    args0: [{ type: "field_number", name: "SECONDS", value: 1, min: 0 }],
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
    args0: [{ type: "field_dropdown", name: "MODE", options: [["all", "all"]] }],
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
    args0: [{ type: "field_dropdown", name: "TARGET", options: [["myself", "myself"]] }],
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
];

export function registerControlGenerators(javascriptGenerator: any) {
  javascriptGenerator.forBlock["rb_wait_seconds"] = function (block: any) {
    const seconds = Number(block.getFieldValue("SECONDS") || 0);
    return `delay(${Math.round(seconds * 1000)});\n`;
  };

  javascriptGenerator.forBlock["rb_count_loop"] = function (block: any) {
    const varName = safeArduinoName(block.getField("VAR")?.getText() ?? "i");
    const from = block.getFieldValue("FROM");
    const to = block.getFieldValue("TO");
    const step = block.getFieldValue("STEP") || "1";
    const body = javascriptGenerator.statementToCode(block, "DO");
    return `for (int ${varName} = ${from}; ${varName} <= ${to}; ${varName} += ${step}) {\n${body}}\n`;
  };

  javascriptGenerator.forBlock["rb_wait_until"] = function (block: any) {
    const condition = javascriptGenerator.valueToCode(block, "CONDITION", 0) || "false";
    return `while (!(${condition})) {\n  delay(10);\n}\n`;
  };

  javascriptGenerator.forBlock["rb_repeat_until"] = function (block: any) {
    const condition = javascriptGenerator.valueToCode(block, "CONDITION", 0) || "false";
    const body = javascriptGenerator.statementToCode(block, "DO");
    return `while (!(${condition})) {\n${body}}\n`;
  };

  javascriptGenerator.forBlock["rb_stop_all"] = function () {
    return `while (true) {\n  delay(1000);\n}\n`;
  };

  javascriptGenerator.forBlock["rb_when_clone_start"] = function (block: any) {
    const body = javascriptGenerator.statementToCode(block, "DO");
    return `// Clone start is not supported on Arduino.\n${body}`;
  };

  javascriptGenerator.forBlock["rb_create_clone"] = function () {
    return `// create clone is not supported on Arduino.\n`;
  };

  javascriptGenerator.forBlock["rb_delete_clone"] = function () {
    return `// delete clone is not supported on Arduino.\n`;
  };
}
