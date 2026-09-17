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

/**
 * High-fidelity, synthetic dual-tone bell chime using Web Audio API.
 * Zero external audio file dependency, zero latency, 100% reliable across browsers.
 */
export const playNotificationChime = (): void => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // Harmonic bell chime: First note (D5 ~ 587.33Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.28);

    // Second harmonious chime: (A5 ~ 880Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.09);
    gain2.gain.setValueAtTime(0.06, now + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.09);
    osc2.stop(now + 0.45);
  } catch {
    // Graceful fallback if user has not interacted with DOM yet
  }
};

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
      tag: payload.tag || `notif-${Date.now()}`,
      data: {
        url: payload.url || '/',
      },
    };

    if (reg && reg.showNotification) {
      await reg.showNotification(payload.title, options);
      return true;
    }

    // Fallback to standard Notification constructor
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
