/* eslint-disable @typescript-eslint/no-explicit-any */
import { uniqueLines, safeArduinoName } from "../blocks/helpers";

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

export function setupGetCode(
  workspace: any,
  javascriptGenerator: any,
  Blockly: typeof import("blockly"),
) {
  window.getCode = () => {
    if (!workspace) return "";

    window._setupCode = "";
    window._loopCode = "";
    window._functionCode = "";
    window._helperCode = "";
    window._includeCode = "";
    window._globalCode = "";

    const looseCode = javascriptGenerator.workspaceToCode(workspace);
    const vars = Blockly.Variables.allUsedVarModels(workspace);
    const varDefs = vars
      .map((v: any) => `int ${safeArduinoName(v.getName())} = 0;`)
      .join("\n");

    const includeCode = uniqueLines(window._includeCode);
    const globalCode = uniqueLines(window._globalCode);
    const setup = window._setupCode || "";
    const loop = window._loopCode || looseCode || "";
    const functionCode = window._functionCode || "";
    const helperCode = window._helperCode || "";

    return `
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
  };
}
