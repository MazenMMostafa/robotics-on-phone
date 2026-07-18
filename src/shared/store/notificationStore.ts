import { create } from "zustand";
import { container } from "../../core/di/ServiceContainer";
import type { NotificationService, Notification } from "../../core/services/notification/NotificationService";
import { NOTIFICATION_ADDED, NOTIFICATION_REMOVED, NOTIFICATIONS_CLEARED } from "../../core/services/notification/NotificationService";
import { EventBus } from "../../core/services/extension/EventBus";

interface NotificationState {
  notifications: Notification[];
}

export const useNotificationStore = create<NotificationState>(() => ({
  notifications: [],
}));

export function initNotificationStore(): void {
  const ns = container.get<NotificationService>("notificationService");
  useNotificationStore.setState({ notifications: [...ns.getQueue()] });

  EventBus.on(NOTIFICATION_ADDED, () => {
    const ns2 = container.get<NotificationService>("notificationService");
    useNotificationStore.setState({ notifications: [...ns2.getQueue()] });
  });

  EventBus.on(NOTIFICATION_REMOVED, () => {
    const ns2 = container.get<NotificationService>("notificationService");
    useNotificationStore.setState({ notifications: [...ns2.getQueue()] });
  });

  EventBus.on(NOTIFICATIONS_CLEARED, () => {
    useNotificationStore.setState({ notifications: [] });
  });
}
