# ESP32 Upload Engine

## Architecture Overview

The ESP32 Upload Engine (`Esp32UploadEngine`) is a production-ready upload engine that implements the `UploadEngine` interface for ESP32-family microcontrollers. It delegates all hardware communication to the `EsptoolBackend`, which is resolved at runtime via the `UploaderBackendRegistry`.

The engine supports four chip variants: ESP32, ESP32-S2, ESP32-S3, and ESP32-C3. Each variant has a dedicated board profile that defines flash parameters, reset strategy, and boot mode.

## Responsibilities

- Register and expose ESP32 upload capability under the engine ID `arduino-esp32-v1`
- Validate board compatibility (`supports` / `prepare`)
- Orchestrate the full upload lifecycle via `upload()`
- Provide `verify()` for post-flash chip identity checks
- Propagate `cancel()` and `cleanup()` to the underlying backend
- Map backend errors into typed upload errors

## Public API

```typescript
class Esp32UploadEngine implements UploadEngine {
  readonly id = "arduino-esp32-v1";
  readonly name = "Arduino ESP32 Uploader";
  readonly version = "1.0.0";

  supports(boardId: string): boolean;
  prepare(options: UploadOptions): Promise<void>;
  upload(options: UploadOptions, onProgress?: UploadProgressCallback): Promise<UploadResult>;
  verify(options: UploadOptions): Promise<boolean>;
  cancel(): Promise<void>;
  cleanup(options: UploadOptions): Promise<void>;
}
```

### `supports(boardId)`

Returns `true` for known ESP32 board IDs (`esp32`, `esp32-s2`, `esp32-s3`, `esp32-c3`). Delegates to `isEspBoard()` from the board profile module.

### `upload(options, onProgress?)`

The main upload flow:
1. Looks up the board profile via `getEspBoardProfile()`
2. Finds the registered backend (`esptool-v1`) in `UploaderBackendRegistry`
3. Validates options via `backend.validate()`
4. Calls `backend.execute()` which performs the full flash sequence
5. Returns a typed `UploadResult` (`success` | `cancelled` | `failure`)

## Internal Workflow

```
upload() ──> getEspBoardProfile()
        ├── UploaderBackendRegistry.get("esptool-v1")
        ├── backend.validate(options)
        └── backend.execute(options, onProgress)
              ├── connect at flash speed
              ├── executeReset (enter bootloader)
              ├── protocol.sync()
              ├── executeBoot (confirm boot mode)
              ├── protocol.detectChip()
              ├── protocol.beginFlash()
              ├── protocol.sendData() [per page]
              ├── protocol.endFlash()
              └── disconnect
```

## Sequence Diagram

```
User              Esp32UploadEngine       UploaderBackendRegistry       EsptoolBackend
 |                        |                         |                       |
 |--upload(options)------>|                         |                       |
 |                        |--detect()--------------->|                       |
 |                        |<-ToolchainInfo----------|                       |
 |                        |                         |                       |
 |                        |--get("esptool-v1")----->|                       |
 |                        |<-backend----------------|                       |
 |                        |                         |                       |
 |                        |--validate(options)------|---------------------->|
 |                        |<-BackendValidationResult|<---------------------|
 |                        |                         |                       |
 |                        |--execute(options)-------|---------------------->|
 |                        |                         |    [flash sequence]   |
 |                        |<-UploadResult-----------|<---------------------|
 |<-result----------------|                         |                       |
```

## Error Handling

| Error Type | Source | Mapping |
|------------|--------|---------|
| `BackendUnavailable` | No backend registered | Thrown when `registry.get()` returns undefined |
| `InvalidArguments` | Board/port/artifact validation | Thrown if any required option is missing or unsupported |
| `PortUnavailableError` | Port busy / not found | Mapped by backend from connection errors |
| `UploadTimeoutError` | Device not responding | Mapped when sync or flash operations time out |
| `PermissionDeniedError` | OS access denied | Mapped from permission-related errors |
| `DeviceDisconnectedError` | USB pulled during flash | Mapped from disconnection errors |

## Extension Points

- **New chip profiles**: Add entries to `ESP_BOARD_PROFILES` in `board.ts`
- **Custom backends**: Register an alternative backend under a different ID; the engine will use whatever backend is registered for `esptool-v1`
- **Progress monitoring**: The `onProgress` callback receives stage/percent/messages throughout the flash pipeline

## Future Improvements

- Support for ESP8266 via extended board profiles (Phase 10B)
- OTA (Over-the-Air) upload support
- WiFi / Bluetooth-based upload for wireless flashing
- Dual-core / flash partition configuration support
- Compressed flash data transfer for faster uploads

## Related Components

- `UploadEngine` interface (`src/core/services/upload/UploadEngine.ts`)
- `UploaderBackendRegistry` (`src/core/services/upload/UploaderBackendRegistry.ts`)
- `EspBoardProfile` types (`src/core/types/upload/esp32/board.ts`)
- `EsptoolBackend` (`src/core/services/upload/backends/EsptoolBackend.ts`)
- `ServiceBootstrap` (`src/core/di/ServiceBootstrap.ts`)
