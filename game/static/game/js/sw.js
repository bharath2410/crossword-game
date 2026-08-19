const CACHE_NAME = 'crossword-v1';
const ASSETS = [
  '/',
  '/static/game/css/style.css',
  '/static/game/js/game.js',
  '/static/game/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});