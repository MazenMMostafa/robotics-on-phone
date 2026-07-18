/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BlockDefinition } from "./types";
import { OPERATORS } from "../theme/blockColors";
import { safeArduinoName, getVariableName } from "./helpers";

export const operatorBlockDefs: BlockDefinition[] = [
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
];

export function registerOperatorGenerators(javascriptGenerator: any) {
  javascriptGenerator.forBlock["text"] = function (block: any) {
    return [JSON.stringify(block.getFieldValue("TEXT") || ""), 0];
  };

  javascriptGenerator.forBlock["text_join"] = function (block: any) {
    const itemCount = Number((block as any).itemCount_ ?? 2);
    const parts: string[] = [];
    for (let i = 0; i < itemCount; i++) {
      parts.push(`String(${javascriptGenerator.valueToCode(block, `ADD${i}`, 0) || '""'})`);
    }
    return [parts.length ? parts.join(" + ") : '""', 0];
  };

  javascriptGenerator.forBlock["text_length"] = function (block: any) {
    const text = javascriptGenerator.valueToCode(block, "VALUE", 0) || '""';
    return [`String(${text}).length()`, 0];
  };

  javascriptGenerator.forBlock["text_charAt"] = function (block: any) {
    const text = javascriptGenerator.valueToCode(block, "VALUE", 0) || '""';
    const at = javascriptGenerator.valueToCode(block, "AT", 0) || "1";
    return [`String(${text}).charAt((${at}) - 1)`, 0];
  };

  javascriptGenerator.forBlock["rb_text_contains"] = function (block: any) {
    const text = javascriptGenerator.valueToCode(block, "TEXT", 0) || '""';
    const sub = javascriptGenerator.valueToCode(block, "SUB", 0) || '""';
    return [`String(${text}).indexOf(${sub}) >= 0`, 0];
  };

  javascriptGenerator.forBlock["variables_set"] = function (block: any) {
    const varName = getVariableName(block);
    const value = javascriptGenerator.valueToCode(block, "VALUE", 0) || "0";
    return `${varName} = ${value};\n`;
  };

  javascriptGenerator.forBlock["math_change"] = function (block: any) {
    const varName = getVariableName(block);
    const value = javascriptGenerator.valueToCode(block, "DELTA", 0) || "1";
    return `${varName} += ${value};\n`;
  };

  javascriptGenerator.forBlock["variables_get"] = function (block: any) {
    const varName = getVariableName(block);
    return [varName, 0];
  };

  javascriptGenerator.forBlock["procedures_defnoreturn"] = function (block: any) {
    const name = safeArduinoName(block.getFieldValue("NAME") || "myBlock");
    const body = javascriptGenerator.statementToCode(block, "STACK");
    window._functionCode += `void ${name}() {\n${body}}\n\n`;
    return "";
  };

  javascriptGenerator.forBlock["procedures_callnoreturn"] = function (block: any) {
    const name = safeArduinoName(block.getFieldValue("NAME") || "myBlock");
    return `${name}();\n`;
  };

  javascriptGenerator.forBlock["procedures_defreturn"] = function (block: any) {
    const name = safeArduinoName(block.getFieldValue("NAME") || "myBlock");
    const body = javascriptGenerator.statementToCode(block, "STACK");
    const value = javascriptGenerator.valueToCode(block, "RETURN", 0) || "0";
    window._functionCode += `int ${name}() {\n${body}  return ${value};\n}\n\n`;
    return "";
  };

  javascriptGenerator.forBlock["procedures_callreturn"] = function (block: any) {
    const name = safeArduinoName(block.getFieldValue("NAME") || "myBlock");
    return [`${name}()`, 0];
  };

  javascriptGenerator.forBlock["controls_whileUntil"] = function (block: any) {
    const mode = block.getFieldValue("MODE");
    const condition = javascriptGenerator.valueToCode(block, "BOOL", 0) || "true";
    const body = javascriptGenerator.statementToCode(block, "DO");
    if (mode === "WHILE") return `while (${condition}) {\n${body}}\n`;
    return `while (!(${condition})) {\n${body}}\n`;
  };
}
