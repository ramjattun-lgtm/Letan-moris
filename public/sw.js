// Letan Moris service worker: offline fallback for previously viewed pages and forecasts.
// Pages: network first, fall back to cache. API: network first, fall back to the last copy
// (the app labels such data as saved/out of date). Nothing is invented offline.
const VERSION = "letan-v3";
const SHELL = ["/", "/rain", "/map", "/cyclone", "/marine", "/locations", "/about", "/lite", "/offline.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (url.pathname.startsWith("/api/") || req.mode === "navigate" || url.pathname.startsWith("/_next/static/"))) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req);
        if (hit) return hit;
        if (req.mode === "navigate") return (await caches.match("/offline.html")) || Response.error();
        return Response.error();
      }),
  );
});
