// Service Worker for PWA (network-first in development for immediate live preview updates)
const CACHE_NAME = 'weathernow-v4';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass API proxy requests, legal pages, and non-GET requests.
  // Privacy Policy and Terms of Service must always go directly to the server
  // instead of ever falling back to the cached WeatherNow dashboard.
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname === '/privacy' ||
    url.pathname === '/terms'
  ) {
    return;
  }

  // Network first strategy to prevent stale dev preview bundles
  event.respondWith(
    fetch(event.request).then((response) => {
      return response;
    }).catch(() => {
      return caches.match(event.request).then((cached) => {
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Network error', { status: 408 });
      });
    })
  );
});

// Single Window / Focus Existing Window Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
