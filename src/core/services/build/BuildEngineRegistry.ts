import type { BuildEngine } from "../../types/build/engine";

export class BuildEngineRegistry {
  private engines: BuildEngine[] = [];

  register(engine: BuildEngine): void {
    const existing = this.engines.findIndex((e) => e.id === engine.id);
    if (existing >= 0) {
      this.engines[existing] = engine;
    } else {
      this.engines.push(engine);
    }
  }

  registerMany(engines: BuildEngine[]): void {
    for (const engine of engines) {
      this.register(engine);
    }
  }

  findForBoard(boardId: string): BuildEngine | undefined {
    return this.findForBoardAndFramework(boardId);
  }

  findForBoardAndFramework(boardId: string, framework?: string): BuildEngine | undefined {
    const matching = this.engines.filter((e) => {
      if (!e.supports(boardId, framework ?? "")) return false;
      if (framework && !e.supportedFrameworks.includes(framework)) return false;
      return true;
    });
    if (matching.length === 0) return undefined;
    matching.sort((a, b) => {
      const pa = this.getPriority(a.id);
      const pb = this.getPriority(b.id);
      return pb - pa;
    });
    return matching[0];
  }

  findAllForBoard(boardId: string): BuildEngine[] {
    return this.engines
      .filter((e) => e.supports(boardId, ""))
      .sort((a, b) => this.getPriority(b.id) - this.getPriority(a.id));
  }

  getById(engineId: string): BuildEngine | undefined {
    return this.engines.find((e) => e.id === engineId);
  }

  getAll(): ReadonlyArray<BuildEngine> {
    return this.engines;
  }

  remove(engineId: string): void {
    this.engines = this.engines.filter((e) => e.id !== engineId);
  }

  clear(): void {
    this.engines = [];
  }

  count(): number {
    return this.engines.length;
  }

  private getPriority(engineId: string): number {
    if (engineId.startsWith("arduino-cli")) return 100;
    if (engineId.startsWith("platformio")) return 80;
    if (engineId.startsWith("esp-idf")) return 70;
    if (engineId.startsWith("cloud")) return 60;
    if (engineId.startsWith("custom")) return 50;
    return 0;
  }
}
