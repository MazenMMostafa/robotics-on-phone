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

// Phase 8 services
import { PortManager } from "../services/port/PortManager";
import { DeviceManager } from "../services/device/DeviceManager";
import { HardwareManager } from "../services/hardware/HardwareManager";
import { CompatibilityService } from "../services/compatibility/CompatibilityService";
import { capacitorUsbAdapter } from "../../platform/capacitor/CapacitorUsbAdapter";

// Phase 9A services
import { UploadEngineRegistry, UploadManager } from "../services/upload";

export function bootstrapContainer(): void {
  // Platform adapters
  container.registerInstance("storage", capacitorStorageAdapter);
  container.registerInstance("compiler", capacitorCompilerAdapter);
  container.registerInstance("file", capacitorFileAdapter);
  container.registerInstance("usbAdapter", capacitorUsbAdapter);

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

  // Phase 8 - Port Manager
  const portManager = new PortManager(capacitorStorageAdapter, logger);
  container.registerInstance("portManager", portManager);

  // Phase 8 - Device Manager
  const deviceManager = new DeviceManager(capacitorStorageAdapter);
  container.registerInstance("deviceManager", deviceManager);

  // Phase 8 - Hardware Manager
  const hardwareManager = new HardwareManager(
    portManager,
    deviceManager,
    capacitorUsbAdapter,
    capacitorStorageAdapter,
    logger,
  );
  container.registerInstance("hardwareManager", hardwareManager);

  // Phase 8 - Compatibility Service
  const compatibilityService = new CompatibilityService();
  container.registerInstance("compatibilityService", compatibilityService);

  // Phase 9A - Upload Framework
  const uploadEngineRegistry = new UploadEngineRegistry();
  const uploadManager = new UploadManager(uploadEngineRegistry, logger);
  container.registerInstance("uploadEngineRegistry", uploadEngineRegistry);
  container.registerInstance("uploadManager", uploadManager);

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
