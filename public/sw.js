const CACHE_NAME = 'bantay-offline-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forces the browser to activate this immediately
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests (we don't want to cache database updates)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If internet works, save a copy of the page to the cache
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => {
        // If the internet drops (or Airplane Mode is on), serve the cached copy
        return caches.match(event.request);
      })
  );
});