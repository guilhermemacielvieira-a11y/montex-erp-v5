const CACHE_VERSION = 'v2-2026-02-11';
const CACHE_NAME = `montex-erp-v5-${CACHE_VERSION}`;
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate - clean ALL old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Removing old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch - Network first, cache fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API/Supabase requests (always network)
  const url = new URL(event.request.url);
  if (url.hostname.includes('supabase.co')) return;
  if (url.pathname.startsWith('/api/')) return;

  // Skip auth-related requests
  if (url.pathname.includes('auth') || url.pathname.includes('token')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses (only static assets)
        if (response.status === 200 && url.pathname.startsWith('/assets/')) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // For navigation requests, return cached index.html (SPA)
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
