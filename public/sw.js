const CACHE_NAME = 'zynqo-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Required fetch handler for PWA installability
  // We prefer network-first or bypass for this social app to ensure real-time data
  return;
});
