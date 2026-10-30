/**
 * Service Worker & Native Push Notification Manager
 * Engineered for 100% reliability on mobile devices (Android & iOS) and desktop browsers.
 */

let swRegistration: ServiceWorkerRegistration | null = null;

export const isPushSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    if (swRegistration && swRegistration.active) return swRegistration;

    const reg = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    swRegistration = reg;

    if (navigator.serviceWorker.ready) {
      try {
        await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      } catch {}
    }

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
    // Hardware vibration confirmation
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch {}
    }

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
 * Mobile-friendly audio unlock listener
 * Unlocks Web Audio API on first touch/tap on smartphone
 */
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => ctx.close()).catch(() => {});
        } else {
          ctx.close().catch(() => {});
        }
      }
    } catch {}
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { once: true, passive: true });
  window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
}

/**
 * High-fidelity, synthetic dual-tone bell chime using Web Audio API.
 * Zero external audio file dependency, zero latency, 100% reliable across browsers.
 */
let lastChimeTimestamp = 0;

export const playNotificationChime = (): void => {
  if (typeof window === 'undefined') return;
  const nowMs = Date.now();
  if (nowMs - lastChimeTimestamp < 1200) {
    return;
  }
  lastChimeTimestamp = nowMs;

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
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second harmonious chime: (A5 ~ 880Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.08);
    gain2.gain.setValueAtTime(0.09, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.55);
  } catch {
    // Graceful fallback if user has not interacted with DOM yet
  }
};

export const triggerNativeNotification = async (payload: PushNotificationPayload): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  // 1. Direct hardware vibration on mobile device (HP)
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([300, 100, 300, 100, 400]);
    } catch {}
  }

  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  try {
    let reg: ServiceWorkerRegistration | null = null;
    if ('serviceWorker' in navigator) {
      try {
        reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((r) => setTimeout(() => r(null), 1200)),
        ]);
      } catch {}
      if (!reg) {
        reg = await registerServiceWorker();
      }
    }

    const options: NotificationOptions & Record<string, any> = {
      body: payload.body,
      icon: payload.icon || '/favicon-192.png',
      badge: payload.badge || '/favicon.svg',
      tag: payload.tag || `dvds-alert-${Date.now()}`,
      vibrate: [300, 100, 300, 100, 400],
      requireInteraction: true,
      renotify: true,
      data: {
        url: payload.url || '/admin/orders',
      },
    };

    if (reg && reg.showNotification) {
      await reg.showNotification(payload.title, options);
      return true;
    }

    // Message fallback via controller if available
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title: payload.title,
        options,
      });
      return true;
    }

    // Fallback only if Notification constructor is supported (Desktop)
    try {
      const notif = new Notification(payload.title, options);
      notif.onclick = () => {
        window.focus();
        if (payload.url) {
          window.location.href = payload.url;
        }
      };
      return true;
    } catch {
      // Android throws Illegal Constructor when using new Notification(), handled gracefully
    }

    return false;
  } catch (error) {
    console.warn('[Notification] Failed to trigger notification:', error);
    return false;
  }
};
