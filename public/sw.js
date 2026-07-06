// SEM Avia — service worker (kesh + oflayn). Serwist/kutubxonasiz, yengil.
// Strategiya:
//   • immutable statik assetlar (_next/static, shrift, rasm) → cache-first
//     (bir marta yuklanadi, keyin oniy — ilova tez ochiladi)
//   • sahifalar va API GET → network-first (onlaynда doim yangi ma'lumot,
//     internet yo'q bo'lsa oxirgi keshdan)
//   • faqat GET va o'z domeni keshlanadi; POST/PATCH/DELETE tegilmaydi.
// VERSION o'zgarsa — eski kesh tozalanadi (yangi deploy'da yangilash uchun).
const VERSION = 'v1';
const STATIC_CACHE = `sem-static-${VERSION}`;
const RUNTIME_CACHE = `sem-runtime-${VERSION}`;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

const STATIC_RE = /\.(?:js|css|woff2?|ttf|otf|png|svg|ico|jpg|jpeg|webp|gif)$/;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // mutatsiyalar keshlanmaydi
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // faqat o'z domeni

  if (url.pathname.startsWith('/_next/static/') || STATIC_RE.test(url.pathname)) {
    event.respondWith(cacheFirst(req));
  } else {
    event.respondWith(networkFirst(req));
  }
});

async function cacheFirst(req) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone()); // faqat 200 — 401/redirect keshlanmaydi
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const home = await cache.match('/');
      if (home) return home;
    }
    throw err;
  }
}
