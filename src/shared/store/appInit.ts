import { container } from "../../core/di/ServiceContainer";
import type { ThemeService } from "../../core/services/theme/ThemeService";
import type { LanguageManager } from "../../core/services/i18n/LanguageManager";
import type { ErrorHandler } from "../../core/services/error/ErrorHandler";
import { initSettingsStore } from "./settingsStore";
import { initThemeStore } from "./themeStore";
import { initNotificationStore } from "./notificationStore";

let initialized = false;

export function initializeApp(): void {
  if (initialized) return;
  initialized = true;

  const themeService = container.get<ThemeService>("themeService");
  const languageManager = container.get<LanguageManager>("languageManager");
  const errorHandler = container.get<ErrorHandler>("errorHandler");

  themeService.init();
  languageManager.init();
  errorHandler.install();

  initSettingsStore();
  initThemeStore();
  initNotificationStore();
}
