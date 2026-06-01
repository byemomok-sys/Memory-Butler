const CACHE_NAME = 'memory-butler-v4'; // 무조건 구형 캐시를 밀어내기 위해 상향 조정
const urlsToCache = ['./index.html', './style.css', './app.js', './manifest.json', './icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((response) => response || fetch(event.request)));
});