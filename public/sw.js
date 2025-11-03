// Service Worker with Workbox manifest injection
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// This will be replaced by the build process
self.__WB_MANIFEST;

// Configure Workbox
workbox.setConfig({
  debug: false
});

// Push notification handler
self.addEventListener('push', function(event) {
  console.log('Push notification received:', event);

  const options = {
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
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
    } catch (e) {
      console.error('Error parsing push data:', e);
      event.waitUntil(
        self.registration.showNotification('OpaY', {
          ...options,
          body: event.data.text(),
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

// Notification click handler
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Background sync handler
self.addEventListener('sync', function(event) {
  console.log('Background sync:', event);
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
});

async function syncTransactions() {
  console.log('Syncing transactions...');
}
