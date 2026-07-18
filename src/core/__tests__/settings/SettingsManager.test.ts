import { describe, it, expect, beforeEach, vi } from "vitest";
import { SettingsManager } from "../../services/settings/SettingsManager";
import { DEFAULT_SETTINGS, SETTINGS_VERSION } from "../../types/settings";
import type { StorageAdapter } from "../../platform/types";
import { LoggerService } from "../../services/logging/LoggerService";

function createMockStorage(): StorageAdapter {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => {
      const v = store.get(key);
      return v ? JSON.parse(v) : null;
    }),
    setItem: vi.fn((key: string, value: unknown) => {
      store.set(key, JSON.stringify(value));
    }),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  };
}

describe("SettingsManager", () => {
  let sm: SettingsManager;
  let storage: StorageAdapter;
  let logger: LoggerService;

  beforeEach(() => {
    storage = createMockStorage();
    logger = new LoggerService();
    sm = new SettingsManager(storage, logger);
  });

  it("uses defaults when no saved settings", () => {
    sm.init();
    expect(sm.get("theme")).toBe("system");
    expect(sm.get("language")).toBe("en");
    expect(sm.get("autoSave")).toBe(true);
  });

  it("persists and restores settings", () => {
    sm.init();
    sm.set("theme", "dark");
    sm.set("language", "ar");

    const sm2 = new SettingsManager(storage, logger);
    sm2.init();
    expect(sm2.get("theme")).toBe("dark");
    expect(sm2.get("language")).toBe("ar");
  });

  it("getAll returns copy of settings", () => {
    sm.init();
    const all = sm.getAll();
    expect(all.theme).toBe("system");
    all.theme = "dark";
    expect(sm.get("theme")).toBe("system");
  });

  it("set ignores unchanged values", () => {
    sm.init();
    const result = sm.set("theme", "system");
    expect(result).toBe(true);
  });

  it("set validates using validators", () => {
    sm.init();
    sm.addValidator((key: string, value: unknown) => {
      if (key === "uploadSpeed" && value === 0) return "Speed must be > 0";
      return null;
    });
    const result = sm.set("uploadSpeed", 0 as unknown as number);
    expect(result).toBe(false);
    expect(sm.get("uploadSpeed")).toBe(DEFAULT_SETTINGS.uploadSpeed);
  });

  it("update applies multiple changes", () => {
    sm.init();
    const result = sm.update({ theme: "dark", language: "ar" });
    expect(result).toBe(true);
    expect(sm.get("theme")).toBe("dark");
    expect(sm.get("language")).toBe("ar");
  });

  it("update returns false if any value fails validation", () => {
    sm.init();
    sm.addValidator((key: string, value: unknown) => {
      if (key === "theme" && value === "dark") return "Dark not allowed";
      return null;
    });
    const result = sm.update({ theme: "dark", language: "ar" });
    expect(result).toBe(false);
    expect(sm.get("theme")).toBe("system");
  });

  it("reset restores defaults", () => {
    sm.init();
    sm.set("theme", "dark");
    sm.set("uploadSpeed", 9600);
    sm.reset();
    expect(sm.get("theme")).toBe("system");
    expect(sm.get("uploadSpeed")).toBe(115200);
  });

  it("export produces correct format", () => {
    sm.init();
    sm.set("theme", "dark");
    const exported = sm.export();
    expect(exported.version).toBe(SETTINGS_VERSION);
    expect(exported.exportedAt).toBeGreaterThan(0);
    expect(exported.settings.theme).toBe("dark");
    expect(exported.settings.language).toBe("en");
  });

  it("import restores settings", () => {
    sm.init();
    const result = sm.import({
      version: SETTINGS_VERSION,
      exportedAt: Date.now(),
      settings: { theme: "dark", language: "ar" },
    });
    expect(result).toBe(true);
    expect(sm.get("theme")).toBe("dark");
    expect(sm.get("language")).toBe("ar");
  });

  it("import rejects invalid data", () => {
    sm.init();
    const result = sm.import({} as never);
    expect(result).toBe(false);
  });

  it("applies migrations on init", () => {
    storage.setItem("app_settings", { version: 0, settings: { theme: "dark" } });
    sm.addMigration({
      fromVersion: 0,
      toVersion: 1,
      migrate: (s: Record<string, unknown>) => ({ ...s, migrated: true }),
    });
    sm.init();
    expect(sm.get("theme")).toBe("dark");
  });

  it("adds migration only for relevant range", () => {
    storage.setItem("app_settings", { version: 0, settings: { theme: "dark" } });
    const fn = vi.fn((s: Record<string, unknown>) => ({ ...s, migrated: true }));
    sm.addMigration({ fromVersion: 0, toVersion: 1, migrate: fn });
    sm.init();
    expect(fn).toHaveBeenCalled();
  });
});
