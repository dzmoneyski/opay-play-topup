/// <reference lib="WebWorker" />
// ESM Service Worker using Workbox InjectManifest

export {};

declare const self: ServiceWorkerGlobalScope & typeof globalThis & {
  __WB_MANIFEST: any;
};

import { precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// Take control as soon as it's installed
self.skipWaiting();
clientsClaim();

// Precache manifest will be injected at build time
precacheAndRoute(self.__WB_MANIFEST as any);

// Push notifications
self.addEventListener('push', (event: PushEvent) => {
  const options: NotificationOptions = {
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    dir: 'rtl',
    lang: 'ar',
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || 'لديك إشعار جديد من OpaY';
      options.data = data.data || {};
      event.waitUntil(
        self.registration.showNotification(data.title || 'OpaY', options)
      );
    } catch (_) {
      event.waitUntil(
        self.registration.showNotification('OpaY', {
          ...options,
          body: event.data?.text() || 'إشعار جديد',
        })
      );
    }
  } else {
    event.waitUntil(
      self.registration.showNotification('OpaY', {
        ...options,
        body: 'لديك إشعار جديد',
      })
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if ('focus' in client) return (client as WindowClient).focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })()
  );
});

// Background sync (placeholder)
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil((async () => {
      // TODO: sync pending transactions from IndexedDB
      // This is a placeholder for future offline capabilities
      return Promise.resolve();
    })());
  }
});
