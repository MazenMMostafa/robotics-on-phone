# Board Database

## Overview

The board database is a collection of JSON files in `src/data/boards/` that define every supported microcontroller board. Adding a new board requires **zero code changes** — just drop a new JSON file in the directory.

## Auto-Discovery

The `BoardService` (`src/core/services/board/BoardService.ts`) uses `import.meta.glob` to automatically discover and load all `*.json` files from `src/data/boards/`. New files are picked up at build time with no configuration.

## How to Add a New Board

1. Create a new JSON file in `src/data/boards/` (e.g., `teensy40.json`)
2. Fill in the schema fields (see below)
3. Rebuild the app

The board will automatically appear in:
- The "New Project" board selector
- All `BoardService` API results
- Component compatibility checks

## JSON Schema

```typescript
interface BoardConfig {
  /** Unique identifier (used in code, storage, etc.) */
  id: string;
  /** Human-readable name (e.g. "Arduino Uno") */
  displayName: string;
  /** Manufacturer name (e.g. "Arduino", "Espressif") */
  manufacturer: string;
  /** CPU architecture (e.g. "avr", "xtensa", "arm") */
  architecture: string;
  /** Microcontroller model (e.g. "ATmega328P") */
  processor: string;
  /** Upload protocol (e.g. "stk500v1", "uf2", "esp32") */
  uploadProtocol: string;
  /** Arduino CLI FQBN for compilation */
  compileFQBN: string;
  /** Default serial baud rate */
  defaultBaudRate: number;
  /** All supported baud rates */
  supportedBaudRates: number[];
  /** Digital pin definitions */
  digitalPins: DigitalPinInfo[];
  /** Analog pin definitions */
  analogPins: AnalogPinInfo[];
  /** Pin numbers that support PWM */
  pwmPins: number[];
  /** Pin numbers that support hardware interrupts */
  interruptPins: number[];
  /** UART interface configurations */
  uart: InterfaceConfig[];
  /** I2C interface configurations */
  i2c: InterfaceConfig[];
  /** SPI interface configurations */
  spi: InterfaceConfig[];
  /** Operating voltage (e.g. "5V", "3.3V") */
  voltage: string;
  /** CPU clock speed in Hz */
  clockSpeed: number;
  /** Flash memory size in bytes */
  flashSize: number;
  /** RAM size in bytes */
  ramSize: number;
  /** Available Arduino libraries */
  libraries: string[];
  /** Hardware capabilities flags */
  capabilities: string[];
  /** Component IDs supported by this board */
  supportedComponents: string[];
  /** Emoji icon for UI display */
  icon: string;
  /** Optional image URL/path */
  image: string;
}

interface DigitalPinInfo {
  pin: number;
  name?: string;       // e.g. "RX", "TX", "LED"
  pwm: boolean;        // supports PWM output
  interrupt: boolean;  // supports hardware interrupt
  builtinLed?: boolean; // has built-in LED
  reserved?: boolean;  // reserved for special functions
  sda?: boolean;       // I2C SDA pin
  scl?: boolean;       // I2C SCL pin
  dac?: boolean;       // true DAC output
  inputOnly?: boolean; // input-only pin
}

interface AnalogPinInfo {
  pin: string;  // e.g. "A0" or pin number
  sda?: boolean;
  scl?: boolean;
}

interface InterfaceConfig {
  num: number;   // interface number
  rx?: number;   // UART RX pin
  tx?: number;   // UART TX pin
  sda?: number | string; // I2C SDA
  scl?: number | string; // I2C SCL
  mosi?: number; // SPI MOSI
  miso?: number; // SPI MISO
  sck?: number;  // SPI SCK
  ss?: number;   // SPI SS/CS
}
```

## Supported Boards

| ID | Display Name | Architecture | Voltage | Icon |
|----|-------------|--------------|---------|------|
| uno | Arduino Uno | avr | 5V | 🔵 |
| nano | Arduino Nano | avr | 5V | 🟢 |
| mega | Arduino Mega 2560 | avr | 5V | 🟠 |
| leonardo | Arduino Leonardo | avr | 5V | 🔴 |
| esp32 | ESP32 Dev Kit | xtensa | 3.3V | 🟣 |
| esp8266 | ESP8266 NodeMCU | xtensa | 3.3V | 🟤 |
| pico | Raspberry Pi Pico | arm | 3.3V | 🟡 |

## BoardService API

```typescript
BoardService.getBoards(): BoardConfig[]
BoardService.getBoard(id: string): BoardConfig | undefined
BoardService.getPinInfo(boardId, pin): DigitalPinInfo | undefined
BoardService.supportsComponent(boardId, componentId): boolean
BoardService.supportsLibrary(boardId, library): boolean
BoardService.supportsPWM(boardId, pin): boolean
BoardService.supportsAnalog(boardId, pin): boolean
BoardService.supportsInterrupt(boardId, pin): boolean
BoardService.hasCapability(boardId, capability): boolean
BoardService.getSupportedBoardsForComponent(componentId): BoardConfig[]
```
