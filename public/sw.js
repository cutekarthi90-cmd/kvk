// Service Worker for KVK THANIYA MANDI
const CACHE_NAME = 'kvk-billing-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let network requests pass through, fallback to cache if offline
  if (event.request.method !== 'GET' || event.request.url.includes('/api') || event.request.url.includes('ws:')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
