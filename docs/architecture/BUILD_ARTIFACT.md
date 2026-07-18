# Build Artifact

## Interface

```typescript
interface BuildArtifact {
  readonly boardId: string;
  readonly framework: string;
  readonly firmwarePath: string;      // primary binary/hex path
  readonly hexPath?: string;          // Intel HEX format
  readonly binPath?: string;          // raw binary format
  readonly elfPath?: string;          // ELF with debug symbols
  readonly mapPath?: string;          // linker map file
  readonly size: number;              // bytes
  readonly checksum: string;          // integrity hash
  readonly timestamp: number;         // creation time
}
```

## Factory

```typescript
function createBuildArtifact(params: {
  boardId: string;
  framework: string;
  firmwarePath: string;
  size: number;
  checksum: string;
}): BuildArtifact;
```

The factory sets `timestamp` to `Date.now()` and leaves optional paths undefined.

## Integration with Upload Framework

Build Artifacts are consumed by the Upload Framework via `UploadOptions.artifactPath`:

```typescript
// BuildManager → BuildArtifact → UploadManager
const artifact = buildManager.getCachedArtifact("esp32", "esp-idf");
if (artifact) {
  const uploadResult = await uploadManager.start({
    boardId: artifact.boardId,
    portId: "/dev/ttyUSB0",
    artifactPath: artifact.firmwarePath,      // <-- bridge
  });
}
```

## Caching

- In-memory LRU cache (`BuildCache`) with configurable max size (default 50)
- Keyed by `boardId:framework`
- Evicts least-recently-accessed entry when full
- Cleared on `BuildManager.clearCache()`
