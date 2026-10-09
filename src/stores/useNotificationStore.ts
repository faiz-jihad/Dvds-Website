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

export const isNotificationTargetActive = (target: NotificationRole): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const isAdminPath = path.startsWith('/admin');

  if (target === 'admin') {
    // Only alert admin if user is in /admin routes or logged in as staff/admin
    if (isAdminPath) return true;
    try {
      const profileRaw = localStorage.getItem('az_rayan_customer_profile');
      if (profileRaw) {
        const p = JSON.parse(profileRaw);
        if (
          ['admin', 'staff'].includes(p.role) ||
          ['admin@dvdszone.co.uk', 'admin@azrayan.co.uk', 'azrayanltd@gmail.com'].includes(p.email?.toLowerCase())
        ) {
          return true;
        }
      }
    } catch {
      // Non-blocking
    }
    return false;
  }

  if (target === 'customer') {
    // Customer alerts should not popup over admin dashboard operations
    return !isAdminPath;
  }

  return true;
};

const STORAGE_KEY = 'dvds_zone_notifications_v2';
const BROADCAST_CHANNEL = 'dvds_zone_notifications_sync_v2';

const getInitialNotifications = (): AppNotification[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [
        {
          id: 'init-admin-system',
          target: 'admin',
          type: 'system',
          title: 'Store Operations Synchronised',
          message: 'Real-time order tracking, inventory monitoring, and customer messages are active.',
          link: '/admin',
          read: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'init-customer-welcome',
          target: 'customer',
          type: 'promo',
          title: 'Welcome to DVDs Zone',
          message: 'Explore our catalog of verified original DVD and Blu-ray editions.',
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 60)));
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
          const updated = [data.notification, ...state.notifications].slice(0, 60);
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

      let shouldAlert = true;

      set((state) => {
        // Deduplicate identical alerts triggered in close succession
        const isDuplicate = state.notifications.some(
          (n) =>
            n.target === item.target &&
            n.title === item.title &&
            n.message === item.message &&
            Date.now() - new Date(n.createdAt).getTime() < 4000
        );
        if (isDuplicate) {
          shouldAlert = false;
          return state;
        }

        const updated = [newNotif, ...state.notifications].slice(0, 60);
        saveNotifications(updated);
        return { notifications: updated };
      });

      if (!shouldAlert) return;

      // Broadcast to other open tabs
      if (notifChannel) {
        try {
          notifChannel.postMessage({ type: 'ADD', notification: newNotif });
        } catch {
          // Ignore broadcast errors
        }
      }

      // Check whether current context (admin vs customer) matches target
      const isTargetActive = isNotificationTargetActive(item.target);
      if (!isTargetActive) {
        // Notification is safely recorded in the history log, but audio, toasts,
        // and native push notifications will NOT leak into the mismatched role.
        return;
      }

      // 1. Play auditory chime (throttled)
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
