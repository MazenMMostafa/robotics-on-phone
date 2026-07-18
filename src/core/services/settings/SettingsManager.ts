import type {
  AppSettings,
  SettingsChangeEvent,
  SettingsExport,
  SettingsMigration,
  SettingsValidator,
} from "../../types/settings";
import { DEFAULT_SETTINGS, SETTINGS_KEY, SETTINGS_VERSION } from "../../types/settings";
import type { StorageAdapter } from "../../platform/types";
import type { LoggerService } from "../logging/LoggerService";
import { EventBus } from "../extension/EventBus";

export const SETTINGS_CHANGED = "settings:changed";
export const SETTINGS_RESET = "settings:reset";
export const SETTINGS_IMPORTED = "settings:imported";

export class SettingsManager {
  private current: AppSettings = { ...DEFAULT_SETTINGS };
  private storage: StorageAdapter;
  private logger: LoggerService;
  private validators: SettingsValidator[] = [];
  private migrations: SettingsMigration[] = [];
  private initialized = false;

  constructor(storage: StorageAdapter, logger: LoggerService) {
    this.storage = storage;
    this.logger = logger;
  }

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    const saved = this.storage.getItem<{ version: number; settings: Partial<AppSettings> }>(SETTINGS_KEY);
    if (saved) {
      this.current = this.applyMigrations(saved.version ?? 1, saved.settings);
    }
    this.persist();
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.current[key];
  }

  getAll(): AppSettings {
    return { ...this.current };
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): boolean {
    for (const validator of this.validators) {
      const error = validator(key, value, this.current);
      if (error) {
        this.logger.warn("SettingsManager", `Validation failed for "${String(key)}": ${error}`);
        return false;
      }
    }

    const oldValue = this.current[key];
    if (oldValue === value) return true;

    this.current = { ...this.current, [key]: value };
    this.persist();

    const event: SettingsChangeEvent = { key, oldValue, newValue: value };
    EventBus.emit(SETTINGS_CHANGED, event);
    return true;
  }

  update(partial: Partial<AppSettings>): boolean {
    for (const [key, value] of Object.entries(partial)) {
      if (!this.set(key as keyof AppSettings, value as AppSettings[keyof AppSettings])) {
        return false;
      }
    }
    return true;
  }

  reset(): void {
    this.current = { ...DEFAULT_SETTINGS };
    this.persist();
    EventBus.emit(SETTINGS_RESET, { settings: this.current });
  }

  export(): SettingsExport {
    return {
      version: SETTINGS_VERSION,
      exportedAt: Date.now(),
      settings: { ...this.current },
    };
  }

  import(data: SettingsExport): boolean {
    if (!data.version || !data.settings) {
      this.logger.warn("SettingsManager", "Invalid import data");
      return false;
    }
    const migrated = this.applyMigrations(data.version, data.settings);
    this.current = { ...DEFAULT_SETTINGS, ...migrated };
    this.persist();
    EventBus.emit(SETTINGS_IMPORTED, { settings: this.current });
    return true;
  }

  addValidator(validator: SettingsValidator): void {
    this.validators.push(validator);
  }

  addMigration(migration: SettingsMigration): void {
    this.migrations.push(migration);
  }

  onChange(listener: (event: SettingsChangeEvent) => void): () => void {
    return EventBus.on(SETTINGS_CHANGED, listener);
  }

  onReset(listener: (data: { settings: AppSettings }) => void): () => void {
    return EventBus.on(SETTINGS_RESET, listener);
  }

  private applyMigrations(savedVersion: number, saved: Partial<AppSettings>): AppSettings {
    let settings = { ...saved } as Record<string, unknown>;

    const relevant = this.migrations
      .filter((m) => m.fromVersion >= savedVersion && m.toVersion <= SETTINGS_VERSION)
      .sort((a, b) => a.fromVersion - b.fromVersion);

    for (const migration of relevant) {
      settings = migration.migrate(settings);
    }

    return { ...DEFAULT_SETTINGS, ...settings } as AppSettings;
  }

  private persist(): void {
    try {
      this.storage.setItem(SETTINGS_KEY, {
        version: SETTINGS_VERSION,
        settings: this.current,
      });
    } catch (e) {
      this.logger.error("SettingsManager", "Failed to persist settings", e);
    }
  }
}
