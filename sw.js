const CACHE_NAME = 'sticks-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/print.css',
  '/js/app.js',
  '/js/router.js',
  '/js/db.js',
  '/js/ai.js',
  '/js/parser.js',
  '/js/map.js',
  '/js/modules/print.js',
  '/js/modules/template.js',
  '/js/modules/ui.js',
  '/manifest.json'
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        const fetched = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetched;
      })
  );
});