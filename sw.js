const CACHE_NAME = 'memory-butler-v5.2'; // 버전 상향으로 스마트폰 캐시 강제 폭파
const urlsToCache = ['./index.html', './manifest.json', './icon.png']; // 존재하지 않는 css, js 제거

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((response) => response || fetch(event.request)));
});