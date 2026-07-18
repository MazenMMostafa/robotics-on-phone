export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

export class LoggerService {
  private currentLevel: LogLevel = "info";
  private history: LogEntry[] = [];
  private maxHistory = 500;
  private listeners: Array<(entry: LogEntry) => void> = [];

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  getLevel(): LogLevel {
    return this.currentLevel;
  }

  setMaxHistory(max: number): void {
    this.maxHistory = max;
    if (this.history.length > max) {
      this.history = this.history.slice(-max);
    }
  }

  getHistory(): ReadonlyArray<LogEntry> {
    return this.history;
  }

  clearHistory(): void {
    this.history = [];
  }

  onEntry(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  debug(module: string, message: string, data?: unknown): void {
    this.log("debug", module, message, data);
  }

  info(module: string, message: string, data?: unknown): void {
    this.log("info", module, message, data);
  }

  warn(module: string, message: string, data?: unknown): void {
    this.log("warn", module, message, data);
  }

  error(module: string, message: string, data?: unknown): void {
    this.log("error", module, message, data);
  }

  private log(level: LogLevel, module: string, message: string, data?: unknown): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.currentLevel]) return;

    const entry: LogEntry = { timestamp: Date.now(), level, module, message, data };
    this.history.push(entry);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch {
        // ignore listener errors
      }
    }
  }
}

export const logger = new LoggerService();
