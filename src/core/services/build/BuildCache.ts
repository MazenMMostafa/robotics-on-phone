import type { BuildArtifact } from "../../types/build/artifact";

interface CacheEntry {
  artifact: BuildArtifact;
  cachedAt: number;
  lastAccessed: number;
}

export class BuildCache {
  private artifacts = new Map<string, CacheEntry>();
  private maxSize: number;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  private key(boardId: string, framework: string): string {
    return `${boardId}:${framework}`;
  }

  get(boardId: string, framework: string): BuildArtifact | undefined {
    const key = this.key(boardId, framework);
    const entry = this.artifacts.get(key);
    if (!entry) return undefined;
    entry.lastAccessed = Date.now();
    return { ...entry.artifact };
  }

  set(artifact: BuildArtifact): void {
    if (this.artifacts.size >= this.maxSize) {
      this.evictLRU();
    }
    const key = this.key(artifact.boardId, artifact.framework);
    this.artifacts.set(key, {
      artifact,
      cachedAt: Date.now(),
      lastAccessed: Date.now(),
    });
  }

  has(boardId: string, framework: string): boolean {
    return this.artifacts.has(this.key(boardId, framework));
  }

  remove(boardId: string, framework: string): boolean {
    return this.artifacts.delete(this.key(boardId, framework));
  }

  clear(): void {
    this.artifacts.clear();
  }

  size(): number {
    return this.artifacts.size;
  }

  entries(): BuildArtifact[] {
    return Array.from(this.artifacts.values()).map((e) => ({ ...e.artifact }));
  }

  private evictLRU(): void {
    let oldest = Infinity;
    let oldestKey: string | undefined;
    for (const [key, entry] of this.artifacts) {
      if (entry.lastAccessed < oldest) {
        oldest = entry.lastAccessed;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.artifacts.delete(oldestKey);
    }
  }
}
