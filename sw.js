const STATIC_CACHE = 'tolimoli-static-v6';
const DYNAMIC_CACHE = 'tolimoli-dynamic-v6';

const STATIC_ASSETS = [
  '/manifest.json',
  '/logo.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== STATIC_CACHE && k !== DYNAMIC_CACHE) {
            return caches.delete(k);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const requestUrl = new URL(e.request.url);

  // API requests များကို Cache မလုပ်ဘဲ တိုက်ရိုက်သွားစေရန်
  if (requestUrl.pathname.startsWith('/api/')) {
    return;
  }

  // HTML စာမျက်နှာ (index.html / root) ကို အမြဲ နောက်ဆုံးဗားရှင်း (Network-First) ယူရန်
  if (e.request.mode === 'navigate' || requestUrl.pathname === '/' || requestUrl.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          const copy = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(e.request, copy));
          return networkResponse;
        })
        .catch(() => caches.match(e.request).then((res) => res || caches.match('/')))
    );
    return;
  }

  // Cache Fonts and Font Awesome CDN dynamically
  if (
    requestUrl.origin.includes('fonts.googleapis.com') ||
    requestUrl.origin.includes('fonts.gstatic.com') ||
    requestUrl.origin.includes('cdnjs.cloudflare.com')
  ) {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(e.request).then((networkResponse) => {
          return caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(() => caches.match(e.request));
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request).catch(() => caches.match('/'));
    })
  );
});