// Service Worker for Push Notifications
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

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If a window is already open, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', function(event) {
  console.log('Background sync:', event);
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
});

async function syncTransactions() {
  // This would sync any pending transactions when back online
  console.log('Syncing transactions...');
}
