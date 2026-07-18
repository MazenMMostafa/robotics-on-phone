/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ExtensionBlock, ToolboxCategoryConfig } from "../../../core/types/extension";

const CATEGORY_OUTPUT = "output";
const COLOUR_OUTPUT = "#FF4D5A";

const ledOnBlock: ExtensionBlock = {
  type: "ext_led_on",
  category: CATEGORY_OUTPUT,
  init: function (this: any) {
    this.jsonInit({
      message0: "turn LED on pin %1 %2",
      args0: [
        {
          type: "field_dropdown",
          name: "PIN",
          options: [
            ["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"],
            ["5", "5"], ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"],
            ["10", "10"], ["11", "11"], ["12", "12"], ["13", "13"],
          ],
        },
        {
          type: "field_dropdown",
          name: "STATE",
          options: [["ON", "HIGH"], ["OFF", "LOW"]],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: COLOUR_OUTPUT,
    });
  },
  generator: function (block: any) {
    const pin = block.getFieldValue("PIN");
    const state = block.getFieldValue("STATE");
    return `pinMode(${pin}, OUTPUT);\ndigitalWrite(${pin}, ${state});\n`;
  },
};

const ledBlinkBlock: ExtensionBlock = {
  type: "ext_led_blink",
  category: CATEGORY_OUTPUT,
  init: function (this: any) {
    this.jsonInit({
      message0: "blink LED on pin %1 every %2 ms",
      args0: [
        {
          type: "field_dropdown",
          name: "PIN",
          options: [
            ["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"],
            ["5", "5"], ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"],
            ["10", "10"], ["11", "11"], ["12", "12"], ["13", "13"],
          ],
        },
        { type: "field_number", name: "DELAY", value: 1000, min: 10 },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: COLOUR_OUTPUT,
    });
  },
  generator: function (block: any) {
    const pin = block.getFieldValue("PIN");
    const delay = block.getFieldValue("DELAY");
    return `pinMode(${pin}, OUTPUT);\ndigitalWrite(${pin}, HIGH);\ndelay(${delay});\ndigitalWrite(${pin}, LOW);\ndelay(${delay});\n`;
  },
};

export function blocks(): ExtensionBlock[] {
  return [ledOnBlock, ledBlinkBlock];
}

export function categories(): ToolboxCategoryConfig[] {
  return [
    {
      id: CATEGORY_OUTPUT,
      name: "Output",
      colour: COLOUR_OUTPUT,
      blockTypes: ["ext_led_on", "ext_led_blink"],
    },
  ];
}
