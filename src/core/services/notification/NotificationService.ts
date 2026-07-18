import { EventBus } from "../extension/EventBus";

export type NotificationType = "success" | "info" | "warning" | "error" | "loading";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  progress?: number;
  dismissible?: boolean;
  timestamp: number;
}

export const NOTIFICATION_ADDED = "notification:added";
export const NOTIFICATION_REMOVED = "notification:removed";
export const NOTIFICATION_UPDATED = "notification:updated";
export const NOTIFICATIONS_CLEARED = "notification:cleared";

let nextId = 0;

export class NotificationService {
  private queue: Notification[] = [];
  private maxVisible = 5;

  getQueue(): ReadonlyArray<Notification> {
    return this.queue;
  }

  setMaxVisible(max: number): void {
    this.maxVisible = max;
  }

  success(title: string, message?: string, duration = 4000): string {
    return this.add({ type: "success", title, message, duration, dismissible: true });
  }

  info(title: string, message?: string, duration = 4000): string {
    return this.add({ type: "info", title, message, duration, dismissible: true });
  }

  warning(title: string, message?: string, duration = 6000): string {
    return this.add({ type: "warning", title, message, duration, dismissible: true });
  }

  error(title: string, message?: string, duration = 8000): string {
    return this.add({ type: "error", title, message, duration, dismissible: true });
  }

  loading(title: string, message?: string): string {
    return this.add({ type: "loading", title, message, duration: 0, dismissible: false });
  }

  updateProgress(id: string, progress: number): void {
    const idx = this.queue.findIndex((n) => n.id === id);
    if (idx === -1) return;

    this.queue[idx] = { ...this.queue[idx], progress };
    EventBus.emit(NOTIFICATION_UPDATED, { notification: this.queue[idx] });
  }

  dismiss(id: string): void {
    this.queue = this.queue.filter((n) => n.id !== id);
    EventBus.emit(NOTIFICATION_REMOVED, { id });
  }

  clear(): void {
    this.queue = [];
    EventBus.emit(NOTIFICATIONS_CLEARED);
  }

  private add(opts: { type: NotificationType; title: string; message?: string; duration?: number; dismissible?: boolean }): string {
    const id = `notif-${++nextId}`;
    const notification: Notification = { id, ...opts, timestamp: Date.now() };
    this.queue = [...this.queue, notification];

    if (this.queue.length > this.maxVisible) {
      const removed = this.queue.shift()!;
      if (removed.id !== id) {
        EventBus.emit(NOTIFICATION_REMOVED, { id: removed.id });
      }
    }

    EventBus.emit(NOTIFICATION_ADDED, { notification });

    if (opts.duration && opts.duration > 0) {
      setTimeout(() => this.dismiss(id), opts.duration);
    }

    return id;
  }
}
