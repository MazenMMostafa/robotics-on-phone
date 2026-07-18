import type { UploadEngine } from "./UploadEngine";

export class UploadEngineRegistry {
  private engines: UploadEngine[] = [];

  register(engine: UploadEngine): void {
    const existing = this.engines.findIndex((e) => e.id === engine.id);
    if (existing >= 0) {
      this.engines[existing] = engine;
    } else {
      this.engines.push(engine);
    }
  }

  registerMany(engines: UploadEngine[]): void {
    for (const engine of engines) {
      this.register(engine);
    }
  }

  findForBoard(boardId: string): UploadEngine | undefined {
    const matching = this.engines.filter((e) => e.supports(boardId));
    if (matching.length === 0) return undefined;

    matching.sort((a, b) => {
      const pa = this.getPriority(a.id);
      const pb = this.getPriority(b.id);
      return pb - pa;
    });

    return matching[0];
  }

  findAllForBoard(boardId: string): UploadEngine[] {
    return this.engines
      .filter((e) => e.supports(boardId))
      .sort((a, b) => this.getPriority(b.id) - this.getPriority(a.id));
  }

  getById(engineId: string): UploadEngine | undefined {
    return this.engines.find((e) => e.id === engineId);
  }

  getAll(): ReadonlyArray<UploadEngine> {
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
    if (engineId.startsWith("arduino-avr")) return 100;
    if (engineId.startsWith("arduino-cli")) return 80;
    if (engineId.startsWith("esp32")) return 70;
    if (engineId.startsWith("esp8266")) return 60;
    if (engineId.startsWith("rp2040")) return 50;
    if (engineId.startsWith("stm32")) return 40;
    return 0;
  }
}
