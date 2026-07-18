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

export function bootstrapContainer(): void {
  // Platform adapters
  container.registerInstance("storage", capacitorStorageAdapter);
  container.registerInstance("compiler", capacitorCompilerAdapter);
  container.registerInstance("file", capacitorFileAdapter);

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
