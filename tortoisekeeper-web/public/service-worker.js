const CACHE_NAME = 'tortoisekeeper-cache-v1';
const API_CACHE = 'tortoise-api-cache';
// On installe le SW et on met en cache les fichiers essentiels
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // API requests (weights, photos)
  if (url.pathname.startsWith('/api/weights') || url.pathname.startsWith('/api/photos')) {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          const copy = resp.clone();
          // Cache only GET requests
          if (event.request.method === 'GET') {
            caches.open(API_CACHE).then(cache => cache.put(event.request, copy));
          }
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  // Images (galerie)
  if (event.request.destination === 'image') {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          const copy = resp.clone();
          // Cache only GET requests
          if (event.request.method === 'GET') {
            caches.open(API_CACHE).then(cache => cache.put(event.request, copy));
          }
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  // Fallback to cache for other requests
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
