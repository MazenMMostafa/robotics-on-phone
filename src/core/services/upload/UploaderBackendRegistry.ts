import type { UploaderBackend } from "../../types/upload/backend";

export class UploaderBackendRegistry {
  private backends: UploaderBackend[] = [];

  register(backend: UploaderBackend): void {
    const existing = this.backends.findIndex((b) => b.id === backend.id);
    if (existing >= 0) {
      this.backends[existing] = backend;
    } else {
      this.backends.push(backend);
    }
  }

  registerMany(backends: UploaderBackend[]): void {
    for (const b of backends) {
      this.register(b);
    }
  }

  findForBoard(_boardId: string): UploaderBackend | undefined {
    const candidates = this.backends.filter(() => true);
    return candidates[0];
  }

  findAllForBoard(_boardId: string): UploaderBackend[] {
    return [...this.backends];
  }

  getById(backendId: string): UploaderBackend | undefined {
    return this.backends.find((b) => b.id === backendId);
  }

  getAvailable(): UploaderBackend[] {
    return [...this.backends];
  }

  remove(backendId: string): void {
    this.backends = this.backends.filter((b) => b.id !== backendId);
  }

  clear(): void {
    this.backends = [];
  }

  count(): number {
    return this.backends.length;
  }
}
