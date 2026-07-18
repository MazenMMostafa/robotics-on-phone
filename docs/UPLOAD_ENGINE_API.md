# Upload Engine API

## Contract

Every upload engine must implement the `UploadEngine` interface:

```typescript
interface UploadEngine {
  readonly id: string;       // unique identifier (e.g. "arduino-avr-v1")
  readonly name: string;     // human-readable name
  readonly version: string;  // semver version

  supports(boardId: string): boolean;
  prepare(options: UploadOptions): Promise<void>;
  upload(options: UploadOptions, onProgress?: (progress: UploadProgress) => void): Promise<UploadResult>;
  verify(options: UploadOptions): Promise<boolean>;
  cancel(): Promise<void>;
  cleanup(options: UploadOptions): Promise<void>;
}
```

## UploadOptions

```typescript
interface UploadOptions {
  boardId: string;           // e.g. "uno", "esp32", "pico"
  portId: string;            // e.g. "COM3", "/dev/ttyUSB0"
  artifactPath: string;      // path to compiled firmware binary
  baudRate?: number;         // override default baud rate
  additionalArgs?: Record<string, unknown>;  // engine-specific options
}
```

## UploadProgress (callback parameter)

```typescript
interface UploadProgress {
  stage: UploadStage;        // "idle" | "validating" | "compiling" | "preparing"
                              // | "uploading" | "verifying" | "cleaning" | "done" | "cancelled" | "error"
  percent: number;           // 0-100
  estimatedRemaining: number; // ms
  speed: number;              // bytes/sec
  messages: string[];         // user-facing status messages
  errors: string[];           // error messages (if any)
  timestamp: number;          // unix ms
}
```

## UploadResult

```typescript
interface UploadResult {
  status: "success" | "failure" | "cancelled";
  stage: string;
  message: string;
  duration: number;           // total ms
  errorCode?: string;         // e.g. "PORT_UNAVAILABLE"
  errorMessage?: string;
  bytesUploaded?: number;
  timestamp: number;
}
```

## Error Classes

| Error | Code | Recoverable | When |
|-------|------|-------------|------|
| `PortUnavailableError` | `PORT_UNAVAILABLE` | Yes | Port not found or busy |
| `BoardNotSupportedError` | `BOARD_NOT_SUPPORTED` | No | Engine doesn't support board |
| `VerificationFailedError` | `VERIFICATION_FAILED` | Yes | Firmware doesn't match |
| `CompileArtifactMissingError` | `COMPILE_ARTIFACT_MISSING` | No | Binary not found |
| `UploadTimeoutError` | `TIMEOUT` | Yes | Upload took too long |
| `PermissionDeniedError` | `PERMISSION_DENIED` | Yes | No port access |
| `DeviceDisconnectedError` | `DEVICE_DISCONNECTED` | No | Device disconnected during upload |
| `UnknownUploaderError` | `UNKNOWN_UPLOADER` | No | No engine for this board |

## Board Mapping

Each board config can declare upload metadata:

```typescript
interface BoardConfig {
  // ... existing fields ...
  preferredUploadEngine?: string;      // e.g. "arduino-avr-v1"
  supportedUploadEngines?: string[];   // e.g. ["arduino-avr-v1", "arduino-cli-v2"]
  bootloader?: string;                 // e.g. "optiboot", "uf2"
  resetStrategy?: "dtr" | "rts" | "dtr_rts" | "touch" | "none";
  verificationStrategy?: "checksum" | "compare" | "none";
}
```

## Example: Implementing an Engine

```typescript
class ArduinoAvrUploader implements UploadEngine {
  readonly id = "arduino-avr-v1";
  readonly name = "Arduino AVR Uploader";
  readonly version = "1.0.0";

  supports(boardId: string): boolean {
    return ["uno", "nano", "mega", "leonardo"].includes(boardId);
  }

  async prepare(options: UploadOptions): Promise<void> {
    // enter bootloader via DTR toggle
  }

  async upload(
    options: UploadOptions,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult> {
    // stream firmware via stk500 protocol
    // call onProgress() periodically
    return { status: "success", stage: "done", message: "OK", duration: 0, timestamp: 0 };
  }

  async verify(options: UploadOptions): Promise<boolean> {
    return true; // checksum comparison
  }

  async cancel(): Promise<void> {
    // abort serial communication
  }

  async cleanup(options: UploadOptions): Promise<void> {
    // reset device, close port
  }
}
```

## Registration

```typescript
import { UploadEngineRegistry } from "./UploadEngineRegistry";

const registry = container.get<UploadEngineRegistry>("uploadEngineRegistry");
registry.register(new ArduinoAvrUploader());
```
