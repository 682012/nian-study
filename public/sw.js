// 念安 V10 service worker。带 hash 的 /assets 资源 cache-first；
// 页面 network-first 回退缓存；不缓存 /api；安装时清理全部旧 nian-* 缓存。
const STATIC_CACHE = 'nian-v10-static-v1';
const PAGE_CACHE = 'nian-v10-pages-v1';
const CORE = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg'];
const WARM = [
  '/icons/app-icon-192.png', '/icons/app-icon-512.png', '/icons/app-icon-maskable-512.png',
  '/assets/nian-song/welcome.webp', '/assets/nian-song/idle.webp', '/assets/nian-song/teaching.webp',
  '/assets/nian-song/thinking.webp', '/assets/nian-song/correct.webp', '/assets/nian-song/break.webp',
  '/assets/nian-song/celebrate.webp', '/assets/nian-song/tease.webp', '/assets/nian-song/invite.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(async (cache) => {
        await cache.addAll(CORE.map((u) => new Request(u, { cache: 'reload' })));
        await Promise.allSettled(WARM.map((u) => cache.add(new Request(u, { cache: 'reload' }))));
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE && k !== PAGE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/downloads/')) return;

  // 页面：网络优先，离线回退
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(PAGE_CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match('/index.html'))),
    );
    return;
  }

  // 带 hash 的构建产物 / 立绘 / 图标：缓存优先
  if (/^\/assets\//.test(url.pathname) || /\.(?:webp|png|svg|woff2)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(STATIC_CACHE).then((c) => c.put(req, copy)); }
        return res;
      })),
    );
    return;
  }

  // 其他静态（manifest 等）：stale while revalidate
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(STATIC_CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || network;
    }),
  );
});
