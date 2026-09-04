import { notificationService } from '@/services/notificationService';
import { IncidentNotification } from '@/types/notification';
import { useCallback, useEffect, useState } from 'react';

export function useNotifications() {
  const [notifications, setNotifications] = useState<IncidentNotification[]>(() =>
    notificationService.getNotifications()
  );
  const [unreadCount, setUnreadCount] = useState<number>(() =>
    notificationService.getUnreadCount()
  );

  useEffect(() => {
    // Initial sync
    setNotifications(notificationService.getNotifications());
    setUnreadCount(notificationService.getUnreadCount());

    const unsubscribe = notificationService.subscribe(() => {
      setNotifications(notificationService.getNotifications());
      setUnreadCount(notificationService.getUnreadCount());
    });

    return unsubscribe;
  }, []);

  const markAsRead = useCallback((id: string) => {
    notificationService.markAsRead(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    notificationService.markAllAsRead();
  }, []);

  const clearAll = useCallback(() => {
    notificationService.clearNotifications();
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
}
