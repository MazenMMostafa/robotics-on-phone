import type { ComponentConfig } from "../../types/componentConfig";
import { ComponentRegistry } from "../extension/ComponentRegistry";
import { ExtensionManager } from "../extension/ExtensionManager";

type ComponentModule = { default: ComponentConfig };

let componentModules: Record<string, ComponentModule> | null = null;

function getComponentModules(): Record<string, ComponentModule> {
  if (!componentModules) {
    componentModules = import.meta.glob<ComponentModule>(
      "/src/data/components/*.json",
      { eager: true },
    );
  }
  return componentModules;
}

function loadBuiltinComponents(): ComponentConfig[] {
  return Object.values(getComponentModules()).map((m) => m.default);
}

let cache: ComponentConfig[] | null = null;

function ensureCache(): ComponentConfig[] {
  if (cache) return cache;

  const builtin = loadBuiltinComponents();

  try {
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
  } catch (e) {
    console.warn("[ComponentService] Extension system not available:", e);
  }

  cache = builtin;
  return cache;
}

export const ComponentService = {
  getComponents(): ComponentConfig[] {
    return ensureCache();
  },

  getComponent(id: string): ComponentConfig | undefined {
    return ensureCache().find((c) => c.id === id);
  },

  getComponentsByCategory(category: string): ComponentConfig[] {
    return ensureCache().filter((c) => c.category === category);
  },

  getComponentsForBoard(boardId: string): ComponentConfig[] {
    return ensureCache().filter((c) => c.supportedBoards.includes(boardId));
  },

  getCategories(): string[] {
    return [...new Set(ensureCache().map((c) => c.category))];
  },
};
