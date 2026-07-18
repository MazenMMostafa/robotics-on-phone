import { create } from "zustand";
import type { AppSettings, SettingsChangeEvent } from "../../core/types/settings";
import { DEFAULT_SETTINGS } from "../../core/types/settings";
import { container } from "../../core/di/ServiceContainer";
import type { SettingsManager } from "../../core/services/settings/SettingsManager";
import { SETTINGS_CHANGED, SETTINGS_RESET } from "../../core/services/settings/SettingsManager";
import { EventBus } from "../../core/services/extension/EventBus";

interface SettingsState {
  settings: AppSettings;
  _unsubscribe: (() => void) | null;
}

export const useSettingsStore = create<SettingsState>(() => ({
  settings: DEFAULT_SETTINGS,
  _unsubscribe: null,
}));

export function initSettingsStore(): void {
  const sm = container.get<SettingsManager>("settingsManager");
  sm.init();
  useSettingsStore.setState({ settings: sm.getAll() });

  const unsubChange = EventBus.on(SETTINGS_CHANGED, (event: unknown) => {
    const { key, newValue } = event as SettingsChangeEvent;
    useSettingsStore.setState((s) => ({
      settings: { ...s.settings, [key]: newValue },
    }));
  });

  const unsubReset = EventBus.on(SETTINGS_RESET, () => {
    const sm2 = container.get<SettingsManager>("settingsManager");
    useSettingsStore.setState({ settings: sm2.getAll() });
  });

  useSettingsStore.setState({
    _unsubscribe: () => { unsubChange(); unsubReset(); },
  });
}
