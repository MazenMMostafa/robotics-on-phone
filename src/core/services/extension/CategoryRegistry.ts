import type { ToolboxCategoryConfig } from "../../types/extension";

class CategoryRegistryClass {
  private categories = new Map<string, ToolboxCategoryConfig>();

  register(categories: ToolboxCategoryConfig[]): void {
    for (const cat of categories) {
      const existing = this.categories.get(cat.id);
      if (existing) {
        for (const bt of cat.blockTypes) {
          if (!existing.blockTypes.includes(bt)) {
            existing.blockTypes.push(bt);
          }
        }
      } else {
        this.categories.set(cat.id, { ...cat, blockTypes: [...cat.blockTypes] });
      }
    }
  }

  getCategories(): ToolboxCategoryConfig[] {
    return Array.from(this.categories.values());
  }

  getCategory(id: string): ToolboxCategoryConfig | undefined {
    return this.categories.get(id);
  }

  clear(): void {
    this.categories.clear();
  }
}

export const CategoryRegistry = new CategoryRegistryClass();
