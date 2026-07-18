import type { ExtensionComponentDefinition } from "../../types/extension";

class ComponentRegistryClass {
  private components = new Map<string, ExtensionComponentDefinition>();

  register(component: ExtensionComponentDefinition): void {
    this.components.set(component.id, component);
  }

  registerMany(components: ExtensionComponentDefinition[]): void {
    for (const comp of components) {
      this.components.set(comp.id, comp);
    }
  }

  unregister(id: string): void {
    this.components.delete(id);
  }

  getComponent(id: string): ExtensionComponentDefinition | undefined {
    return this.components.get(id);
  }

  getAllComponents(): ExtensionComponentDefinition[] {
    return Array.from(this.components.values());
  }

  getComponentsByCategory(category: string): ExtensionComponentDefinition[] {
    return this.getAllComponents().filter((c) => c.category === category);
  }

  getComponentsForBoard(boardId: string): ExtensionComponentDefinition[] {
    return this.getAllComponents().filter((c) => c.supportedBoards.includes(boardId));
  }

  getCategories(): string[] {
    return [...new Set(this.getAllComponents().map((c) => c.category))];
  }

  clear(): void {
    this.components.clear();
  }
}

export const ComponentRegistry = new ComponentRegistryClass();
