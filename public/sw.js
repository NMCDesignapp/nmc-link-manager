const CACHE_NAME = 'nmc-links-v27-20260828';
const POSTER_CACHE = 'nmc-posters-v1';

// Do not pre-cache HTML/app shell. Caching '/' previously allowed an old UI shell
// to reappear when the first navigation request was slow or temporarily failed.
const STATIC_CACHE_DESTINATIONS = new Set(['style', 'script', 'font', 'image']);

// Posters/icons are intentionally cache-first because they are versioned/long-lived.
const POSTER_PATTERNS = [
  /\/posters\/.*\.(webp|png)$/i,
  /\/icon\/.*\.png$/i,
];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.map((cacheName) => {
        if (cacheName !== CACHE_NAME && cacheName !== POSTER_CACHE) {
          return caches.delete(cacheName);
        }
        return Promise.resolve(false);
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // API requests must never be served from the service-worker cache.
  if (url.pathname.includes('/api/')) return;

  // Navigation/document requests are always network-only. This guarantees that
  // an outdated cached HTML shell can never replace the currently deployed UI.
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  const isPoster = POSTER_PATTERNS.some((pattern) => pattern.test(url.pathname));
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
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // Cache only static assets. Network-first keeps CSS/JS current while retaining
  // a lightweight fallback for transient connectivity loss.
  if (STATIC_CACHE_DESTINATIONS.has(event.request.destination)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || Response.error()))
    );
  }
});
