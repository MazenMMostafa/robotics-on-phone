import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings } from "../../../core/types/settings";
import { DEFAULT_SETTINGS } from "../../../core/types/settings";

interface SettingsStore extends AppSettings {
  setServerUrl: (url: string) => void;
  setTheme: (theme: AppSettings["theme"]) => void;
  setLanguage: (lang: string) => void;
  setAutoSave: (v: boolean) => void;
  setAutoSaveDelay: (v: number) => void;
  setUploadSpeed: (v: number) => void;
  setTerminalMaxLines: (v: number) => void;
  setLogMaxLines: (v: number) => void;
  setDeveloperMode: (v: boolean) => void;
  setExperimentalFeatures: (v: boolean) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setServerUrl: (serverUrl) => set({ serverUrl }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setAutoSaveDelay: (autoSaveDelay) => set({ autoSaveDelay }),
      setUploadSpeed: (uploadSpeed) => set({ uploadSpeed }),
      setTerminalMaxLines: (terminalMaxLines) => set({ terminalMaxLines }),
      setLogMaxLines: (logMaxLines) => set({ logMaxLines }),
      setDeveloperMode: (developerMode) => set({ developerMode }),
      setExperimentalFeatures: (experimentalFeatures) => set({ experimentalFeatures }),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    { name: "NewBeginMakes.settings.v1" },
  ),
);
