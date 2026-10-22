// Bump to drop every older cache on activation.
const CACHE_NAME = 'shaghalny-student-v3';
const APP_SHELL = ['/', '/offline.html', '/manifest.webmanifest', '/favicon.svg', '/favicon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || url.pathname.startsWith('/api')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html') || caches.match('/'))
    );
    return;
  }

  const cacheCopy = (response) => {
    if (response && response.status === 200 && response.type === 'basic') {
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
    }
    return response;
  };
  const offline = () => {
    if (request.destination === 'document') {
      return caches.match('/offline.html');
    }
    return new Response('', { status: 504, statusText: 'Offline' });
  };

  // Vite's hashed build files never change under the same URL: cache-first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => cachedResponse || fetch(request).then(cacheCopy).catch(offline))
    );
    return;
  }

  // Everything else (e.g. /companion artwork, icons) can change in place:
  // network-first so updates show up, with the cache only as an offline fallback.
  event.respondWith(
    fetch(request)
      .then(cacheCopy)
      .catch(() => caches.match(request).then((cachedResponse) => cachedResponse || offline()))
  );
});
