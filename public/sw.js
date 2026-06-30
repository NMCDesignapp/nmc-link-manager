const CACHE_NAME = 'nmc-links-v4';
const POSTER_CACHE = 'nmc-posters-v1';

// Pre-cache app shell
const urlsToCache = [
  '/',
];

// Posters change once a year → cache them aggressively on first access.
// We don't pre-cache them (too many), but once fetched they stay for a year.
const POSTER_PATTERNS = [
  /\/posters\/.*\.(webp|png)$/i,
  /\/icon\/.*\.png$/i,
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Clean up old caches
          if (cacheName !== CACHE_NAME && cacheName !== POSTER_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch strategy:
//  - Posters/icons: cache-first (yearly change), then network
//  - API: network only
//  - Everything else: network first, fallback to cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip API requests and proxy
  if (url.pathname.includes('/api/')) return;

  // Posters / icons → cache-first (immutable, yearly change)
  const isPoster = POSTER_PATTERNS.some(p => p.test(url.pathname));
  if (isPoster) {
    event.respondWith(
      caches.open(POSTER_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch (err) {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // Default: network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        if (response.status === 200) {
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
