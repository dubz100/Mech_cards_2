/* =====================================================================
   Equation Deck — service worker
   Offline-first: precache the app shell, then runtime-cache everything
   else (KaTeX font files, Google webfonts) the first time it's fetched.
   Load the app once on wifi and it works fully offline thereafter.
   Bump CACHE_VERSION whenever you change the app to force an update.
   ===================================================================== */
const CACHE_VERSION = 'eqn-deck-v3';

// App shell — same-origin files plus the two big CDN assets.
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js',
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Space+Mono:wght@400;700&display=swap'
];

// Precache on install. allSettled so one missing asset can't abort the install.
// Use normal (CORS) requests for the CDN assets — cdnjs and Google Fonts both
// send Access-Control-Allow-Origin, so we get full, executable responses rather
// than opaque ones (opaque cross-origin scripts don't run reliably in the iOS
// standalone web view, which showed equations as raw LaTeX).
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await Promise.allSettled(CORE.map((url) => cache.add(url)));
    self.skipWaiting();
  })());
});

// Drop old caches on activate.
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Cache-first, fall back to network, and stash successful GETs for next time.
// This is what pulls the KaTeX font files and webfont woff2s into the cache.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      const copy = res.clone();
      caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    } catch (err) {
      // Offline and not cached — for a navigation, serve the app shell.
      if (req.mode === 'navigate') {
        return (await caches.match('./index.html')) || (await caches.match('./'));
      }
      throw err;
    }
  })());
});
