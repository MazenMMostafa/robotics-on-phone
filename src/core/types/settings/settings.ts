export const SETTINGS_VERSION = 1;
export const SETTINGS_KEY = "app_settings";

export interface AppSettings {
  // General
  serverUrl: string;
  language: string;
  autoSave: boolean;
  autoSaveDelay: number;

  // Editor
  terminalMaxLines: number;
  logMaxLines: number;
  showGeneratedCode: boolean;
  confirmBeforeUpload: boolean;

  // Blockly
  snapRadius: number;
  trashCan: boolean;
  sounds: boolean;
  gridVisible: boolean;

  // Compiler
  uploadSpeed: number;
  compilerTimeout: number;
  verboseCompile: boolean;

  // Upload
  autoDetectBoard: boolean;
  uploadRetries: number;

  // Appearance
  theme: "light" | "dark" | "system";
  animations: boolean;
  compactMode: boolean;
  reducedMotion: boolean;

  // Developer
  developerMode: boolean;
  verboseLogs: boolean;
  showDiagnostics: boolean;
  enableDevTools: boolean;

  // Experimental
  experimentalFeatures: boolean;
  enableCloudSync: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  // General
  serverUrl: "http://192.168.2.11:8787",
  language: "en",
  autoSave: true,
  autoSaveDelay: 300,

  // Editor
  terminalMaxLines: 1000,
  logMaxLines: 500,
  showGeneratedCode: false,
  confirmBeforeUpload: true,

  // Blockly
  snapRadius: 0,
  trashCan: true,
  sounds: true,
  gridVisible: false,

  // Compiler
  uploadSpeed: 115200,
  compilerTimeout: 30000,
  verboseCompile: false,

  // Upload
  autoDetectBoard: true,
  uploadRetries: 3,

  // Appearance
  theme: "system",
  animations: true,
  compactMode: false,
  reducedMotion: false,

  // Developer
  developerMode: false,
  verboseLogs: false,
  showDiagnostics: false,
  enableDevTools: false,

  // Experimental
  experimentalFeatures: false,
  enableCloudSync: false,
};

export interface SettingsValidator {
  (key: string, value: unknown, current: AppSettings): string | null;
}

export interface SettingsChangeEvent {
  key: keyof AppSettings;
  oldValue: unknown;
  newValue: unknown;
}

export interface SettingsExport {
  version: number;
  exportedAt: number;
  settings: Partial<AppSettings>;
}

export interface SettingsMigration {
  fromVersion: number;
  toVersion: number;
  migrate(settings: Record<string, unknown>): Record<string, unknown>;
}
