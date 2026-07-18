export interface DigitalPinInfo {
  pin: number;
  name?: string;
  pwm: boolean;
  interrupt: boolean;
  builtinLed?: boolean;
  reserved?: boolean;
  sda?: boolean;
  scl?: boolean;
  dac?: boolean;
  inputOnly?: boolean;
}

export interface AnalogPinInfo {
  pin: string;
  sda?: boolean;
  scl?: boolean;
}

export interface InterfaceConfig {
  num: number;
  rx?: number;
  tx?: number;
  sda?: number | string;
  scl?: number | string;
  mosi?: number;
  miso?: number;
  sck?: number;
  ss?: number;
}

export interface BoardConfig {
  id: string;
  displayName: string;
  manufacturer: string;
  architecture: string;
  processor: string;
  uploadProtocol: string;
  compileFQBN: string;
  defaultBaudRate: number;
  supportedBaudRates: number[];
  digitalPins: DigitalPinInfo[];
  analogPins: AnalogPinInfo[];
  pwmPins: number[];
  interruptPins: number[];
  uart: InterfaceConfig[];
  i2c: InterfaceConfig[];
  spi: InterfaceConfig[];
  voltage: string;
  clockSpeed: number;
  flashSize: number;
  ramSize: number;
  libraries: string[];
  capabilities: string[];
  supportedComponents: string[];
  icon: string;
  image: string;
  preferredUploadEngine?: string;
  supportedUploadEngines?: string[];
  bootloader?: string;
  resetStrategy?: "dtr" | "rts" | "dtr_rts" | "touch" | "none";
  verificationStrategy?: "checksum" | "compare" | "none";
}
