# Source Artifact

## Interface

```typescript
interface SourceArtifact {
  readonly language: string;           // target language
  readonly framework: string;          // framework identifier
  readonly board: string;              // target board
  readonly sourceFiles: { path: string; content: string }[];  // generated source code
  readonly headers: { path: string; content: string }[];      // header/declaration files
  readonly assets: { path: string; content: string }[];       // supporting asset files
  readonly metadata: Record<string, string>;                   // build metadata (version, flags)
  readonly checksum: string;           // integrity hash
  readonly timestamp: number;          // creation time
}
```

## Factory

```typescript
function createSourceArtifact(params: {
  language: string;
  framework: string;
  board: string;
  sourceFiles?: { path: string; content: string }[];
  headers?: { path: string; content: string }[];
  assets?: { path: string; content: string }[];
  metadata?: Record<string, string>;
  checksum: string;
}): SourceArtifact;
```

Defaults: `sourceFiles`, `headers`, `assets` default to `[]`; `metadata` defaults to `{}`.

## Integration with Build System

Source Artifacts flow into the Build System to produce firmware:

```
SourceArtifact → Build System (compilation) → BuildArtifact → Upload System
```

## Validation

The validation pipeline checks:

- **Workspace completeness** — all required blocks present
- **Missing blocks** — referenced but undefined blocks
- **Unsupported blocks** — blocks not supported by target language
- **Board compatibility** — board supports selected language/framework
- **Extension compatibility** — required extensions are loaded
