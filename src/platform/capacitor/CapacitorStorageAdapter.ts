import type { StorageAdapter } from "../../core/platform/types";

export class CapacitorStorageAdapter implements StorageAdapter {
  getItem<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  }

  setItem<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }
}

export const capacitorStorageAdapter = new CapacitorStorageAdapter();
