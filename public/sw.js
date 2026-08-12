const STATIC_CACHE = 'nian-static-cf-v1';
const PAGE_CACHE = 'nian-pages-cf-v1';
const CORE = [
  '/', '/index.html', '/offline.html', '/manifest.webmanifest', '/favicon.svg',
  '/icons/app-icon-192.png', '/icons/app-icon-512.png', '/icons/app-icon-maskable-512.png',
  '/assets/index-B65g4y4e.css', '/assets/index-Dm1zMWhb.js', '/assets/framework-CXnKph_e.js',
  '/assets/layout-segment-context-B6a3SPWX.js', '/assets/rolldown-runtime-S-ySWqyJ.js',
  '/assets/NianStudyApp-YImpRfNC.js', '/assets/nian-song/welcome.webp'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => ![STATIC_CACHE,PAGE_CACHE].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/downloads/')) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(PAGE_CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(async () => (await caches.match(req)) || (await caches.match('/index.html')) || caches.match('/offline.html')));
    return;
  }
  if (/\.(?:js|css|png|webp|svg|webmanifest)$/.test(url.pathname)) {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) caches.open(STATIC_CACHE).then(c => c.put(req, res.clone()));
      return res;
    })));
  }
});
