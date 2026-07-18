export interface SourceArtifact {
  readonly language: string;
  readonly framework: string;
  readonly board: string;
  readonly sourceFiles: { path: string; content: string }[];
  readonly headers: { path: string; content: string }[];
  readonly assets: { path: string; content: string }[];
  readonly metadata: Record<string, string>;
  readonly checksum: string;
  readonly timestamp: number;
}

export function createSourceArtifact(params: {
  language: string;
  framework: string;
  board: string;
  sourceFiles?: { path: string; content: string }[];
  headers?: { path: string; content: string }[];
  assets?: { path: string; content: string }[];
  metadata?: Record<string, string>;
  checksum: string;
}): SourceArtifact {
  return {
    language: params.language,
    framework: params.framework,
    board: params.board,
    sourceFiles: params.sourceFiles ?? [],
    headers: params.headers ?? [],
    assets: params.assets ?? [],
    metadata: params.metadata ?? {},
    checksum: params.checksum,
    timestamp: Date.now(),
  };
}
