// EduScan PH — Service Worker v2
// Strategy:
//   index.html  → network-first (always gets latest app on reload)
//   icons/fonts → cache-first  (rarely change, safe to cache long-term)
//   QR images   → network-first with cache fallback

const CACHE_NAME    = 'eduscan-ph-v2';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192-any.png',
  '/icon-192-maskable.png',
  '/icon-512-any.png',
  '/icon-512-maskable.png',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'
];

// ── INSTALL: pre-cache only static assets, NOT index.html ─────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()) // activate immediately, don't wait for old SW to die
  );
});

// ── ACTIVATE: delete ALL old caches, claim all open tabs ──────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim()) // take control of all tabs immediately
  );
});

// ── FETCH ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Skip non-GET requests (sync POSTs, etc.)
  if (event.request.method !== 'GET') return;

  // ── index.html & navigation → NETWORK FIRST ──
  // Always try to get the freshest version; fall back to cache if offline
  if (
    event.request.mode === 'navigate' ||
    url.endsWith('/') ||
    url.endsWith('/index.html')
  ) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Save fresh copy to cache
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html')) // offline fallback
    );
    return;
  }

  // ── QR code images → NETWORK FIRST with cache fallback ──
  if (url.includes('api.qrserver.com')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // ── Static assets (icons, jsQR CDN) → CACHE FIRST ──
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return response;
      });
    })
  );
});

// ── MESSAGE: handle SKIP_WAITING from client ──────────────────────────────
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
