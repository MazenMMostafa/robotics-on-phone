export class GenerationContext {
  readonly variables = new Map<string, string>();
  private variableValues = new Map<string, string>();
  readonly includes = new Set<string>();
  readonly usedPins = new Set<number>();
  private _indentLevel = 0;

  get indentLevel(): number {
    return this._indentLevel;
  }

  pushIndent(): void {
    this._indentLevel++;
  }

  popIndent(): void {
    if (this._indentLevel > 0) this._indentLevel--;
  }

  get indent(): string {
    return "  ".repeat(this._indentLevel);
  }

  addVariable(name: string, type = "int"): void {
    if (!this.variables.has(name)) {
      this.variables.set(name, type);
      this.variableValues.set(name, "0");
    }
  }

  hasVariable(name: string): boolean {
    return this.variables.has(name);
  }

  setVariableValue(name: string, value: string): void {
    this.variableValues.set(name, value);
  }

  addInclude(header: string): void {
    this.includes.add(header);
  }

  addUsedPin(pin: number): void {
    this.usedPins.add(pin);
  }

  getGlobalVariables(): string {
    const lines: string[] = [];
    for (const [name, type] of this.variables) {
      const initialValue = this.variableValues.get(name) ?? "0";
      lines.push(`${type} ${name} = ${initialValue};`);
    }
    return lines.join("\n");
  }

  getIncludesCode(): string {
    const lines: string[] = [];
    for (const header of this.includes) {
      if (header.startsWith("<") || header.endsWith(">")) {
        lines.push(`#include ${header}`);
      } else {
        lines.push(`#include <${header}>`);
      }
    }
    return lines.join("\n");
  }

  reset(): void {
    this.variables.clear();
    this.variableValues.clear();
    this.includes.clear();
    this.usedPins.clear();
    this._indentLevel = 0;
  }
}
