const STATIC_CACHE = 'nian-static-cf-v8.3-ai-voice';
const PAGE_CACHE = 'nian-pages-cf-v8.3-ai-voice';
const CORE = [
  '/', '/index.html', '/offline.html', '/manifest.webmanifest', '/favicon.svg',
  '/icons/app-icon-192.png', '/icons/app-icon-512.png', '/icons/app-icon-maskable-512.png',
  '/assets/index-B65g4y4e.css', '/assets/index-Dm1zMWhb.js', '/assets/framework-CXnKph_e.js',
  '/assets/layout-segment-context-B6a3SPWX.js', '/assets/rolldown-runtime-S-ySWqyJ.js',
  '/assets/NianStudyApp-YImpRfNC.js', '/assets/nian-lively-v2.css',
  '/assets/nian-lively-v2.js', '/assets/nian-voice-v1.js', '/assets/nian-arcade-v3.css',
  '/assets/nian-arcade-v3.js', '/assets/nian-content-v8.js',
  '/assets/nian-companion-v1.css', '/assets/nian-companion-v1.js',
  '/assets/nian-song/welcome.webp',
  '/assets/nian-song/idle.webp', '/assets/nian-song/teaching.webp',
  '/assets/nian-song/thinking.webp', '/assets/nian-song/correct.webp',
  '/assets/nian-song/break.webp', '/assets/nian-song/celebrate.webp',
  '/assets/nian-song/tease.webp', '/assets/nian-song/invite.webp'
];
const REQUIRED = CORE.filter(url => !url.startsWith('/assets/nian-song/'));
const WARM_IMAGES = CORE.filter(url => url.startsWith('/assets/nian-song/'));
function hasExpectedCodeType(response, pathname) {
  if (!response.ok) return false;
  const type = response.headers.get('content-type') || '';
  if (pathname.endsWith('.js')) return /(?:java|ecma)script/i.test(type);
  if (pathname.endsWith('.css')) return /text\/css/i.test(type);
  return /(?:manifest\+json|application\/json)/i.test(type);
}
self.addEventListener('install', event => {
  const freshCore = REQUIRED.map(url => new Request(url, { cache: 'reload' }));
  event.waitUntil(caches.open(STATIC_CACHE)
    .then(async cache => {
      await cache.addAll(freshCore);
      await Promise.allSettled(WARM_IMAGES.map(url => cache.add(new Request(url, { cache: 'reload' }))));
    })
    .then(() => self.skipWaiting()));
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
    const network = fetch(req);
    event.waitUntil(network.then(res => res.ok
      ? caches.open(PAGE_CACHE).then(cache => cache.put(req, res.clone()))
      : undefined).catch(() => {}));
    event.respondWith(network.catch(async () => (await caches.match(req)) || (await caches.match('/index.html')) || caches.match('/offline.html')));
    return;
  }
  if (/\.(?:js|css|webmanifest)$/.test(url.pathname)) {
    const freshRequest = new Request(req, { cache: 'no-cache' });
    const network = fetch(freshRequest).then(response => {
      if (!hasExpectedCodeType(response, url.pathname)) throw new TypeError('Unexpected code asset content type');
      return response;
    });
    event.waitUntil(network.then(res => res.ok
      ? caches.open(STATIC_CACHE).then(cache => cache.put(req, res.clone()))
      : undefined).catch(() => {}));
    event.respondWith(network.catch(async () => (await caches.match(req)) || Response.error()));
    return;
  }
  if (/\.(?:png|webp|svg)$/.test(url.pathname)) {
    const responseState = caches.match(req).then(async hit => {
      if (hit) return { response: hit, cacheCopy: null };
      const response = await fetch(req);
      return { response, cacheCopy: response.ok ? response.clone() : null };
    });
    event.waitUntil(responseState.then(({ cacheCopy }) => cacheCopy
      ? caches.open(STATIC_CACHE).then(cache => cache.put(req, cacheCopy))
      : undefined).catch(() => {}));
    event.respondWith(responseState.then(({ response }) => response));
  }
});
