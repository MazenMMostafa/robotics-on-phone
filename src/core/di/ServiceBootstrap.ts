import { container } from "./ServiceContainer";
import { BoardService } from "../services/board/BoardService";
import { ComponentService } from "../services/component/ComponentService";
import { ValidationService } from "../services/validation/ValidationService";
import { ExtensionManager } from "../services/extension/ExtensionManager";
import { EventBus } from "../services/extension/EventBus";
import { BlockRegistry } from "../services/extension/BlockRegistry";
import { GeneratorRegistry } from "../services/extension/GeneratorRegistry";
import { CategoryRegistry } from "../services/extension/CategoryRegistry";
import { ComponentRegistry } from "../services/extension/ComponentRegistry";
import { ValidationRegistry } from "../services/extension/ValidationRegistry";
import { LibraryRegistry } from "../services/extension/LibraryRegistry";
import { ExampleRegistry } from "../services/extension/ExampleRegistry";
import { AssetRegistry } from "../services/extension/AssetRegistry";
import { CommandRegistry } from "../services/extension/CommandRegistry";
import { usbService } from "../services/usb/UsbService";
import { capacitorStorageAdapter } from "../../platform/capacitor/CapacitorStorageAdapter";
import { capacitorCompilerAdapter } from "../../platform/capacitor/CapacitorCompilerAdapter";
import { capacitorFileAdapter } from "../../platform/capacitor/CapacitorFileAdapter";

// Phase 7 services
import { logger } from "../services/logging/LoggerService";
import { SettingsManager } from "../services/settings/SettingsManager";
import { ThemeService } from "../services/theme/ThemeService";
import { LanguageManager } from "../services/i18n/LanguageManager";
import { NotificationService } from "../services/notification/NotificationService";
import { DialogService } from "../services/dialog/DialogService";
import { ErrorHandler } from "../services/error/ErrorHandler";

export function bootstrapContainer(): void {
  // Platform adapters
  container.registerInstance("storage", capacitorStorageAdapter);
  container.registerInstance("compiler", capacitorCompilerAdapter);
  container.registerInstance("file", capacitorFileAdapter);

  // Phase 7 - Logging
  container.registerInstance("logger", logger);

  // Phase 7 - Settings
  const settingsManager = new SettingsManager(capacitorStorageAdapter, logger);
  container.registerInstance("settingsManager", settingsManager);

  // Phase 7 - Theme
  const themeService = new ThemeService(logger);
  container.registerInstance("themeService", themeService);

  // Phase 7 - Localization
  const languageManager = new LanguageManager(logger);
  container.registerInstance("languageManager", languageManager);

  // Phase 7 - Notifications
  const notificationService = new NotificationService();
  container.registerInstance("notificationService", notificationService);

  // Phase 7 - Dialogs
  const dialogService = new DialogService(logger);
  container.registerInstance("dialogService", dialogService);

  // Phase 7 - Error Handler
  const errorHandler = new ErrorHandler(logger, notificationService);
  container.registerInstance("errorHandler", errorHandler);

  // Core registries (extension system)
  container.registerInstance("eventBus", EventBus);
  container.registerInstance("blockRegistry", BlockRegistry);
  container.registerInstance("generatorRegistry", GeneratorRegistry);
  container.registerInstance("categoryRegistry", CategoryRegistry);
  container.registerInstance("componentRegistry", ComponentRegistry);
  container.registerInstance("validationRegistry", ValidationRegistry);
  container.registerInstance("libraryRegistry", LibraryRegistry);
  container.registerInstance("exampleRegistry", ExampleRegistry);
  container.registerInstance("assetRegistry", AssetRegistry);
  container.registerInstance("commandRegistry", CommandRegistry);

  // Core managers
  container.registerInstance("extensionManager", ExtensionManager);

  // Core services
  container.registerInstance("boardService", BoardService);
  container.registerInstance("componentService", ComponentService);
  container.registerInstance("validationService", ValidationService);
  container.registerInstance("usbService", usbService);

  // Platform adapter registration for mockability
  container.register({
    name: "usbAdapter",
    factory: () => container.get<typeof usbService>("usbService"),
    singleton: true,
  });
}
