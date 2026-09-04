import { Incident } from '@/types/incident';
import { IncidentNotification } from '@/types/notification';

const STORAGE_KEY = 'civicpulse_notifications_v1';

type NotificationListener = () => void;
const listeners = new Set<NotificationListener>();

let notificationsState: IncidentNotification[] = (() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (e) {
    console.error('Failed to load notifications from localStorage:', e);
  }
  return [];
})();

const persist = (notify = true) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notificationsState));
    }
  } catch (e) {
    console.error('Failed to persist notifications to localStorage:', e);
  }
  if (notify) {
    listeners.forEach((listener) => listener());
  }
};

export const notificationService = {
  /**
   * Subscribe to notification changes
   */
  subscribe(listener: NotificationListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Get all notifications sorted with newest first
   */
  getNotifications(): IncidentNotification[] {
    return [...notificationsState].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  /**
   * Get count of unread notifications
   */
  getUnreadCount(): number {
    return notificationsState.filter((n) => !n.isRead).length;
  },

  /**
   * Add a notification when an incident transitions to VERIFIED status
   */
  addVerifiedNotification(
    incident: Incident,
    actor: string = 'Command Operator',
    notes?: string
  ): IncidentNotification {
    const notification: IncidentNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      incidentId: incident.id,
      incidentCode: incident.code || incident.id,
      incidentType: incident.type,
      priority: incident.priority,
      locationDescription: incident.locationDescription,
      timestamp: new Date().toISOString(),
      isRead: false,
      actor,
      notes,
    };

    notificationsState = [notification, ...notificationsState];
    persist(true);
    return notification;
  },

  /**
   * Mark a specific notification as read
   */
  markAsRead(notificationId: string): void {
    const index = notificationsState.findIndex((n) => n.id === notificationId);
    if (index !== -1) {
      notificationsState[index] = {
        ...notificationsState[index],
        isRead: true,
      };
      persist(true);
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    notificationsState = notificationsState.map((n) => ({
      ...n,
      isRead: true,
    }));
    persist(true);
  },

  /**
   * Clear all notifications
   */
  clearNotifications(): void {
    notificationsState = [];
    persist(true);
  },

  /**
   * Reset notification store (useful for tests)
   */
  resetForTesting(): void {
    notificationsState = [];
    persist(false);
  },
};
