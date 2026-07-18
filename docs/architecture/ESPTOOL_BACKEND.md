# Esptool Backend

## Architecture Overview

`EsptoolBackend` is a concrete implementation of `UploaderBackend` that communicates with ESP32-family microcontrollers using the ESP serial download protocol (esptool protocol). It is the hardware-facing layer of the ESP32 upload pipeline, orchestrating the full sequence from connection to flash verification.

The backend uses three sub-modules:
- **EsptoolProtocol**: Low-level serial protocol (sync, chip detect, flash commands)
- **EspResetStrategy**: Chip reset sequence to enter bootloader mode
- **EspBootMode**: Boot mode confirmation after entering bootloader

## Responsibilities

- Implement the `UploaderBackend` interface for ESP chips
- Manage USB/serial connection lifecycle (connect, disconnect, reconnect at different baud rates)
- Execute the esptool flash protocol (sync → detect → begin → data → end)
- Report progress via `UploadProgressCallback`
- Map hardware errors to typed upload errors (`PortUnavailableError`, `UploadTimeoutError`, etc.)
- Support cancellation mid-upload
- Verify chip identity after flashing

## Public API

```typescript
class EsptoolBackend implements UploaderBackend {
  readonly id = "esptool-v1";
  readonly name = "ESP Tool";
  readonly version = "1.0.0";

  detect(): Promise<ToolchainInfo>;
  validate(options: UploadOptions): Promise<BackendValidationResult>;
  execute(options: UploadOptions, onProgress?: UploadProgressCallback): Promise<UploadResult>;
  verify(options: UploadOptions): Promise<boolean>;
  cancel(): Promise<void>;
  cleanup(options: UploadOptions): Promise<void>;
}
```

### `detect()`

Returns an installed status with the list of supported boards (`esp32`, `esp32-s2`, `esp32-s3`, `esp32-c3`). Since esptool is embedded, no external toolchain detection is required.

### `validate(options)`

Checks:
- Board ID is a known ESP32 variant (`getEspBoardProfile` returns a profile)
- Port ID is non-empty
- Artifact path is non-empty

### `execute(options, onProgress?)`

Performs the full flash sequence (see Internal Workflow below).

### `verify(options)`

Connects to the device, runs `sync()` and `detectChip()`, and compares the detected chip with the expected chip from the board profile.

## Internal Workflow

### Flash Sequence (execute)

```
execute()
  │
  ├─ 1. Board profile lookup
  │     getEspBoardProfile(options.boardId)
  │
  ├─ 2. Connection
  │     hardwareManager.createConnection("usb")
  │     connection.connect({ baudRate: profile.defaultBaudRate })
  │
  ├─ 3. Reset to bootloader (EspResetStrategy)
  │     executeReset(profile.resetStrategy, connection, ...)
  │
  ├─ 4. Reconnect at flash speed
  │     connection.connect({ baudRate })
  │
  ├─ 5. Sync (EsptoolProtocol)
  │     protocol.sync()
  │
  ├─ 6. Boot mode confirmation (EspBootMode)
  │     executeBoot(profile.bootMode, connection, ...)
  │
  ├─ 7. Chip detection
  │     chip = protocol.detectChip()
  │
  ├─ 8. Flash begin
  │     protocol.beginFlash(address, totalSize, pageSize)
  │
  ├─ 9. Data transfer (loop)
  │     for each page:
  │       protocol.sendData(sequence, pageData)
  │       reportProgress(page / totalPages)
  │
  ├─10. Flash end
  │     protocol.endFlash(reboot = true)
  │
  └─11. Disconnect
        connection.disconnect()
```

### Sync Protocol

The sync command sends a magic packet `[0x07, 0x07, 0x12, 0x20]` and waits for a response with first byte `0x55`. Up to 5 attempts are made with no delay between retries. If all attempts fail, an `UploadTimeoutError` is thrown.

### Flash Data Transfer

Each page is `1024 bytes` of firmware data. The protocol sends:
- Data size (2 bytes, little-endian)
- Sequence number (2 bytes, little-endian)
- Reserved (4 bytes, zero)
- Payload data
- Checksum (1 byte, XOR starting from `0xEF`)

## Sequence Diagram

```
EsptoolBackend          Connection          EsptoolProtocol     EspResetStrategy    EspBootMode
     |                      |                     |                    |                 |
     |--connect(baud)------>|                     |                    |                 |
     |                      |                     |                    |                 |
     |--executeReset()------|--------------------|------------------->|                 |
     |                      |   [toggle DTR/RTS]  |                    |                 |
     |<--ResetResult--------|--------------------|-------------------|                 |
     |                      |                     |                    |                 |
     |--connect(baud)------>|                     |                    |                 |
     |                      |                     |                    |                 |
     |--protocol.sync()----|-------------------->|                    |                 |
     |                      |  write sync packet  |                    |                 |
     |                      |  read 0x55 ACK     |                    |                 |
     |<--void--------------|--------------------|                    |                 |
     |                      |                     |                    |                 |
     |--executeBoot()------|--------------------|------------------------------------->|
     |<--BootResult--------|--------------------|-------------------------------------|
     |                      |                     |                    |                 |
     |--protocol.begin-----|-------------------->|                    |                 |
     |<--void--------------|--------------------|                    |                 |
     |                      |                     |                    |                 |
     |--protocol.sendData--|-------------------->|                    |                 |
     |<--void--------------|--------------------|  [per page]        |                 |
     |                      |                     |                    |                 |
     |--protocol.endFlash--|-------------------->|                    |                 |
     |<--void--------------|--------------------|                    |                 |
     |                      |                     |                    |                 |
     |--disconnect-------->|                     |                    |                 |
     |                      |                     |                    |                 |
```

## Error Handling

The `mapError()` method provides a centralized error translation layer:

| Original Error | Mapped Error | Trigger |
|---------------|--------------|---------|
| `Error` containing "port", "unavail", "not found", "busy" | `PortUnavailableError` | Port is in use or missing |
| `Error` containing "timeout" or "timed out" | `UploadTimeoutError(30000)` | Device not responding |
| `Error` containing "permission", "denied", "access" | `PermissionDeniedError` | OS permission denied |
| `Error` containing "disconnect" or "device removed" | `DeviceDisconnectedError` | USB cable pulled |
| Any other `Error` | `UploadError("UNKNOWN_ERROR")` | Unclassified failure |
| `UploadError` subclass | Returned as-is | Already typed |

## Extension Points

- **New reset strategies**: Add a handler to the `strategyHandlers` map in `EspResetStrategy.ts`
- **New boot modes**: Add a handler to `bootHandlers` in `EspBootMode.ts`
- **Custom connection types**: `HardwareManager.createConnection()` can be extended to support Bluetooth or WiFi connections
- **Progress reporting**: The backend sends granular progress updates; consumers can use `onProgress` to drive a UI progress bar

## Future Improvements

- Implement compressed flash data transfer (esptool supports compression via slip packets)
- Support for encrypted flash images
- Verify flash contents with read-back and CRC comparison
- Support for partition table and OTA partition flashing
- Stub-mode flashing for faster uploads (send minimal stub, then use stub protocol)

## Related Components

- `UploaderBackend` interface (`src/core/types/upload/backend.ts`)
- `EsptoolProtocol` (`src/core/services/upload/esp32/EsptoolProtocol.ts`)
- `EspResetStrategy` (`src/core/services/upload/esp32/EspResetStrategy.ts`)
- `EspBootMode` (`src/core/services/upload/esp32/EspBootMode.ts`)
- `ConnectionAdapter` (`src/core/types/hardware/connection.ts`)
- `HardwareManager` (`src/core/services/hardware/HardwareManager.ts`)
- `EspBoardProfile` (`src/core/types/upload/esp32/board.ts`)
