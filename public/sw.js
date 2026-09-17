// DVDs Zone - Push Notification Service Worker
const SW_VERSION = 'v1.0.0';

self.addEventListener('install', (event) => {
  // Activate worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim active clients so notifications work immediately
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push from server
self.addEventListener('push', (event) => {
  let data = {
    title: 'DVDs Zone',
    body: 'You have a new update.',
    icon: '/brand/logo.png',
    badge: '/favicon.svg',
    url: '/',
  };

  if (event.data) {
    try {
      const json = event.data.json();
      data = { ...data, ...json };
    } catch {
      data.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/brand/logo.png',
    badge: data.badge || '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
    actions: data.actions || [],
    tag: data.tag || 'az-rayan-notification',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

// Handle notification click to open or focus window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle internal messages from the main React application
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    const notificationOptions = {
      icon: '/brand/logo.png',
      badge: '/favicon.svg',
      vibrate: [100, 50, 100],
      ...options,
    };
    self.registration.showNotification(title, notificationOptions);
  }
});
