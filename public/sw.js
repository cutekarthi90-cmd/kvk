// Service Worker for KVK THANIYA MANDI
// Self-destroying service worker: immediately unregisters itself and clears all caches
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => self.registration.unregister()).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests to network
  event.respondWith(fetch(event.request));
});
