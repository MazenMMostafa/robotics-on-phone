# Upload Pipeline

Every upload engine follows the same lifecycle, managed by `UploadManager.doUpload()`.

```
  ┌─────────────┐
  │   IDLE      │
  └──────┬──────┘
         │ start() called
         ▼
  ┌─────────────┐     ┌───────────────────────┐
  │  VALIDATE   │────▶│ Board supported?      │
  └─────────────┘     │ Engine found?         │
         │            │ Artifact exists?      │
         ▼            └───────────────────────┘
  ┌─────────────┐              │
  │  COMPILE    │◀─────────────┘ if valid
  │  ARTIFACT   │
  │  LOOKUP     │
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │  PREPARE    │────▶ engine.prepare()
  │  DEVICE     │      - Enter bootloader
  └──────┬──────┘      - Set baud rate
         │             - Configure reset
         ▼
  ┌─────────────┐
  │   UPLOAD    │────▶ engine.upload()
  │             │      - Stream firmware
  │  ████████   │      - Progress callbacks
  │  73%        │      - Error handling
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │  VERIFY     │────▶ engine.verify()
  │             │      - Checksum
  └──────┬──────┘      - Compare
         │             - Read back
         ▼
  ┌─────────────┐
  │  CLEANUP    │────▶ engine.cleanup()
  │             │      - Reset device
  └──────┬──────┘      - Release port
         │             - Restore state
         ▼
  ┌─────────────┐     ┌───────────────────────┐
  │   RESULT    │     │ success / failure     │
  │             │     │ cancelled             │
  └─────────────┘     └───────────────────────┘
```

## Stage Details

### 1. Validating (5%)
- Check that engine supports the board ID
- Verify options are complete

### 2. Compile Artifact Lookup (10%)
- Verify the compile artifact exists at the given path
- Future: locate artifact from compiler output

### 3. Preparing Device (20%)
- Call `engine.prepare(options)`
- Enter bootloader mode if required
- Configure serial/communication parameters
- Emit `upload:preparing` event

### 4. Uploading (30% → 85%)
- Call `engine.upload(options, onProgress)`
- Engine calls `onProgress()` to report real-time progress
- UploadManager forwards progress via `upload:progress` events
- Progress includes: stage, percent, estimated remaining, speed, messages

### 5. Verifying (85% → 95%)
- Call `engine.verify(options)`
- Checksum comparison, read-back verification, or other strategy
- Emit `upload:verifying` event

### 6. Cleanup (95% → 100%)
- Call `engine.cleanup(options)`
- Release device, reset to normal mode, close connection

### 7. Result
- Success: emit `upload:finished` with result
- Failure: emit `upload:failed` with error
- Cancelled: emit `upload:cancelled` with progress snapshot

## Error Handling

Any exception during the pipeline is caught at the `doUpload` level:
1. Progress stage set to "error"
2. Error message recorded in progress.errors[]
3. `upload:failed` event emitted with error details
4. Status set to "error"
5. Exception re-thrown to caller

## Queue

The UploadManager supports a simple FIFO queue:
- `enqueue(options)` adds to queue, emits `upload:queued`
- `processQueue()` processes items sequentially
- Each item is started via `start()` which may throw; errors are logged and the queue continues
