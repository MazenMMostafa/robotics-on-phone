import type { BoardType } from "../../../core/types/board";
import { CONTROL, OPERATORS, VARIABLES, MY_BLOCKS, ARDUINO, ACTUATORS, SENSORS, DISPLAY } from "../theme/blockColors";
import { ExtensionManager } from "../../../core/services/extension/ExtensionManager";

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

function boardCategoryName(board: BoardType) {
  const names: Partial<Record<BoardType, string>> = {
    nano: "Arduino Nano",
    mega: "Arduino Mega",
    leonardo: "Arduino Leonardo",
    esp32: "ESP32",
    esp8266: "ESP8266",
    pico: "Raspberry Pi Pico",
  };
  return names[board] || "Arduino Uno";
}

function boardHasWifi(board: BoardType) {
  return board === "esp32" || board === "esp8266";
}

export function buildToolbox(board: BoardType) {
  const categories: ToolboxCategory[] = [
    {
      name: "Control", colour: CONTROL,
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
      name: "Operators", colour: OPERATORS,
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
    { name: "Variables", colour: VARIABLES, custom: "VARIABLE", contents: [] },
    { name: "My Blocks", colour: MY_BLOCKS, custom: "PROCEDURE", contents: [] },
    {
      name: boardCategoryName(board), colour: ARDUINO,
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
        ...(boardHasWifi(board)
          ? [
              { kind: "block" as const, type: "rb_wifi_connect" },
              { kind: "block" as const, type: "rb_bt_begin" },
              { kind: "block" as const, type: "rb_bt_send" },
            ]
          : []),
      ],
    },
    {
      name: "Actuators", colour: ACTUATORS,
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
      name: "Sensors", colour: SENSORS,
      contents: [
        { kind: "block", type: "rb_ultrasonic_distance" },
        { kind: "block", type: "rb_digital_sensor" },
        { kind: "block", type: "rb_dht_sensor" },
        { kind: "block", type: "rb_analog_sensor" },
      ],
    },
    {
      name: "Display Modules", colour: DISPLAY,
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

  // Append extension toolbox categories
  ExtensionManager.init();
  for (const extCat of ExtensionManager.getToolboxCategories()) {
    const extBlocks = extCat.blockTypes.map((bt) => ({ kind: "block" as const, type: bt }));
    categories.push({
      name: extCat.name,
      colour: extCat.colour,
      contents: extBlocks,
    });
  }

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
