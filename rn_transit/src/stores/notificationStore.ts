import { create } from 'zustand';
import { api } from '../services/api';
import type { AppNotification } from '../types';

interface NotificationState {
  fcmToken: string | null;
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;

  setFcmToken: (token: string) => void;
  registerToken: (token: string, platform?: string) => Promise<void>;
  fetchHistory: (userId: string) => Promise<void>;
  fetchUnreadCount: (userId: string) => Promise<void>;
  markRead: (notificationId: string) => void;
  markAllRead: (userId: string) => Promise<void>;
  addPushNotification: (data: { title?: string; body?: string }) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  fcmToken: null,
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  setFcmToken: (token) => set({ fcmToken: token }),

  registerToken: async (token, platform = 'android') => {
    set({ fcmToken: token });
    // Token registration is done server-side via the API call
    await api.post('/api/notifications/register-token', {
      token,
      platform,
    });
  },

  fetchHistory: async (userId) => {
    set({ isLoading: true });
    try {
      const res = await api.get(`/api/notifications/history/${userId}`);
      if (!res.error && res.data) {
        const raw = res.data as Record<string, unknown>[];
        const notifications = raw.map((n) => ({
          id: n.id as string,
          type: n.type as string,
          title: n.title as string,
          body: n.body as string,
          data: n.data as Record<string, string> | undefined,
          read: !(n.isRead === false),
          createdAt: n.createdAt as string,
        }));
        set({
          notifications,
          unreadCount: notifications.filter((n) => !n.read).length,
        });
      }
    } catch {
      // silently fail
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async (userId) => {
    try {
      const res = await api.get(`/api/notifications/unread-count/${userId}`);
      set({ unreadCount: (res.unreadCount as number) ?? 0 });
    } catch {
      // silently fail
    }
  },

  markRead: (notificationId) => {
    api.post(`/api/notifications/mark-read/${notificationId}`);
    // Optimistic update
    const { notifications } = get();
    const idx = notifications.findIndex((n) => n.id === notificationId);
    if (idx >= 0) {
      const updated = [...notifications];
      updated[idx] = { ...updated[idx], read: true };
      set({ notifications: updated, unreadCount: updated.filter((n) => !n.read).length });
    }
  },

  markAllRead: async (userId) => {
    await api.post(`/api/notifications/mark-all-read/${userId}`);
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  addPushNotification: (data) => {
    const notification: AppNotification = {
      id: `push-${Date.now()}`,
      type: 'push',
      title: data.title ?? 'DOU Transit',
      body: data.body ?? '',
      read: false,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
}));
