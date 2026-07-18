import type { ComponentConfig } from "../../types/componentConfig";
import { ComponentRegistry } from "../extension/ComponentRegistry";
import { ExtensionManager } from "../extension/ExtensionManager";

type ComponentModule = { default: ComponentConfig };

const componentModules = import.meta.glob<ComponentModule>(
  "/src/data/components/*.json",
  { eager: true },
);

function loadBuiltinComponents(): ComponentConfig[] {
  return Object.values(componentModules).map((m) => m.default);
}

function buildFullList(): ComponentConfig[] {
  const builtin = loadBuiltinComponents();

  ExtensionManager.init();

  for (const ext of ComponentRegistry.getAllComponents()) {
    if (!builtin.find((c) => c.id === ext.id)) {
      builtin.push({
        id: ext.id,
        displayName: ext.displayName,
        description: ext.description,
        category: ext.category,
        supportedBoards: ext.supportedBoards,
        requiredPins: ext.requiredPins as ComponentConfig["requiredPins"],
        optionalPins: ext.optionalPins as ComponentConfig["optionalPins"],
        libraries: ext.libraries,
        generatorId: ext.id,
        blockId: "",
        icon: ext.icon || "",
        examples: [],
        validationRules: [],
      });
    }
  }

  return builtin;
}

const cache = buildFullList();

export const ComponentService = {
  getComponents(): ComponentConfig[] {
    return cache;
  },

  getComponent(id: string): ComponentConfig | undefined {
    return cache.find((c) => c.id === id);
  },

  getComponentsByCategory(category: string): ComponentConfig[] {
    return cache.filter((c) => c.category === category);
  },

  getComponentsForBoard(boardId: string): ComponentConfig[] {
    return cache.filter((c) => c.supportedBoards.includes(boardId));
  },

  getCategories(): string[] {
    return [...new Set(cache.map((c) => c.category))];
  },
};
