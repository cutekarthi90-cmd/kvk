// Service Worker for KVK THANIYA MANDI
// Always ensures users receive the latest updated window immediately!
const CACHE_NAME = 'kvk-cache-' + Date.now();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Let WebSocket and API requests go directly to network
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('/api') ||
    event.request.url.includes('ws:') ||
    event.request.url.includes('wss:')
  ) {
    return;
  }

  // HTML / Navigation requests: ALWAYS NETWORK FIRST without caching!
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Static assets: Fetch from network, fallback to cache
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});
