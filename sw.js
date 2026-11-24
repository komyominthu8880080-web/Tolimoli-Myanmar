const STATIC_CACHE = 'tolimoli-static-v7';
const DYNAMIC_CACHE = 'tolimoli-dynamic-v7';

const STATIC_ASSETS = [
  '/manifest.json',
  '/logo.jpg'
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
  // GET request မဟုတ်လျှင် (POST, PUT, DELETE) Cache မလုပ်ဘဲ ကျော်သွားမည်
  if (e.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(e.request.url);

  // API requests နှင့် Firebase Realtime Database requests များကို Cache မလုပ်ဘဲ တိုက်ရိုက်သွားစေရန်
  if (
    requestUrl.pathname.startsWith('/api/') ||
    requestUrl.hostname.includes('firebasedatabase.app') ||
    requestUrl.hostname.includes('firebaseio.com') ||
    requestUrl.hostname.includes('firebaseapp.com')
  ) {
    return;
  }

  // HTML စာမျက်နှာ (index.html / root) ကို အမြဲ နောက်ဆုံးဗားရှင်း (Network-First) ယူရန်
  if (e.request.mode === 'navigate' || requestUrl.pathname === '/' || requestUrl.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(e.request, copy));
          }
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
          if (networkResponse && networkResponse.ok) {
            return caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(e.request, networkResponse.clone());
              return networkResponse;
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // အခြား Static Assets (ပုံများ၊ JS/CSS) — မအောင်မြင်ပါက HTML ပြန်မပေးဘဲ ပုံမှန်အတိုင်း Fail ဖြစ်စေမည်
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
