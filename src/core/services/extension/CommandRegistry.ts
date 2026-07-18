/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CommandDefinition } from "../../types/extension";

class CommandRegistryClass {
  private commands = new Map<string, CommandDefinition>();

  register(command: CommandDefinition): void {
    if (this.commands.has(command.id)) {
      console.warn(`[CommandRegistry] Command "${command.id}" already registered. Overwriting.`);
    }
    this.commands.set(command.id, command);
  }

  registerMany(commands: CommandDefinition[]): void {
    for (const cmd of commands) {
      this.register(cmd);
    }
  }

  unregister(id: string): void {
    this.commands.delete(id);
  }

  getCommand(id: string): CommandDefinition | undefined {
    return this.commands.get(id);
  }

  getAllCommands(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  getCommandsByCategory(category: string): CommandDefinition[] {
    return this.getAllCommands().filter((c) => c.category === category);
  }

  async execute(id: string, ...args: any[]): Promise<void> {
    const command = this.commands.get(id);
    if (!command) {
      console.warn(`[CommandRegistry] Command "${id}" not found`);
      return;
    }
    await command.execute(...args);
  }

  hasCommand(id: string): boolean {
    return this.commands.has(id);
  }

  clear(): void {
    this.commands.clear();
  }
}

export const CommandRegistry = new CommandRegistryClass();
