// DVDs Zone - Push Notification Service Worker
const SW_VERSION = 'v1.2.0';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push from server or external triggers
self.addEventListener('push', (event) => {
  let data = {
    title: 'DVDs Zone UK',
    body: 'You have a new update.',
    icon: '/favicon-192.png',
    badge: '/favicon.svg',
    url: '/admin/orders',
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
    icon: data.icon || '/favicon-192.png',
    badge: data.badge || '/favicon.svg',
    vibrate: [300, 100, 300, 100, 400],
    requireInteraction: true,
    renotify: true,
    tag: data.tag || `dvds-alert-${Date.now()}`,
    data: {
      url: data.url || '/admin/orders',
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'open', title: 'View Order' },
      { action: 'close', title: 'Dismiss' }
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

// Handle notification click to open or focus window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/admin/orders';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open, navigate & focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
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
      icon: '/favicon-192.png',
      badge: '/favicon.svg',
      vibrate: [300, 100, 300, 100, 400],
      requireInteraction: true,
      renotify: true,
      ...options,
    };
    self.registration.showNotification(title, notificationOptions);
  }
});
