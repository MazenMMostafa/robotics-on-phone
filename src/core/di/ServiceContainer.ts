/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ServiceDefinition<T> {
  name: string;
  factory: () => T;
  singleton?: boolean;
  dependencies?: string[];
}

export class ServiceContainer {
  private instances = new Map<string, any>();
  private definitions = new Map<string, ServiceDefinition<any>>();
  private resolving = new Set<string>();

  register<T>(def: ServiceDefinition<T>): void {
    this.definitions.set(def.name, def);
  }

  resolve<T>(name: string): T {
    const existing = this.instances.get(name);
    if (existing !== undefined) return existing as T;

    const def = this.definitions.get(name);
    if (!def) {
      throw new Error(`Service "${name}" is not registered`);
    }

    if (this.resolving.has(name)) {
      throw new Error(`Circular dependency detected for "${name}"`);
    }
    this.resolving.add(name);

    const instance = def.factory();
    this.resolving.delete(name);

    if (def.singleton !== false) {
      this.instances.set(name, instance);
    }

    return instance as T;
  }

  resolveAll(): void {
    for (const [name] of this.definitions) {
      this.resolve(name);
    }
  }

  get<T>(name: string): T {
    const instance = this.instances.get(name);
    if (instance === undefined) {
      return this.resolve<T>(name);
    }
    return instance as T;
  }

  has(name: string): boolean {
    return this.definitions.has(name) || this.instances.has(name);
  }

  registerInstance<T>(name: string, instance: T): void {
    this.instances.set(name, instance);
  }

  reset(): void {
    this.instances.clear();
    this.resolving.clear();
  }

  getRegisteredNames(): string[] {
    const names = new Set<string>();
    for (const name of this.definitions.keys()) names.add(name);
    for (const name of this.instances.keys()) names.add(name);
    return Array.from(names);
  }
}

export const container = new ServiceContainer();
