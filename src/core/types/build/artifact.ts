export interface BuildArtifact {
  readonly boardId: string;
  readonly framework: string;
  readonly firmwarePath: string;
  readonly hexPath?: string;
  readonly binPath?: string;
  readonly elfPath?: string;
  readonly mapPath?: string;
  readonly size: number;
  readonly checksum: string;
  readonly timestamp: number;
}

export function createBuildArtifact(params: {
  boardId: string;
  framework: string;
  firmwarePath: string;
  size: number;
  checksum: string;
}): BuildArtifact {
  return {
    boardId: params.boardId,
    framework: params.framework,
    firmwarePath: params.firmwarePath,
    size: params.size,
    checksum: params.checksum,
    timestamp: Date.now(),
  };
}
