const CACHE_NAME = 'zynqo-v1';

self.addEventListener('install', (event) => {
  console.log('Zynqo Service Worker: Installed');
});

self.addEventListener('activate', (event) => {
  console.log('Zynqo Service Worker: Activated');
});

self.addEventListener('fetch', (event) => {
  // Required for PWA installability.
  // This is a "Network First" approach for a social app.
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});