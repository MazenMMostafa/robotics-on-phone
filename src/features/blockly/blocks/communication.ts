/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BlockDefinition } from "./types";
import { WIFI_BT } from "../theme/blockColors";

export const communicationBlockDefs: BlockDefinition[] = [
  {
    type: "rb_wifi_connect",
    message0: "Wi-Fi connect SSID %1 password %2",
    args0: [
      { type: "field_input", name: "SSID", text: "MyWiFi" },
      { type: "field_input", name: "PASS", text: "password" },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: WIFI_BT,
  },
  {
    type: "rb_bt_begin",
    message0: "Bluetooth begin name %1",
    args0: [{ type: "field_input", name: "NAME", text: "NewBeginBT" }],
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

export function registerCommunicationGenerators(javascriptGenerator: any) {
  javascriptGenerator.forBlock["rb_wifi_connect"] = function (block: any) {
    const ssid = block.getFieldValue("SSID");
    const pass = block.getFieldValue("PASS");
    window._includeCode += `#include <WiFi.h>\n`;
    return `WiFi.begin(${JSON.stringify(ssid)}, ${JSON.stringify(pass)});\n`;
  };

  javascriptGenerator.forBlock["rb_bt_begin"] = function (block: any) {
    const name = block.getFieldValue("NAME");
    window._includeCode += `#include <BluetoothSerial.h>\n`;
    window._globalCode += `BluetoothSerial SerialBT;\n`;
    return `SerialBT.begin(${JSON.stringify(name)});\n`;
  };

  javascriptGenerator.forBlock["rb_bt_send"] = function (block: any) {
    const msg = javascriptGenerator.valueToCode(block, "MSG", 0) || JSON.stringify("Hello");
    return `SerialBT.println(${msg});\n`;
  };
}
