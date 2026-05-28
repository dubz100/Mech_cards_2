/* =====================================================================
   Equation Deck — KILL-SWITCH service worker
   Offline caching is temporarily disabled while we confirm that equation
   rendering works on the live site. This worker exists only to UNDO the
   previous one: it clears all caches and unregisters itself, so any device
   that cached the earlier broken version is fully cleaned up.
   (A proper offline worker can be added back once rendering is confirmed.)
   ===================================================================== */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll();
    clients.forEach((c) => { try { c.navigate(c.url); } catch (e) {} });
  })());
});

// Pass everything straight through to the network — no caching.
self.addEventListener('fetch', () => {});
