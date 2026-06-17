// Zynqo Service Worker
const CACHE_NAME = 'zynqo-static-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Required fetch handler for PWA installability.
  // In this basic version, we just proxy the request to the network.
  event.respondWith(fetch(event.request));
});