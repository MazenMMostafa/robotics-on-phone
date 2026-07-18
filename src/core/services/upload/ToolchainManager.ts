import type { ToolchainInfo } from "../../types/upload/toolchain";
import type { UploaderBackend } from "../../types/upload/backend";

export interface ToolchainRecord {
  backendId: string;
  info: ToolchainInfo;
  lastChecked: number;
}

export class ToolchainManager {
  private cache = new Map<string, ToolchainRecord>();
  private ttl = 60000;

  setTtl(ms: number): void {
    this.ttl = ms;
  }

  async detect(backend: UploaderBackend): Promise<ToolchainInfo> {
    const cached = this.cache.get(backend.id);
    if (cached && Date.now() - cached.lastChecked < this.ttl) {
      return cached.info;
    }

    const info = await backend.detect();
    this.cache.set(backend.id, {
      backendId: backend.id,
      info,
      lastChecked: Date.now(),
    });
    return info;
  }

  async detectAll(backends: UploaderBackend[]): Promise<Map<string, ToolchainInfo>> {
    const results = new Map<string, ToolchainInfo>();
    const promises = backends.map(async (b) => {
      const info = await this.detect(b);
      results.set(b.id, info);
    });
    await Promise.all(promises);
    return results;
  }

  getCached(id: string): ToolchainInfo | undefined {
    return this.cache.get(id)?.info;
  }

  isAvailable(info: ToolchainInfo): boolean {
    return info.status === "installed" || info.status === "outdated";
  }

  invalidate(id: string): void {
    this.cache.delete(id);
  }

  clearCache(): void {
    this.cache.clear();
  }
}
