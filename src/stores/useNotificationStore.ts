import { create } from 'zustand';
import {
  getNotificationPermission,
  requestNotificationPermission,
  triggerNativeNotification,
} from '../lib/pushNotifications';

export type NotificationRole = 'admin' | 'customer';
export type NotificationType = 'order' | 'stock' | 'promo' | 'support' | 'system';

export interface AppNotification {
  id: string;
  target: NotificationRole;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface NotificationState {
  notifications: AppNotification[];
  permission: NotificationPermission;

  addNotification: (
    item: Omit<AppNotification, 'id' | 'read' | 'createdAt'>,
    sendNativePush?: boolean
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: (target: NotificationRole) => void;
  clearNotification: (id: string) => void;
  clearAll: (target: NotificationRole) => void;
  updatePermission: () => void;
  requestPermission: () => Promise<NotificationPermission>;
}

const STORAGE_KEY = 'az_rayan_notifications_v1';

const getInitialNotifications = (): AppNotification[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Provide clean default sample notifications to demonstrate tupoksi
      return [
        {
          id: 'init-admin-1',
          target: 'admin',
          type: 'system',
          title: 'Store Operations Active',
          message: 'Notification centre is synchronised for live orders, inventory alerts, and customer messages.',
          link: '/admin',
          read: true,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'init-customer-1',
          target: 'customer',
          type: 'promo',
          title: 'Welcome to AZ Rayan DVDs',
          message: 'Enjoy 10% off your first physical media order with voucher code RAYAN10.',
          link: '/shop',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];
    }
    return JSON.parse(raw) as AppNotification[];
  } catch {
    return [];
  }
};

const saveNotifications = (list: AppNotification[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 100)));
  } catch (err) {
    console.warn('[NotificationStore] Failed to persist notifications:', err);
  }
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: getInitialNotifications(),
  permission: getNotificationPermission(),

  addNotification: (item, sendNativePush = true) => {
    const newNotif: AppNotification = {
      ...item,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };

    set((state) => {
      const updated = [newNotif, ...state.notifications];
      saveNotifications(updated);
      return { notifications: updated };
    });

    if (sendNativePush) {
      triggerNativeNotification({
        title: item.title,
        body: item.message,
        url: item.link || '/',
        tag: `notif-${item.type}`,
      });
    }
  },

  markAsRead: (id: string) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      saveNotifications(updated);
      return { notifications: updated };
    });
  },

  markAllAsRead: (target: NotificationRole) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.target === target ? { ...n, read: true } : n
      );
      saveNotifications(updated);
      return { notifications: updated };
    });
  },

  clearNotification: (id: string) => {
    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id);
      saveNotifications(updated);
      return { notifications: updated };
    });
  },

  clearAll: (target: NotificationRole) => {
    set((state) => {
      const updated = state.notifications.filter((n) => n.target !== target);
      saveNotifications(updated);
      return { notifications: updated };
    });
  },

  updatePermission: () => {
    set({ permission: getNotificationPermission() });
  },

  requestPermission: async () => {
    const res = await requestNotificationPermission();
    set({ permission: res });
    return res;
  },
}));
