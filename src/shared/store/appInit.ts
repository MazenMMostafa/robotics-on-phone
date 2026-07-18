import { container } from "../../core/di/ServiceContainer";
import type { ThemeService } from "../../core/services/theme/ThemeService";
import type { LanguageManager } from "../../core/services/i18n/LanguageManager";
import type { ErrorHandler } from "../../core/services/error/ErrorHandler";
import type { PortManager } from "../../core/services/port/PortManager";
import type { DeviceManager } from "../../core/services/device/DeviceManager";
import type { HardwareManager } from "../../core/services/hardware/HardwareManager";
import type { SettingsManager } from "../../core/services/settings/SettingsManager";
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
  const portManager = container.get<PortManager>("portManager");
  const deviceManager = container.get<DeviceManager>("deviceManager");
  const hardwareManager = container.get<HardwareManager>("hardwareManager");
  const settingsManager = container.get<SettingsManager>("settingsManager");

  settingsManager.init();
  themeService.init();
  languageManager.init();
  errorHandler.install();
  portManager.init();
  deviceManager.init();
  hardwareManager.init();

  initSettingsStore();
  initThemeStore();
  initNotificationStore();
}
