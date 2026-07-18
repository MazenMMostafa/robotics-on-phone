import type { StorageAdapter } from "../../core/platform/types";

export class MockStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>();

  getItem<T>(key: string): T | null {
    const value = this.store.get(key);
    if (value === undefined) return null;
    try { return JSON.parse(value) as T; } catch { return null; }
  }

  setItem<T>(key: string, value: T): void {
    this.store.set(key, JSON.stringify(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
