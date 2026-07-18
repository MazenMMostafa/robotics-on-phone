/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BlockDefinition } from "./types";
import { CONTROL } from "../theme/blockColors";

export const eventBlockDefs: BlockDefinition[] = [
  {
    type: "rb_when_start",
    message0: "when Arduino starts up",
    message1: "%1",
    args1: [{ type: "input_statement", name: "DO" }],
    colour: "#607D8B",
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
];

export function registerEventGenerators(javascriptGenerator: any) {
  javascriptGenerator.forBlock["rb_when_start"] = function (block: any) {
    window._setupCode = javascriptGenerator.statementToCode(block, "DO");
    return "";
  };

  javascriptGenerator.forBlock["rb_forever"] = function (block: any) {
    window._loopCode = javascriptGenerator.statementToCode(block, "DO");
    return "";
  };
}
