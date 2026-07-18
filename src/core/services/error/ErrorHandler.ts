import { EventBus } from "../extension/EventBus";
import type { LoggerService } from "../logging/LoggerService";
import type { NotificationService } from "../notification/NotificationService";

export const ERROR_OCCURRED = "error:occurred";

export interface ErrorInfo {
  id: string;
  type: "unhandled" | "rejection" | "extension" | "compile" | "upload" | "general";
  original: unknown;
  message: string;
  stack?: string;
  timestamp: number;
  friendlyMessage: string;
}

let errorId = 0;

const FRIENDLY_MESSAGES: Record<string, string> = {
  timeout: "The operation timed out. Please try again.",
  network: "A network error occurred. Check your connection.",
  compile: "Failed to compile the code. Check your blocks.",
  upload: "Upload failed. Check the board connection.",
  usb: "USB connection lost. Please reconnect the board.",
  extension: "An extension encountered an error.",
};

export type ErrorDiagnosticHandler = (info: ErrorInfo) => void;

export class ErrorHandler {
  private logger: LoggerService;
  private notifier: NotificationService;
  private diagnosticHandlers: ErrorDiagnosticHandler[] = [];
  private installed = false;

  constructor(logger: LoggerService, notifier: NotificationService) {
    this.logger = logger;
    this.notifier = notifier;
  }

  install(): void {
    if (this.installed) return;
    this.installed = true;

    if (typeof window !== "undefined") {
      window.addEventListener("error", this.handleWindowError);
      window.addEventListener("unhandledrejection", this.handleRejection);
    }
  }

  uninstall(): void {
    if (!this.installed) return;
    this.installed = false;

    if (typeof window !== "undefined") {
      window.removeEventListener("error", this.handleWindowError);
      window.removeEventListener("unhandledrejection", this.handleRejection);
    }
  }

  handleError(error: unknown, type: ErrorInfo["type"] = "general"): ErrorInfo {
    const info = this.buildErrorInfo(error, type);

    this.logger.error("ErrorHandler", info.message, { type, stack: info.stack });

    for (const handler of this.diagnosticHandlers) {
      try {
        handler(info);
      } catch {
        // ignore handler errors
      }
    }

    EventBus.emit(ERROR_OCCURRED, info);

    if (type !== "unhandled" && type !== "rejection") {
      this.notifier.error(info.friendlyMessage);
    }

    return info;
  }

  addDiagnosticHandler(handler: ErrorDiagnosticHandler): () => void {
    this.diagnosticHandlers.push(handler);
    return () => {
      this.diagnosticHandlers = this.diagnosticHandlers.filter((h) => h !== handler);
    };
  }

  private handleWindowError = (event: ErrorEvent): void => {
    const info = this.handleError(event.error ?? event.message, "unhandled");
    this.notifier.error(info.friendlyMessage);
  };

  private handleRejection = (event: PromiseRejectionEvent): void => {
    const info = this.handleError(event.reason, "rejection");
    this.notifier.error(info.friendlyMessage);
  };

  private buildErrorInfo(error: unknown, type: ErrorInfo["type"]): ErrorInfo {
    const id = `err-${++errorId}`;
    const timestamp = Date.now();

    if (error instanceof Error) {
      const message = error.message || String(error);
      const friendlyMessage = this.getFriendlyMessage(message, type);
      return { id, type, original: error, message, stack: error.stack, timestamp, friendlyMessage };
    }

    const message = String(error);
    const friendlyMessage = this.getFriendlyMessage(message, type);
    return { id, type, original: error, message, timestamp, friendlyMessage };
  }

  private getFriendlyMessage(message: string, type: ErrorInfo["type"]): string {
    const lower = message.toLowerCase();
    for (const [key, friendly] of Object.entries(FRIENDLY_MESSAGES)) {
      if (lower.includes(key)) return friendly;
    }
    return FRIENDLY_MESSAGES[type] ?? "An unexpected error occurred.";
  }
}
