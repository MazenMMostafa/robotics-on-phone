/* eslint-disable @typescript-eslint/no-explicit-any */
import { eventBlockDefs, registerEventGenerators } from "./events";
import { controlBlockDefs, registerControlGenerators } from "./control";
import { operatorBlockDefs, registerOperatorGenerators } from "./operators";
import { arduinoBlockDefs, registerArduinoGenerators } from "./arduino";
import { actuatorBlockDefs, registerActuatorGenerators } from "./actuators";
import { sensorBlockDefs, registerSensorGenerators } from "./sensors";
import { displayBlockDefs, registerDisplayGenerators } from "./display";
import { communicationBlockDefs, registerCommunicationGenerators } from "./communication";
import type { BlockDefinition } from "./types";

const allDefs: BlockDefinition[] = [
  ...eventBlockDefs,
  ...controlBlockDefs,
  ...operatorBlockDefs,
  ...arduinoBlockDefs,
  ...actuatorBlockDefs,
  ...sensorBlockDefs,
  ...displayBlockDefs,
  ...communicationBlockDefs,
];

const generatorRegistrations: ((js: any) => void)[] = [
  registerEventGenerators,
  registerControlGenerators,
  registerOperatorGenerators,
  registerArduinoGenerators,
  registerActuatorGenerators,
  registerSensorGenerators,
  registerDisplayGenerators,
  registerCommunicationGenerators,
];

let registered = false;

export function registerAllBlocks(Blockly: typeof import("blockly")) {
  if (registered) return;
  registered = true;

  for (const def of allDefs) {
    Blockly.Blocks[def.type] = {
      init: function () {
        (this as any).jsonInit(def);
      },
    };
  }
}

export function registerAllGenerators(javascriptGenerator: any) {
  for (const reg of generatorRegistrations) {
    reg(javascriptGenerator);
  }
}
