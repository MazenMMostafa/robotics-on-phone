import { EventBus } from "../extension/EventBus";
import type { LoggerService } from "../logging/LoggerService";

export type DialogType = "alert" | "confirm" | "prompt" | "progress";

export interface DialogOptions {
  type: DialogType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
  progress?: number;
  progressMax?: number;
  progressLabel?: string;
}

export interface DialogRequest {
  id: string;
  options: DialogOptions;
  resolve: (result: DialogResult) => void;
}

export type DialogResult =
  | { action: "confirm"; value?: string }
  | { action: "cancel" }
  | { action: "dismiss" };

export const DIALOG_SHOWN = "dialog:shown";
export const DIALOG_RESOLVED = "dialog:resolved";

let nextDialogId = 0;

export class DialogService {
  private current: DialogRequest | null = null;
  private logger: LoggerService;

  constructor(logger: LoggerService) {
    this.logger = logger;
  }

  getCurrent(): DialogRequest | null {
    return this.current;
  }

  alert(title: string, message: string): Promise<DialogResult> {
    return this.show({ type: "alert", title, message });
  }

  confirm(title: string, message: string, confirmText?: string, cancelText?: string): Promise<DialogResult> {
    return this.show({ type: "confirm", title, message, confirmText, cancelText });
  }

  prompt(title: string, message: string, defaultValue?: string): Promise<DialogResult> {
    return this.show({ type: "prompt", title, message, defaultValue });
  }

  progress(title: string, message: string): { promise: Promise<DialogResult>; id: string } {
    const id = `dialog-${++nextDialogId}`;
    return { id, promise: this.show({ type: "progress", title, message }, id) };
  }

  updateProgress(id: string, progress: number, label?: string): void {
    if (this.current && this.current.id === id) {
      this.current.options.progress = progress;
      if (label) this.current.options.progressLabel = label;
      EventBus.emit(DIALOG_SHOWN, { request: this.current });
    }
  }

  resolve(id: string, result: DialogResult): void {
    if (this.current && this.current.id === id) {
      this.current.resolve(result);
      EventBus.emit(DIALOG_RESOLVED, { id, result });
      this.current = null;
    }
  }

  private show(options: DialogOptions, existingId?: string): Promise<DialogResult> {
    return new Promise((resolve) => {
      const id = existingId ?? `dialog-${++nextDialogId}`;
      this.current = { id, options, resolve };
      EventBus.emit(DIALOG_SHOWN, { request: this.current });
      this.logger.debug("DialogService", `Showing dialog: ${options.type} "${options.title}"`);
    });
  }
}
