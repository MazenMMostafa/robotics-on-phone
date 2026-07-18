export interface AppSettings {
  serverUrl: string;
  theme: "light" | "dark" | "system";
  language: string;
  autoSave: boolean;
  autoSaveDelay: number;
  uploadSpeed: number;
  terminalMaxLines: number;
  logMaxLines: number;
  developerMode: boolean;
  experimentalFeatures: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  serverUrl: "http://192.168.2.11:8787",
  theme: "system",
  language: "en",
  autoSave: true,
  autoSaveDelay: 300,
  uploadSpeed: 115200,
  terminalMaxLines: 1000,
  logMaxLines: 500,
  developerMode: false,
  experimentalFeatures: false,
};
