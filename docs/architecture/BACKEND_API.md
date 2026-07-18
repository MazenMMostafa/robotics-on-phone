# Backend API Reference

## UploaderBackend Interface

Every upload backend must implement the `UploaderBackend` interface defined in `src/core/types/upload/backend.ts`.

```typescript
interface UploaderBackend {
  readonly id: string;
  readonly name: string;
  readonly version: string;

  detect(): Promise<ToolchainInfo>;
  validate(options: UploadOptions): Promise<BackendValidationResult>;
  execute(
    options: UploadOptions,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult>;
  verify(options: UploadOptions): Promise<boolean>;
  cancel(): Promise<void>;
  cleanup(options: UploadOptions): Promise<void>;
}
```

## Metadata Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique backend identifier (e.g. `"avrdude-v1"`) |
| `name` | `string` | Human-readable display name (e.g. `"AVR Dude"`) |
| `version` | `string` | Semver version string (e.g. `"1.0.0"`) |

---

## Methods

### `detect()`

Detects whether the backend's toolchain is available on the system.

**Returns:** `Promise<ToolchainInfo>`

```typescript
interface ToolchainInfo {
  id: string;
  name: string;
  version: string;
  status: ToolchainStatus;         // "installed" | "missing" | "outdated" | "unsupported" | "broken"
  installPath?: string;            // Path to installed tool (if applicable)
  supportedBoards: string[];       // List of board IDs this backend supports
  detectedAt?: number;             // Timestamp of detection
  error?: string;                  // Error message if status is not "installed"
}
```

**Usage:**

```typescript
const info = await backend.detect();
if (info.status === "installed") {
  console.log(`${info.name} v${info.version} supports: ${info.supportedBoards}`);
}
```

**Implementation Notes:**
- Should perform actual system checks (binary existence, version check, permissions)
- Results are cached by `ToolchainManager` (default 60s TTL)
- Return `status: "installed"` if toolchain is ready, `"missing"` if not found

---

### `validate(options)`

Validates that the given options are sufficient for a successful upload.

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `options` | `UploadOptions` | Upload configuration |

```typescript
interface UploadOptions {
  boardId: string;
  portId: string;
  artifactPath: string;
  baudRate?: number;
  additionalArgs?: Record<string, unknown>;
}
```

**Returns:** `Promise<BackendValidationResult>`

```typescript
interface BackendValidationResult {
  valid: boolean;
  errors?: string[];
}
```

**Example:**

```typescript
const result = await backend.validate({ boardId: "uno", portId: "/dev/ttyUSB0", artifactPath: "/tmp/build.hex" });
if (!result.valid) {
  console.error(result.errors?.join(", "));
}
```

**Typical Validation Checks:**
- Board is supported by this backend
- Port is specified and non-empty
- Artifact path is specified and non-empty
- Artifact file exists (when applicable)

---

### `execute(options, onProgress?)`

Performs the actual upload operation.

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `options` | `UploadOptions` | Upload configuration |
| `onProgress` | `(progress: UploadProgress) => void` | Optional progress callback |

**Returns:** `Promise<UploadResult>`

```typescript
interface UploadResult {
  status: UploadResultStatus;   // "success" | "failure" | "cancelled"
  stage: string;                // Current stage when result was produced
  message: string;              // Human-readable result message
  duration: number;             // Execution time in milliseconds
  errorCode?: string;           // Machine-readable error code
  errorMessage?: string;        // Detailed error message
  bytesUploaded?: number;       // Bytes transferred (success only)
  timestamp: number;            // When the result was produced
}
```

**Implementation Pattern:**

```typescript
async execute(options: UploadOptions, onProgress?: (progress: UploadProgress) => void): Promise<UploadResult> {
  this.cancelled = false;           // Reset cancellation flag
  const startTime = Date.now();

  // 1. Connect to device
  await connection.connect({ baudRate });

  // 2. Execute flash protocol
  for (let page = 0; page < totalPages; page++) {
    if (this.cancelled) break;       // Cooperative cancellation
    await protocol.programPage(data, size);
    onProgress?.({ stage: "uploading", percent: ..., ... });
  }

  // 3. Handle cancellation
  if (this.cancelled) {
    await protocol.leaveProgrammingMode();
    await connection.disconnect();
    return { status: "cancelled", ... };
  }

  // 4. Complete
  await connection.disconnect();
  return { status: "success", duration: Date.now() - startTime, ... };
}
```

**Cancellation Protocol:**
- Must reset `this.cancelled = false` at start of `execute()`
- Must periodically check `this.cancelled` during long operations
- When cancelled, should perform graceful cleanup (leave programming mode, disconnect)
- Caller calls `cancel()` which sets the flag; `execute()` checks it cooperatively

**Error Handling:**
- Wrap operations in try/catch
- Return typed errors using `UploadError` subclasses (see below)
- Always attempt disconnect on error before throwing

---

### `verify(options)`

Verifies the device after upload, typically by reading the MCU signature.

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `options` | `UploadOptions` | Upload configuration (uses boardId, portId, baudRate) |

**Returns:** `Promise<boolean>`

- `true` - Signature matches expected value, upload verified
- `false` - Signature mismatch or verification could not be performed

**Implementation Example (AVR):**

```typescript
async verify(options: UploadOptions): Promise<boolean> {
  const profile = getAvrBoardProfile(options.boardId);
  if (!profile) return false;

  const connection = this.hardwareManager.createConnection("usb");
  try {
    await connection.connect({ baudRate });
    const protocol = new STK500V1Protocol(connection, this.logger);
    await protocol.sync();
    await protocol.enterProgrammingMode();
    const sig = await protocol.readSignature();
    await protocol.leaveProgrammingMode();
    await connection.disconnect();

    return sig.length === profile.signature.length &&
      sig.every((b, i) => b === profile.signature[i]);
  } catch {
    await connection.disconnect().catch(() => {});
    return false;
  }
}
```

---

### `cancel()`

Requests cancellation of an in-progress upload.

**Returns:** `Promise<void>`

**Implementation:**

```typescript
async cancel(): Promise<void> {
  this.cancelled = true;   // The execute() loop checks this flag
}
```

**Notes:**
- This is a cooperative mechanism; execution stops at the next cancelled check
- May be called before `execute()` (flag is then reset when `execute()` starts)
- Primary use case: cancellation during the page-programming loop

---

### `cleanup(options)`

Releases any resources held by the backend after an upload completes.

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `options` | `UploadOptions` | Upload configuration |

**Returns:** `Promise<void>`

**Implementation:**

```typescript
async cleanup(options: UploadOptions): Promise<void> {
  // Disconnect any lingering connections
  const connection = this.hardwareManager.createConnection("usb");
  try {
    await connection.disconnect();
  } catch {
    // ignore cleanup errors
  }
}
```

---

## Error Classes

All error classes extend `UploadError` and are defined in `src/core/types/upload/error.ts`.

| Error Class | Code | When Thrown | Recoverable |
|------------|------|-------------|-------------|
| `PortUnavailableError` | `PORT_UNAVAILABLE` | Port not found, busy, or unavailable | Yes |
| `BoardNotSupportedError` | `BOARD_NOT_SUPPORTED` | Board ID not recognized by engine | No |
| `VerificationFailedError` | `VERIFICATION_FAILED` | Post-upload signature mismatch | Yes |
| `CompileArtifactMissingError` | `COMPILE_ARTIFACT_MISSING` | Hex file not found | No |
| `UploadTimeoutError` | `TIMEOUT` | Device not responding within timeout | Yes |
| `PermissionDeniedError` | `PERMISSION_DENIED` | No permission to access port | Yes |
| `DeviceDisconnectedError` | `DEVICE_DISCONNECTED` | Device removed during upload | No |
| `UnknownUploaderError` | `UNKNOWN_UPLOADER` | No engine for given board | No |
| `ToolNotInstalled` | `TOOL_NOT_INSTALLED` | Required toolchain binary missing | No |
| `ToolVersionMismatch` | `TOOL_VERSION_MISMATCH` | Tool version doesn't meet requirements | No |
| `ToolExecutionFailed` | `TOOL_EXECUTION_FAILED` | Tool process exited with error | Yes |
| `InvalidArguments` | `INVALID_ARGUMENTS` | Upload options fail validation | No |
| `BackendUnavailable` | `BACKEND_UNAVAILABLE` | Required backend not registered | No |

```typescript
class UploadError extends Error {
  readonly code: string;
  readonly recoverable: boolean;
  readonly details: Record<string, unknown>;

  constructor(code: string, message: string, recoverable = false, details = {});
}
```

**Usage in Backends:**

```typescript
private mapError(error: unknown, portId: string): Error {
  if (error instanceof UploadError) return error;

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("port") && (lower.includes("unavail") || lower.includes("not found") || lower.includes("busy"))) {
    return new PortUnavailableError(portId, message);
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return new UploadTimeoutError(30000);
  }
  // ... additional mappings

  return new UploadError("UNKNOWN_ERROR", message, true, { portId });
}
```

---

## AvrdudeBackend Implementation

The `AvrdudeBackend` is the production AVR programming backend.

**Class:** `src/core/services/upload/backends/AvrdudeBackend.ts`

**Identity:**
- `id`: `"avrdude-v1"`
- `name`: `"AVR Dude"`
- `version`: `"1.0.0"`

**Supported Boards:** `uno`, `nano`, `mega`

**Constructor Dependencies:**

| Dependency | Type | Purpose |
|------------|------|---------|
| `hardwareManager` | `HardwareManager` | Creates USB connections |
| `logger` | `LoggerService` | Structured logging |

**Protocol Selection:**

The backend selects `STK500V1Protocol` or `STK500V2Protocol` based on the board profile:

| Board | Protocol |
|-------|----------|
| uno | STK500V1 |
| nano | STK500V1 |
| mega | STK500V2 |

**Additional Method:** `prepareReset(options)`

Connects at the board's reset baud rate (1200 for AVR boards) to trigger bootloader mode, then disconnects and waits for the bootloader to become active. This is used during the prepare phase to get the device into programming mode.

**Progress Reporting:**

| Progress Range | Stage | Description |
|---------------|-------|-------------|
| 0% | preparing | Reset sequence |
| 30% | uploading | Connected to device |
| 35% | uploading | Synchronizing with bootloader |
| 40% | uploading | Entering programming mode |
| 45-85% | uploading | Programming pages (per-page reporting) |
| 85% | uploading | Leaving programming mode |

---

## MockBackend Implementation

The `MockBackend` is a test double for unit testing.

**Class:** `src/core/services/upload/backends/MockBackend.ts`

**Identity:**
- `id`: configurable via constructor (default `"mock-v1"`)
- `name`: configurable via constructor (default `"Mock Backend"`)
- `version`: `"1.0.0"`

**Constructor:** `MockBackend(supportedBoards?, id?, name?)`

**Test Controls:**

| Method | Description |
|--------|-------------|
| `setSimulateFailure(true)` | Causes `execute` and `verify` to return failure |
| `setSimulateDelay(ms)` | Adds artificial delay before `execute` returns |
| `cancel()` | Sets cancellation flag |

**Behavior:**

| State | `execute()` | `verify()` |
|-------|------------|------------|
| Default | `status: "success"` | `true` |
| Cancelled | `status: "cancelled"` | N/A |
| Failure mode | `status: "failure"` | `false` |
