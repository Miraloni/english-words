const CACHE = 'wordnaut-v31';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  // Набор ложных друзей для языка по умолчанию. Наборы других L1 подхватит
  // runtime-кэш ниже при первом обращении — заранее качать их не нужно.
  './data/false-friends-ru.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Навигация: сначала сеть (чтобы подхватывать обновления), но не ждать дольше 3 с
  if (req.mode === 'navigate') {
    e.respondWith(
      Promise.race([
        fetch(req).then(res => {
          caches.open(CACHE).then(c => c.put('./index.html', res.clone()));
          return res;
        }),
        new Promise(resolve => setTimeout(() => resolve(caches.match('./index.html')), 3000)),
      ]).catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }))
  );
});
