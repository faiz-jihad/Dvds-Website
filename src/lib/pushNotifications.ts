/**
 * Service Worker & Native Push Notification Manager
 */

let swRegistration: ServiceWorkerRegistration | null = null;

export const isPushSupported = (): boolean => {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isPushSupported()) return null;

  try {
    if (swRegistration) return swRegistration;

    const reg = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    swRegistration = reg;
    console.log('[ServiceWorker] Registered with scope:', reg.scope);
    return reg;
  } catch (error) {
    console.warn('[ServiceWorker] Registration failed:', error);
    return null;
  }
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isPushSupported()) return 'denied';

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerServiceWorker();
    }
    return permission;
  } catch (error) {
    console.error('[Notification] Permission request error:', error);
    return 'denied';
  }
};

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
}

export const triggerNativeNotification = async (payload: PushNotificationPayload): Promise<boolean> => {
  if (!isPushSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const reg = await registerServiceWorker();

    const options: NotificationOptions & { data?: { url?: string } } = {
      body: payload.body,
      icon: payload.icon || '/brand/logo.png',
      badge: payload.badge || '/favicon.svg',
      tag: payload.tag || 'az-rayan',
      data: {
        url: payload.url || '/',
      },
    };

    if (reg && reg.showNotification) {
      await reg.showNotification(payload.title, options);
      return true;
    }

    // Fallback to standard Notification constructor if registration is unavailable
    const notif = new Notification(payload.title, options);
    notif.onclick = () => {
      window.focus();
      if (payload.url) {
        window.location.href = payload.url;
      }
    };
    return true;
  } catch (error) {
    console.warn('[Notification] Failed to trigger notification:', error);
    return false;
  }
};
