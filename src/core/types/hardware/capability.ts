export type BoardCapability =
  | "digital"
  | "analog"
  | "pwm"
  | "interrupt"
  | "i2c"
  | "spi"
  | "uart"
  | "dac"
  | "adc_8bit"
  | "adc_10bit"
  | "adc_12bit"
  | "usb_upload"
  | "ota"
  | "bluetooth"
  | "wifi"
  | "filesystem"
  | "eeprom"
  | "usb_hid"
  | "can"
  | "touch"
  | "hall_sensor";

export type SupportedFramework = "arduino" | "esp-idf" | "micropython" | "circuitpython";

export interface BoardCapabilityInfo {
  digitalIO: boolean;
  analog: boolean;
  analogResolution: number;
  pwm: boolean;
  pwmResolution: number;
  interrupts: boolean;
  maxInterrupts: number;
  i2c: boolean;
  i2cCount: number;
  spi: boolean;
  spiCount: number;
  uart: boolean;
  uartCount: number;
  dac: boolean;
  dacResolution: number;
  adcResolution: number;
  flashSize: number;
  ramSize: number;
  usbUpload: boolean;
  ota: boolean;
  otaProtocols: string[];
  bluetooth: boolean;
  bluetoothProtocols: string[];
  wifi: boolean;
  wifiProtocols: string[];
  filesystem: boolean;
  filesystemTypes: string[];
  supportedFrameworks: SupportedFramework[];
  usbHid: boolean;
  can: boolean;
  touch: boolean;
  hallSensor: boolean;
}

export type CompatibilityLevel = "full" | "partial" | "none";

export interface CompatibilityReport {
  compatible: boolean;
  level: CompatibilityLevel;
  issues: CompatibilityIssue[];
}

export interface CompatibilityIssue {
  severity: "error" | "warning" | "info";
  message: string;
  code?: string;
}
