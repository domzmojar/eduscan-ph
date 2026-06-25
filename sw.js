// EduScan PH — Service Worker v6
// Caches the app shell first, then best-effort CDN assets for offline use.
const CACHE_NAME = 'eduscan-ph-v6';

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192-any.png',
  '/icon-192-maskable.png',
  '/icon-512-any.png',
  '/icon-512-maskable.png'
];

const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        await cache.addAll(APP_SHELL);
        await Promise.allSettled(CDN_ASSETS.map(url => cache.add(url)));
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate';
  const isAppOrigin = url.origin === self.location.origin;
  const isCdnAsset = url.hostname === 'cdn.jsdelivr.net';

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && (isAppOrigin || isCdnAsset)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (isNavigation) return caches.match('/index.html');
        return new Response('', { status: 404, statusText: 'Not Found' });
      })
  );
});
