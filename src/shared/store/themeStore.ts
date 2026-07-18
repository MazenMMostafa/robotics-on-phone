import { create } from "zustand";
import { container } from "../../core/di/ServiceContainer";
import type { ThemeService, ThemeMode } from "../../core/services/theme/ThemeService";
import { THEME_CHANGED } from "../../core/services/theme/ThemeService";
import { EventBus } from "../../core/services/extension/EventBus";

interface ThemeState {
  mode: ThemeMode;
  theme: "light" | "dark";
}

export const useThemeStore = create<ThemeState>(() => ({
  mode: "system",
  theme: "light",
}));

export function initThemeStore(): void {
  const ts = container.get<ThemeService>("themeService");
  useThemeStore.setState({ mode: ts.getMode(), theme: ts.getCurrentTheme() });

  EventBus.on(THEME_CHANGED, (data: unknown) => {
    const { theme } = data as { theme: "light" | "dark" };
    const ts2 = container.get<ThemeService>("themeService");
    useThemeStore.setState({ mode: ts2.getMode(), theme });
  });
}
