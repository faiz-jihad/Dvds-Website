import { create } from 'zustand';
import {
  getNotificationPermission,
  requestNotificationPermission,
  triggerNativeNotification,
  playNotificationChime,
} from '../lib/pushNotifications';
import { useUiStore } from './useUiStore';

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

export interface NotificationDispatchOptions {
  sendNativePush?: boolean;
  playAudio?: boolean;
  showToast?: boolean;
}

interface NotificationState {
  notifications: AppNotification[];
  permission: NotificationPermission;

  addNotification: (
    item: Omit<AppNotification, 'id' | 'read' | 'createdAt'>,
    options?: boolean | NotificationDispatchOptions
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: (target: NotificationRole) => void;
  clearNotification: (id: string) => void;
  clearAll: (target: NotificationRole) => void;
  updatePermission: () => void;
  requestPermission: () => Promise<NotificationPermission>;
  sendTestNotification: (target: NotificationRole) => void;
}

const STORAGE_KEY = 'az_rayan_notifications_v1';
const BROADCAST_CHANNEL = 'az_rayan_notifications_sync_v1';

const getInitialNotifications = (): AppNotification[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
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
          title: 'Welcome to DVDs Zone',
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

// Cross-tab broadcast channel for instantaneous multi-tab sync
const notifChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel(BROADCAST_CHANNEL)
    : null;

export const useNotificationStore = create<NotificationState>((set, get) => {
  // Listen to incoming notifications from other tabs
  if (notifChannel) {
    notifChannel.onmessage = (event) => {
      const data = event.data;
      if (data?.type === 'ADD' && data?.notification) {
        set((state) => {
          if (state.notifications.some((n) => n.id === data.notification.id)) return state;
          const updated = [data.notification, ...state.notifications];
          return { notifications: updated };
        });
      } else if (data?.type === 'SYNC') {
        const fresh = getInitialNotifications();
        set({ notifications: fresh });
      }
    };
  }

  return {
    notifications: getInitialNotifications(),
    permission: getNotificationPermission(),

    addNotification: (item, options = true) => {
      const opts: NotificationDispatchOptions =
        typeof options === 'boolean'
          ? { sendNativePush: options, playAudio: true, showToast: true }
          : { sendNativePush: true, playAudio: true, showToast: true, ...options };

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

      // Broadcast to other open tabs
      if (notifChannel) {
        try {
          notifChannel.postMessage({ type: 'ADD', notification: newNotif });
        } catch {
          // Ignore broadcast errors
        }
      }

      // 1. Play auditory chime
      if (opts.playAudio) {
        playNotificationChime();
      }

      // 2. Dispatch in-app Toast for immediate visible feedback
      if (opts.showToast) {
        const toastType =
          item.type === 'order'
            ? 'success'
            : item.type === 'stock'
            ? 'error'
            : 'info';
        useUiStore.getState().addToast(`${item.title} — ${item.message}`, toastType);
      }

      // 3. Dispatch Native OS / Browser Push Notification
      if (opts.sendNativePush) {
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
      if (notifChannel) notifChannel.postMessage({ type: 'SYNC' });
    },

    markAllAsRead: (target: NotificationRole) => {
      set((state) => {
        const updated = state.notifications.map((n) =>
          n.target === target ? { ...n, read: true } : n
        );
        saveNotifications(updated);
        return { notifications: updated };
      });
      if (notifChannel) notifChannel.postMessage({ type: 'SYNC' });
    },

    clearNotification: (id: string) => {
      set((state) => {
        const updated = state.notifications.filter((n) => n.id !== id);
        saveNotifications(updated);
        return { notifications: updated };
      });
      if (notifChannel) notifChannel.postMessage({ type: 'SYNC' });
    },

    clearAll: (target: NotificationRole) => {
      set((state) => {
        const updated = state.notifications.filter((n) => n.target !== target);
        saveNotifications(updated);
        return { notifications: updated };
      });
      if (notifChannel) notifChannel.postMessage({ type: 'SYNC' });
    },

    updatePermission: () => {
      set({ permission: getNotificationPermission() });
    },

    requestPermission: async () => {
      const res = await requestNotificationPermission();
      set({ permission: res });
      return res;
    },

    sendTestNotification: (target: NotificationRole) => {
      if (target === 'admin') {
        get().addNotification({
          target: 'admin',
          type: 'order',
          title: 'Test Live Notification',
          message: 'Order dispatch alerts, audio chime, and push notifications are operational.',
          link: '/admin',
        });
      } else {
        get().addNotification({
          target: 'customer',
          type: 'order',
          title: 'Test Order Alert',
          message: 'Your customer order tracking and store updates are active.',
          link: '/account/orders',
        });
      }
    },
  };
});
