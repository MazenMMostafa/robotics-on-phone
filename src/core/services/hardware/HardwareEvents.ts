export const HARDWARE_EVENTS = {
  DEVICE_FOUND: "device:found",
  DEVICE_LOST: "device:lost",
  DEVICE_CONNECTED: "device:connected",
  DEVICE_DISCONNECTED: "device:disconnected",
  BOARD_SELECTED: "board:selected",
  BOARD_CHANGED: "board:changed",
  PORT_SELECTED: "port:selected",
  PORT_CHANGED: "port:changed",
  CONNECTION_OPENED: "connection:opened",
  CONNECTION_CLOSED: "connection:closed",
  CONNECTION_ERROR: "connection:error",
} as const;
