# ESP32 Boot Mode & Reset Strategy

## Architecture Overview

ESP32-family microcontrollers require a specific reset sequence to enter firmware download (flash) mode. Two complementary subsystems handle this:

- **EspResetStrategy**: Physically toggles control signals to force the chip into bootloader mode
- **EspBootMode**: Confirms the chip is in the expected boot mode and ready for flash communication

These subsystems are strategy-pattern driven: each ESP32 variant defines a preferred reset strategy and boot mode in its board profile.

## EspResetStrategy

### Responsibilities

- Execute the hardware reset sequence to enter ESP download mode
- Support three reset strategies: `en_pin`, `boot_pin`, and `usb`
- Return a `ResetResult` indicating success and whether the chip entered bootloader
- Log warnings for unknown strategies (falling back to `boot_pin`)

### Public API

```typescript
type EspResetStrategy = "en_pin" | "boot_pin" | "usb";

interface ResetResult {
  success: boolean;
  inBootloader: boolean;
}

function executeReset(
  strategy: EspResetStrategy,
  connection: ConnectionAdapter,
  baudRate: number,
  waitMs: number,
  logger: LoggerService,
): Promise<ResetResult>;
```

### Strategy Details

| Strategy | Description | Sequence | `inBootloader` |
|----------|-------------|----------|----------------|
| `en_pin` | Toggle EN pin via DTR | Connect → Flush → Sleep(100ms) → Disconnect | `false` |
| `boot_pin` | Sequence GPIO0 via RTS | Connect → Flush → Write boot sequence → Sleep(50ms) → Flush → Sleep(waitMs) → Disconnect | `true` |
| `usb` | USB serial reset | Connect → Flush → Sleep(100ms) → Disconnect → Sleep(waitMs) | `true` |

### Sequence Diagram

```
EspResetStrategy          Connection
     |                        |
     |--en_pin:               |
     |   connect(baudRate)    |
     |   flush()              |
     |   sleep(100ms)         |
     |   disconnect()         |
     |                        |
     |--boot_pin:             |
     |   connect(baudRate)    |
     |   flush()              |
     |   writeBytes([0,0,0,0])|
     |   sleep(50ms)          |
     |   flush()              |
     |   sleep(waitMs)        |
     |   disconnect()         |
     |                        |
     |--usb:                  |
     |   connect(baudRate)    |
     |   flush()              |
     |   sleep(100ms)         |
     |   disconnect()         |
     |   sleep(waitMs)        |
     |                        |
```

## EspBootMode

### Responsibilities

- Verify the chip is in the expected download mode
- Support three boot modes: `auto`, `manual`, and `usb_cdc`
- Return a `BootResult` with success status and the active mode
- Log warnings for unknown boot modes (falling back to `auto`)

### Public API

```typescript
type EspBootMode = "auto" | "manual" | "usb_cdc";

interface BootResult {
  success: boolean;
  mode: EspBootMode;
}

function executeBoot(
  mode: EspBootMode,
  connection: ConnectionAdapter,
  baudRate: number,
  logger: LoggerService,
): Promise<BootResult>;
```

### Mode Details

| Mode | Description | Detection | `success` |
|------|-------------|-----------|-----------|
| `auto` | Read back chip response after sync | Read from connection; success if bytes received | `bytes.length > 0` |
| `manual` | User-requested manual boot | No interaction; always succeeds | `true` |
| `usb_cdc` | USB CDC boot for S2/S3 | No interaction; always succeeds | `true` |

## Board Profile Integration

Each board profile specifies its reset strategy and boot mode:

```typescript
const ESP_BOARD_PROFILES = {
  "esp32":    { resetStrategy: "boot_pin", bootMode: "auto" },
  "esp32-s2": { resetStrategy: "boot_pin", bootMode: "auto" },
  "esp32-s3": { resetStrategy: "boot_pin", bootMode: "usb_cdc" },
  "esp32-c3": { resetStrategy: "en_pin",   bootMode: "auto" },
};
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| Unknown reset strategy | Log warning, fall back to `boot_pin` |
| Unknown boot mode | Log warning, fall back to `auto` |
| Connection failure during reset | Propagates as `UploadError` to the backend |
| Boot mode confirmation fails | Returns `success: false`; caller decides to abort or retry |

## Extension Points

- **New reset strategies**: Add a handler function and register it in `strategyHandlers` map
- **New boot modes**: Add a handler function and register it in `bootHandlers` map
- **Custom timing**: Board profiles can override `resetWaitMs` per chip variant

## Future Improvements

- DTR/RTS bitbang timing calibration per chip variant
- Automatic strategy detection based on chip response (try `boot_pin`, fall back to `en_pin`)
- Support for ESP32-PICO and other non-standard variants
- Hardware flow control for noise-resistant reset sequences

## Related Components

- `EspBoardProfile` (`src/core/types/upload/esp32/board.ts`)
- `ConnectionAdapter` (`src/core/types/hardware/connection.ts`)
- `EsptoolProtocol` (`src/core/services/upload/esp32/EsptoolProtocol.ts`)
- `EsptoolBackend` (`src/core/services/upload/backends/EsptoolBackend.ts`)
- `LoggerService` (`src/core/services/logging/LoggerService.ts`)
