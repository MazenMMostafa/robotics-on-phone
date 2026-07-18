/* eslint-disable @typescript-eslint/no-explicit-any */

type EventHandler = (...args: any[]) => void;

class EventBusClass {
  private listeners = new Map<string, Set<EventHandler>>();
  private onceListeners = new Map<string, Set<EventHandler>>();

  on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  once(event: string, handler: EventHandler): () => void {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    this.onceListeners.get(event)!.add(handler);

    return () => {
      this.onceListeners.get(event)?.delete(handler);
    };
  }

  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler);
    this.onceListeners.get(event)?.delete(handler);
  }

  emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(...args);
      } catch (e) {
        console.error(`[EventBus] Error in handler for "${event}":`, e);
      }
    });

    this.onceListeners.get(event)?.forEach((handler) => {
      try {
        handler(...args);
      } catch (e) {
        console.error(`[EventBus] Error in once-handler for "${event}":`, e);
      }
    });
    this.onceListeners.delete(event);
  }

  removeAll(event?: string): void {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  listenerCount(event: string): number {
    const a = this.listeners.get(event)?.size ?? 0;
    const b = this.onceListeners.get(event)?.size ?? 0;
    return a + b;
  }
}

export const EventBus = new EventBusClass();
