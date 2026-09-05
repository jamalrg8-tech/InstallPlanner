// Eurolux Doors and Windows, Installation Planner — minimal offline support.
// Bump CACHE_NAME whenever the app shell files change, so old caches get cleared.
const CACHE_NAME = "install-planner-v15";
const APP_SHELL = [
  "./InstallPlanner.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for the app page itself (so a deploy update is picked up as soon as
// the device is online), falling back to the cached copy when offline.
// Cache-first for the small static assets (manifest, icons).
// Firestore's own network calls (firestore.googleapis.com etc.) are left alone —
// this worker only ever intercepts requests for this app's own files.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  const isPage = req.mode === "navigate" || req.url.endsWith(".html");
  if (isPage) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match("./InstallPlanner.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
