const CACHE_NAME = 'nupogodi-v4';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['./index.html', './styles.css', './game.js', './icon-192.png', './icon-512.png', './manifest.json'])
    )
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request))
  );
});
